import mongoose from "mongoose";
import Restaurant from "../../models/Restaurant.js";
import SubscriptionPlan, {
  PLAN_BADGES,
  serializePlan,
  slugifyPlanName,
} from "../../models/SubscriptionPlan.js";
import RestaurantSubscription from "../../models/RestaurantSubscription.js";
import { recordAudit, getAuditTrail } from "../../services/auditService.js";
import { buildVendorPlanPayload } from "../../services/vendorPlanService.js";
import { getSubscriptionState } from "../../services/subscriptionService.js";
import {
  adjustBonusQuota,
  assignPlanToRestaurant,
  extendSubscription,
  getSubscriptionAnalytics,
  recordSubscriptionPayment,
  resetQuotaUsage,
  setCommissionOverride,
  setSubscriptionStatus,
} from "../../services/subscriptionAdminService.js";

const asText = (value, maxLength = 200) => String(value ?? "").trim().slice(0, maxLength);

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

const handleError = (res, error, fallback) =>
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallback,
  });

/**
 * Validates and normalises a plan payload.
 *
 * Every pricing and commission value is validated here on the server — the
 * client is never trusted for plan terms.
 */
const buildPlanPayload = (body, { partial = false } = {}) => {
  const payload = {};

  if (body.name !== undefined || !partial) {
    const name = asText(body.name, 60);
    if (!name) return { error: "Plan name is required" };
    payload.name = name;
    payload.slug = slugifyPlanName(name);
    if (!payload.slug) return { error: "Plan name must contain letters or numbers" };
  }

  if (body.price !== undefined || !partial) {
    const price = asNumber(body.price);
    if (!Number.isFinite(price) || price < 0) return { error: "Price cannot be negative" };
    if (price > 1000000) return { error: "Price is unrealistically high" };
    payload.price = Math.round(price);
  }

  if (body.freeOrderQuota !== undefined || !partial) {
    const quota = asNumber(body.freeOrderQuota);
    if (!Number.isFinite(quota) || quota < 0) return { error: "Free order quota cannot be negative" };
    if (quota > 1000000) return { error: "Free order quota is unrealistically high" };
    payload.freeOrderQuota = Math.round(quota);
  }

  if (body.commissionRate !== undefined || !partial) {
    const rate = asNumber(body.commissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return { error: "Commission must be between 0 and 100" };
    }
    payload.commissionRate = Math.round(rate * 100) / 100;
  }

  if (body.description !== undefined) payload.description = asText(body.description, 500);

  if (body.features !== undefined) {
    const features = Array.isArray(body.features)
      ? body.features
      : String(body.features || "")
          .split("\n")
          .map((item) => item.trim());
    payload.features = features.map((item) => asText(item, 120)).filter(Boolean).slice(0, 12);
  }

  if (body.badge !== undefined) {
    const badge = asText(body.badge, 20).toUpperCase();
    if (badge && !PLAN_BADGES.includes(badge)) return { error: "Invalid plan badge" };
    payload.badge = badge;
  }

  if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);
  if (body.isFallback !== undefined) payload.isFallback = Boolean(body.isFallback);
  if (body.displayOrder !== undefined) {
    const order = asNumber(body.displayOrder);
    payload.displayOrder = Number.isFinite(order) ? Math.round(order) : 0;
  }
  if (body.billingCycleDays !== undefined) {
    const days = asNumber(body.billingCycleDays);
    if (!Number.isFinite(days) || days < 1 || days > 366) {
      return { error: "Billing cycle must be between 1 and 366 days" };
    }
    payload.billingCycleDays = Math.round(days);
  }

  // A plan must describe what the restaurant is buying.
  if (!partial) {
    const hasDescription = Boolean(payload.description);
    const hasFeatures = (payload.features || []).length > 0;
    if (!hasDescription && !hasFeatures) {
      return { error: "Add a description or at least one feature" };
    }
  }

  return { payload };
};

/** Only one plan can be the expiry fallback. */
const clearOtherFallbacks = async (planId) => {
  await SubscriptionPlan.updateMany(
    { _id: { $ne: planId }, isFallback: true },
    { $set: { isFallback: false } }
  );
};

// ─── Plan CRUD ───────────────────────────────────────────────────────────────

