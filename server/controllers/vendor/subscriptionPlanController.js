import mongoose from "mongoose";
import SubscriptionPlan, { serializePlan } from "../../models/SubscriptionPlan.js";
import RestaurantSubscription from "../../models/RestaurantSubscription.js";
import Order from "../../models/Order.js";
import {
  getActivePlans,
  getSubscriptionState,
  COMMISSIONABLE_ORDER_STATUSES,
} from "../../services/subscriptionService.js";
import { assignPlanToRestaurant } from "../../services/subscriptionAdminService.js";
import { buildVendorPlanPayload } from "../../services/vendorPlanService.js";
import { getVendorRestaurant } from "./shared.js";

const handleError = (res, error, fallback) =>
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallback,
  });

/**
 * Resolves the caller's own restaurant.
 *
 * Vendors are always scoped to the restaurant they own — the restaurant id is
 * never taken from the request body for a vendor, so one vendor cannot read or
 * change another's subscription.
 */
const requireOwnRestaurant = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);
  if (!restaurant) {
    res.status(404).json({ success: false, message: "Restaurant not found" });
    return null;
  }
  return restaurant;
};

export const getMySubscription = async (req, res) => {
  try {
    const restaurant = await requireOwnRestaurant(req, res);
    if (!restaurant) return;

    const payload = await buildVendorPlanPayload(restaurant);
    res.json({ success: true, data: payload });
  } catch (error) {
    handleError(res, error, "Unable to load your subscription");
  }
};

export const getAvailablePlans = async (req, res) => {
  try {
    const restaurant = await requireOwnRestaurant(req, res);
    if (!restaurant) return;

    const [plans, state] = await Promise.all([
      getActivePlans(),
      getSubscriptionState(restaurant),
    ]);

    const currentPlanId = String(state?.plan?._id || "");
    const currentPrice = state?.plan?.price || 0;

    res.json({
      success: true,
      data: plans.map((plan) => ({
        ...serializePlan(plan),
        isCurrent: String(plan._id) === currentPlanId,
        // Drives the Upgrade / Downgrade label on each card.
        changeType:
          String(plan._id) === currentPlanId
            ? "CURRENT"
            : plan.price > currentPrice
            ? "UPGRADE"
            : "DOWNGRADE",
      })),
    });
  } catch (error) {
    handleError(res, error, "Unable to load plans");
  }
};

/**
 * Vendor-initiated subscribe / upgrade / downgrade.
 *
 * Only a plan id is accepted. Price, quota and commission always come from the
 * plan document on the server, never from the request.
 */
export const subscribeToPlan = async (req, res) => {
  try {
    const restaurant = await requireOwnRestaurant(req, res);
    if (!restaurant) return;

    const { planId } = req.body;
    if (!mongoose.isValidObjectId(planId)) {
      return res.status(400).json({ success: false, message: "Select a valid plan" });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || plan.isArchived || !plan.isActive) {
      return res.status(400).json({ success: false, message: "This plan is not available" });
    }

    // Guards against a double-submit creating two subscriptions.
    const current = await RestaurantSubscription.findOne({
      restaurant: restaurant._id,
      isCurrent: true,
    });

    if (current && String(current.plan) === String(plan._id) && current.status === "ACTIVE") {
      return res.status(400).json({ success: false, message: "You are already on this plan" });
    }

    const requiresPayment = plan.price > 0;

    const subscription = await assignPlanToRestaurant({
      restaurantId: restaurant._id,
      planId: plan._id,
      actor: req.user,
      source: "VENDOR",
      // Paid plans wait for a verified payment before becoming active.
      status: requiresPayment ? "PENDING_PAYMENT" : "ACTIVE",
    });

    const state = await getSubscriptionState(restaurant);

    res.json({
      success: true,
      requiresPayment,
      message: requiresPayment
        ? `${plan.name} selected. Complete the payment of Rs ${plan.price} to activate your 0% commission quota.`
        : `${plan.name} is now active.`,
      data: {
        state,
        // Payment intent placeholder. A gateway integration fills this in and
        // confirms via a verified webhook rather than a client callback.
        payment: requiresPayment
          ? {
              status: "PENDING",
              amount: plan.price,
              currency: "INR",
              subscriptionId: subscription._id,
              provider: null,
            }
          : null,
      },
    });
  } catch (error) {
    handleError(res, error, "Unable to update your plan");
  }
};

export const getSubscriptionHistory = async (req, res) => {
  try {
    const restaurant = await requireOwnRestaurant(req, res);
    if (!restaurant) return;

    const history = await RestaurantSubscription.find({ restaurant: restaurant._id })
      .sort({ createdAt: -1 })
      .limit(25);

    res.json({
      success: true,
      data: history.map((entry) => ({
        _id: entry._id,
        planName: entry.planSnapshot?.name || "",
        price: entry.planSnapshot?.price || 0,
        commissionRate: entry.commissionRate,
        status: entry.status,
        paymentStatus: entry.paymentStatus,
        startDate: entry.startDate,
        endDate: entry.endDate,
        freeOrderQuota: entry.freeOrderQuota,
        bonusFreeOrders: entry.bonusFreeOrders,
        usedFreeOrders: entry.usedFreeOrders,
        cycleHistory: entry.cycleHistory || [],
        createdAt: entry.createdAt,
      })),
    });
  } catch (error) {
    handleError(res, error, "Unable to load subscription history");
  }
};

/**
 * Commission breakdown for the current cycle, read from the immutable
 * per-order snapshots so the figures always match what was actually charged.
 */
export const getCommissionSummary = async (req, res) => {
  try {
    const restaurant = await requireOwnRestaurant(req, res);
    if (!restaurant) return;

    const state = await getSubscriptionState(restaurant);
    if (!state) return res.json({ success: true, data: null });

    const orders = await Order.find({
      restaurant: restaurant._id,
      createdAt: { $gte: state.cycle.start, $lt: state.cycle.end },
      status: { $in: COMMISSIONABLE_ORDER_STATUSES },
    })
      .select(
        "createdAt grandTotal commissionBase commissionPercent commissionAmount vendorNetAmount freeOrderApplied vendorPlanName status"
      )
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: {
        cycle: state.cycle,
        quota: state.quota,
        totals: state.usage,
        commissionRate: state.plan.commissionRate,
        orders: orders.map((order) => ({
          _id: order._id,
          createdAt: order.createdAt,
          grandTotal: order.grandTotal,
          commissionBase: order.commissionBase,
          commissionPercent: order.commissionPercent,
          commissionAmount: order.commissionAmount,
          vendorNetAmount: order.vendorNetAmount,
          freeOrderApplied: order.freeOrderApplied,
          planName: order.vendorPlanName,
          status: order.status,
        })),
      },
    });
  } catch (error) {
    handleError(res, error, "Unable to load commission summary");
  }
};