export const listPlans = async (req, res) => {
  try {
    const includeArchived = String(req.query.includeArchived || "") === "true";
    const query = includeArchived ? {} : { isArchived: false };

    const plans = await SubscriptionPlan.find(query).sort({ displayOrder: 1, price: 1 });

    // Subscriber counts and revenue per plan, so admins can see the impact of a
    // plan before editing or archiving it.
    const usage = await RestaurantSubscription.aggregate([
      { $match: { isCurrent: true } },
      {
        $group: {
          _id: "$plan",
          restaurantCount: { $sum: 1 },
          activeCount: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } },
        },
      },
    ]);

    const usageMap = new Map(usage.map((row) => [String(row._id), row]));

    const data = plans.map((plan) => {
      const stats = usageMap.get(String(plan._id)) || {};
      return {
        ...serializePlan(plan),
        restaurantCount: stats.restaurantCount || 0,
        activeCount: stats.activeCount || 0,
        monthlyRevenue: (stats.activeCount || 0) * plan.price,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Unable to load subscription plans");
  }
};

export const getPlanById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, "Invalid plan id");

    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return fail(res, "Plan not found", 404);

    const [restaurantCount, activeCount] = await Promise.all([
      RestaurantSubscription.countDocuments({ plan: plan._id, isCurrent: true }),
      RestaurantSubscription.countDocuments({ plan: plan._id, isCurrent: true, status: "ACTIVE" }),
    ]);

    res.json({
      success: true,
      data: { ...serializePlan(plan), restaurantCount, activeCount },
    });
  } catch (error) {
    handleError(res, error, "Unable to load plan");
  }
};

export const createPlan = async (req, res) => {
  try {
    const { payload, error } = buildPlanPayload(req.body);
    if (error) return fail(res, error);

    const duplicate = await SubscriptionPlan.findOne({ slug: payload.slug });
    if (duplicate) return fail(res, "A plan with this name already exists");

    const plan = await SubscriptionPlan.create({
      ...payload,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });

    if (plan.isFallback) await clearOtherFallbacks(plan._id);

    await recordAudit({
      admin: req.user,
      action: "PLAN_CREATED",
      plan: plan._id,
      newValue: serializePlan(plan),
      description: `Created plan ${plan.name}`,
    });

    res.status(201).json({ success: true, data: serializePlan(plan) });
  } catch (error) {
    if (error.code === 11000) return fail(res, "A plan with this name already exists");
    handleError(res, error, "Unable to create plan");
  }
};

export const updatePlan = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, "Invalid plan id");

    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return fail(res, "Plan not found", 404);

    const { payload, error } = buildPlanPayload(req.body, { partial: true });
    if (error) return fail(res, error);

    if (payload.slug && payload.slug !== plan.slug) {
      const duplicate = await SubscriptionPlan.findOne({
        slug: payload.slug,
        _id: { $ne: plan._id },
      });
      if (duplicate) return fail(res, "A plan with this name already exists");
    }

    // A fallback plan must stay available for expired subscriptions to land on.
    if (payload.isActive === false && plan.isFallback) {
      return fail(res, "The fallback plan cannot be deactivated. Set another plan as fallback first.");
    }

    const previous = serializePlan(plan);
    Object.assign(plan, payload, { updatedBy: req.user?._id || null });
    await plan.save();

    if (plan.isFallback) await clearOtherFallbacks(plan._id);

    await recordAudit({
      admin: req.user,
      action: "PLAN_UPDATED",
      plan: plan._id,
      previousValue: previous,
      newValue: serializePlan(plan),
      description: `Updated plan ${plan.name}`,
    });

    res.json({ success: true, data: serializePlan(plan) });
  } catch (error) {
    if (error.code === 11000) return fail(res, "A plan with this name already exists");
    handleError(res, error, "Unable to update plan");
  }
};

export const togglePlanStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, "Invalid plan id");

    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return fail(res, "Plan not found", 404);

    const nextActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !plan.isActive;

    if (!nextActive && plan.isFallback) {
      return fail(res, "The fallback plan cannot be deactivated. Set another plan as fallback first.");
    }

    const previousActive = plan.isActive;
    plan.isActive = nextActive;
    plan.updatedBy = req.user?._id || null;
    await plan.save();

    // Restaurants already on a deactivated plan keep their terms for the running
    // cycle; the plan simply stops being offered to new subscribers.
    const affected = await RestaurantSubscription.countDocuments({
      plan: plan._id,
      isCurrent: true,
    });

    await recordAudit({
      admin: req.user,
      action: nextActive ? "PLAN_ACTIVATED" : "PLAN_DEACTIVATED",
      plan: plan._id,
      previousValue: { isActive: previousActive },
      newValue: { isActive: nextActive },
      description: `${nextActive ? "Activated" : "Deactivated"} plan ${plan.name}`,
    });

    res.json({
      success: true,
      data: serializePlan(plan),
      message: nextActive
        ? `${plan.name} is now available to restaurants`
        : `${plan.name} is hidden from new subscribers. ${affected} restaurant(s) keep their current terms.`,
    });
  } catch (error) {
    handleError(res, error, "Unable to change plan status");
  }
};

export const duplicatePlan = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, "Invalid plan id");

    const source = await SubscriptionPlan.findById(req.params.id);
    if (!source) return fail(res, "Plan not found", 404);

    // Find a free name: "Growth Copy", "Growth Copy 2", ...
    let attempt = 1;
    let name = `${source.name} Copy`;
    let slug = slugifyPlanName(name);

    while (await SubscriptionPlan.findOne({ slug })) {
      attempt += 1;
      name = `${source.name} Copy ${attempt}`;
      slug = slugifyPlanName(name);
      if (attempt > 25) return fail(res, "Too many copies of this plan already exist");
    }

    const maxOrder = await SubscriptionPlan.findOne().sort({ displayOrder: -1 }).select("displayOrder");

    const plan = await SubscriptionPlan.create({
      name,
      slug,
      price: source.price,
      freeOrderQuota: source.freeOrderQuota,
      commissionRate: source.commissionRate,
      description: source.description,
      features: source.features,
      badge: source.badge,
      billingCycleDays: source.billingCycleDays,
      displayOrder: (maxOrder?.displayOrder || 0) + 1,
      // A duplicate is never live or the fallback until the admin says so.
      isActive: false,
      isFallback: false,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });

    await recordAudit({
      admin: req.user,
      action: "PLAN_DUPLICATED",
      plan: plan._id,
      previousValue: { source: source.name },
      newValue: serializePlan(plan),
      description: `Duplicated ${source.name} as ${plan.name}`,
    });

    res.status(201).json({ success: true, data: serializePlan(plan) });
  } catch (error) {
    handleError(res, error, "Unable to duplicate plan");
  }
};

/**
 * Deletes a plan, or archives it when restaurants have subscribed.
 *
 * Archiving preserves the plan reference so historical subscriptions and order
 * snapshots keep resolving.
 */
export const deletePlan = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, "Invalid plan id");

    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return fail(res, "Plan not found", 404);

    if (plan.isFallback) {
      return fail(res, "The fallback plan cannot be deleted. Set another plan as fallback first.");
    }

    const inUse = await RestaurantSubscription.countDocuments({ plan: plan._id });

    if (inUse > 0) {
      plan.isArchived = true;
      plan.isActive = false;
      plan.updatedBy = req.user?._id || null;
      await plan.save();

      await recordAudit({
        admin: req.user,
        action: "PLAN_ARCHIVED",
        plan: plan._id,
        previousValue: serializePlan(plan),
        description: `Archived plan ${plan.name} (${inUse} subscription records)`,
      });

      return res.json({
        success: true,
        archived: true,
        message: `${plan.name} has subscription history, so it was archived instead of deleted. Existing restaurants keep their terms.`,
      });
    }

    await SubscriptionPlan.deleteOne({ _id: plan._id });

    await recordAudit({
      admin: req.user,
      action: "PLAN_DELETED",
      previousValue: serializePlan(plan),
      description: `Deleted plan ${plan.name}`,
    });

    res.json({ success: true, archived: false, message: `${plan.name} deleted` });
  } catch (error) {
    handleError(res, error, "Unable to delete plan");
  }
};

export const reorderPlans = async (req, res) => {
  try {
    const order = Array.isArray(req.body.order) ? req.body.order : [];
    if (order.length === 0) return fail(res, "Provide the plan order");

    const operations = order
      .filter((entry) => mongoose.isValidObjectId(entry.id))
      .map((entry, index) => ({
        updateOne: {
          filter: { _id: entry.id },
          update: {
            $set: {
              displayOrder: Number.isFinite(Number(entry.displayOrder))
                ? Math.round(Number(entry.displayOrder))
                : index,
            },
          },
        },
      }));

    if (operations.length === 0) return fail(res, "No valid plans in the order list");

    await SubscriptionPlan.bulkWrite(operations);

    await recordAudit({
      admin: req.user,
      action: "PLAN_REORDERED",
      newValue: { count: operations.length },
      description: `Reordered ${operations.length} plans`,
    });

    const plans = await SubscriptionPlan.find({ isArchived: false }).sort({
      displayOrder: 1,
      price: 1,
    });

    res.json({ success: true, data: plans.map(serializePlan) });
  } catch (error) {
    handleError(res, error, "Unable to reorder plans");
  }
};

// ─── Restaurant subscription management ──────────────────────────────────────

export const getRestaurantSubscriptionDetail = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    if (!mongoose.isValidObjectId(restaurantId)) return fail(res, "Invalid restaurant id");

    const restaurant = await Restaurant.findById(restaurantId).populate(
      "vendor",
      "name email phone"
    );
    if (!restaurant) return fail(res, "Restaurant not found", 404);

    const [state, planPayload, history, audit] = await Promise.all([
      getSubscriptionState(restaurant),
      buildVendorPlanPayload(restaurant),
      RestaurantSubscription.find({ restaurant: restaurant._id })
        .sort({ createdAt: -1 })
        .limit(25)
        .populate("assignedBy", "name email"),
      getAuditTrail({ restaurant: restaurant._id, limit: 50 }),
    ]);

    res.json({
      success: true,
      data: {
        restaurant: restaurant.toObject(),
        state,
        plan: planPayload,
        history: history.map((entry) => ({
          _id: entry._id,
          planName: entry.planSnapshot?.name || "",
          price: entry.planSnapshot?.price || 0,
          commissionRate: entry.commissionRate,
          status: entry.status,
          startDate: entry.startDate,
          endDate: entry.endDate,
          usedFreeOrders: entry.usedFreeOrders,
          freeOrderQuota: entry.freeOrderQuota,
          bonusFreeOrders: entry.bonusFreeOrders,
          paymentStatus: entry.paymentStatus,
          source: entry.source,
          assignedBy: entry.assignedBy?.name || null,
          createdAt: entry.createdAt,
        })),
        audit: audit.map((entry) => ({
          _id: entry._id,
          action: entry.action,
          description: entry.description,
          admin: entry.admin?.name || entry.adminEmail || "System",
          previousValue: entry.previousValue,
          newValue: entry.newValue,
          createdAt: entry.createdAt,
        })),
      },
    });
  } catch (error) {
    handleError(res, error, "Unable to load subscription detail");
  }
};

/** Wraps a service action and returns the refreshed subscription state. */
const runSubscriptionAction = (action, fallbackMessage) => async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId;
    await action(req, restaurantId);

    const restaurant = await Restaurant.findById(restaurantId);
    const state = await getSubscriptionState(restaurant);

    res.json({ success: true, data: state });
  } catch (error) {
    handleError(res, error, fallbackMessage);
  }
};

export const assignPlan = runSubscriptionAction(
  (req, restaurantId) =>
    assignPlanToRestaurant({
      restaurantId,
      planId: req.body.planId,
      actor: req.user,
      source: "ADMIN",
      paymentStatus: req.body.paymentStatus,
      notes: req.body.notes,
    }),
  "Unable to assign plan"
);

export const changeStatus = runSubscriptionAction(
  (req, restaurantId) =>
    setSubscriptionStatus({ restaurantId, status: req.body.status, actor: req.user }),
  "Unable to change subscription status"
);

export const extend = runSubscriptionAction(
  (req, restaurantId) =>
    extendSubscription({ restaurantId, days: req.body.days, actor: req.user }),
  "Unable to extend subscription"
);

export const adjustQuota = runSubscriptionAction(
  (req, restaurantId) =>
    adjustBonusQuota({ restaurantId, amount: req.body.amount, actor: req.user }),
  "Unable to adjust bonus quota"
);

export const resetQuota = runSubscriptionAction(
  (req, restaurantId) => resetQuotaUsage({ restaurantId, actor: req.user }),
  "Unable to reset quota"
);

export const overrideCommission = runSubscriptionAction(
  (req, restaurantId) =>
    setCommissionOverride({ restaurantId, rate: req.body.rate, actor: req.user }),
  "Unable to update commission"
);

export const recordPayment = runSubscriptionAction(
  (req, restaurantId) =>
    recordSubscriptionPayment({
      restaurantId,
      amount: req.body.amount,
      status: req.body.status,
      provider: req.body.provider,
      reference: req.body.reference,
      note: req.body.note,
      actor: req.user,
    }),
  "Unable to record payment"
);

// ─── Analytics and audit ─────────────────────────────────────────────────────

export const getAnalytics = async (req, res) => {
  try {
    const data = await getSubscriptionAnalytics({
      from: req.query.from,
      to: req.query.to,
      planId: req.query.planId,
      status: req.query.status,
    });

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Unable to load subscription analytics");
  }
};

export const getAuditLog = async (req, res) => {
  try {
    const entries = await getAuditTrail({
      restaurant: mongoose.isValidObjectId(req.query.restaurantId)
        ? req.query.restaurantId
        : undefined,
      plan: mongoose.isValidObjectId(req.query.planId) ? req.query.planId : undefined,
      action: req.query.action,
      limit: req.query.limit,
    });

    res.json({
      success: true,
      data: entries.map((entry) => ({
        _id: entry._id,
        action: entry.action,
        description: entry.description,
        admin: entry.admin?.name || entry.adminEmail || "System",
        restaurant: entry.restaurant,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        createdAt: entry.createdAt,
      })),
    });
  } catch (error) {
    handleError(res, error, "Unable to load audit log");
  }
};
