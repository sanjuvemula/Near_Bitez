import SubscriptionPlan from "../models/SubscriptionPlan.js";
import {
  getActivePlans,
  getEffectiveCommissionRate,
  getSubscriptionState,
  reserveOrderCommission,
  resolveSubscription,
} from "./subscriptionService.js";
import { assignPlanToRestaurant } from "./subscriptionAdminService.js";

/**
 * Compatibility layer over the subscription system.
 *
 * Plans used to be hardcoded here. They now live in the SubscriptionPlan
 * collection and are managed by admins, but the exported shapes are unchanged
 * so existing order, vendor and admin callers keep working untouched.
 */

// Commission a typical aggregator charges, used only to show comparative
// savings on plan cards.
const AGGREGATOR_COMMISSION_PERCENT = 25;

const safeAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

/** Revenue the commission is charged on: items minus any discounts. */
export const getVendorRevenueBase = (orderOrTotals = {}) =>
  Math.max(
    0,
    safeAmount(orderOrTotals.itemTotal) -
      safeAmount(orderOrTotals.promoDiscount) -
      safeAmount(orderOrTotals.loyaltyDiscount)
  );

const toPlanOption = (plan, state) => {
  const quota = safeAmount(plan.freeOrderQuota);
  const orders = safeAmount(state?.usage?.orders);
  const grossOrderValue = safeAmount(state?.usage?.grossRevenue);
  const averageOrderValue = orders ? grossOrderValue / orders : 0;

  const commissionableOrders = Math.max(0, orders - quota);
  const projectedCost = Math.round(
    safeAmount(plan.price) + (commissionableOrders * averageOrderValue * safeAmount(plan.commissionRate)) / 100
  );
  const aggregatorCost = Math.round((grossOrderValue * AGGREGATOR_COMMISSION_PERCENT) / 100);

  return {
    _id: plan._id,
    key: plan.slug,
    slug: plan.slug,
    name: plan.name,
    monthlyFee: safeAmount(plan.price),
    price: safeAmount(plan.price),
    commissionPercent: safeAmount(plan.commissionRate),
    commissionRate: safeAmount(plan.commissionRate),
    freeOrderQuota: quota,
    orderLimit: null,
    badge: plan.badge || "",
    description: plan.description || "",
    features: plan.features || [],
    isActive: plan.isActive,
    displayOrder: plan.displayOrder || 0,
    billingCycleDays: plan.billingCycleDays || 30,
    shortPitch: plan.description || "",
    recommendedFor: plan.description || "",
    projectedMonthlyCost: projectedCost,
    estimatedAggregatorCost: aggregatorCost,
    estimatedSavingsVsAggregator: Math.max(0, aggregatorCost - projectedCost),
  };
};

const pickRecommendation = (plans, state) => {
  const orders = safeAmount(state?.usage?.projectedOrders || state?.usage?.orders);
  const grossOrderValue = safeAmount(state?.usage?.grossRevenue);
  const averageOrderValue = orders ? grossOrderValue / orders : 0;

  if (plans.length === 0) return null;

  // Recommend whichever plan costs the restaurant least at its current volume.
  const scored = plans
    .map((plan) => {
      const commissionable = Math.max(0, orders - safeAmount(plan.freeOrderQuota));
      const cost =
        safeAmount(plan.price) +
        (commissionable * averageOrderValue * safeAmount(plan.commissionRate)) / 100;
      return { plan, cost };
    })
    .sort((a, b) => a.cost - b.cost);

  const winner = scored[0];
  return {
    planId: winner.plan._id,
    planKey: winner.plan.slug,
    title: `${winner.plan.name} fits your current order volume best.`,
    reason: `At about ${Math.round(orders)} orders a cycle, ${winner.plan.name} works out cheapest once the ${winner.plan.freeOrderQuota} free orders and ${winner.plan.commissionRate}% commission are applied.`,
    estimatedMonthlyCost: Math.round(winner.cost),
  };
};

/**
 * Full plan payload for the vendor plan tab and the admin subscription views.
 *
 * `current`, `usage` and `options` keep their historical shape; `state` carries
 * the richer subscription detail (cycle, expiry, payment, history).
 */
export const buildVendorPlanPayload = async (restaurant) => {
  if (!restaurant) return null;

  const [state, plans] = await Promise.all([
    getSubscriptionState(restaurant),
    getActivePlans(),
  ]);

  if (!state) return null;

  const options = plans.map((plan) => toPlanOption(plan, state));
  const quota = state.quota;

  return {
    current: {
      _id: state.plan._id,
      key: state.plan.slug,
      slug: state.plan.slug,
      name: state.plan.name,
      monthlyFee: state.plan.price,
      price: state.plan.price,
      commissionPercent: state.plan.commissionRate,
      commissionRate: state.plan.commissionRate,
      freeOrderQuota: quota.base,
      badge: state.plan.badge,
      features: state.plan.features,
      billingCycleDays: state.plan.billingCycleDays,
      status: state.subscription.status,
      paymentStatus: state.subscription.paymentStatus,
      activatedAt: state.subscription.startDate,
      changedAt: state.subscription.startDate,
      renewalDate: state.subscription.endDate,
      hasCustomCommission: state.subscription.commissionRateOverride !== null,
    },
    usage: {
      periodStart: state.cycle.start,
      periodEnd: state.cycle.end,
      orderCount: state.usage.orders,
      deliveredCount: state.usage.orders,
      grossOrderValue: state.usage.grossRevenue,
      commissionBase: state.usage.commissionBase,
      commissionCollected: state.usage.commissionCharged,
      estimatedCommission: state.usage.estimatedCommission,
      savedThisCycle: state.usage.savedThisCycle,
      freeOrdersTotal: quota.total,
      freeOrdersUsed: quota.used,
      remainingFreeOrders: quota.remaining,
      bonusFreeOrders: quota.bonus,
      usagePercent: quota.percent,
      quotaState: quota.state,
      overLimit: quota.remaining === 0 && quota.total > 0,
    },
    options,
    recommendation: pickRecommendation(plans, state),
    state,
  };
};

/**
 * Commission snapshot stored on a new order.
 *
 * Delegates to the subscription engine, which atomically reserves a free-order
 * slot when quota remains.
 */
export const buildOrderMonetizationSnapshot = async (restaurant, commissionBase = 0) =>
  reserveOrderCommission(restaurant, commissionBase);

/** Resolves a plan by ObjectId or slug. */
export const findPlanByKeyOrId = async (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^[a-f\d]{24}$/i.test(raw)) {
    const byId = await SubscriptionPlan.findById(raw);
    if (byId) return byId;
  }

  return SubscriptionPlan.findOne({
    slug: raw.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
    isArchived: false,
  });
};

export const getVendorPlanConfig = async (value) => {
  const plan = await findPlanByKeyOrId(value);
  if (!plan) return null;
  return toPlanOption(plan, null);
};

export const getEffectivePlanConfig = async (restaurant) => {
  const subscription = await resolveSubscription(restaurant);
  if (!subscription) return null;

  return {
    key: subscription.planSnapshot?.slug,
    name: subscription.planSnapshot?.name,
    monthlyFee: subscription.planSnapshot?.price || 0,
    commissionPercent: getEffectiveCommissionRate(subscription),
    features: subscription.planSnapshot?.features || [],
  };
};

/**
 * Assigns a plan by key or id. Kept for the existing vendor and admin plan
 * endpoints; the heavy lifting lives in subscriptionAdminService.
 */
export const applyVendorPlan = async (restaurant, planKeyOrId, overrides = {}) => {
  const plan = await findPlanByKeyOrId(planKeyOrId);

  if (!plan) {
    const error = new Error("Invalid restaurant plan");
    error.statusCode = 400;
    throw error;
  }

  await assignPlanToRestaurant({
    restaurantId: restaurant._id,
    planId: plan._id,
    actor: overrides.actor || null,
    source: overrides.source || "ADMIN",
    notes: overrides.notes || "",
  });

  return buildVendorPlanPayload(restaurant);
};

export const getRestaurantPlanUsage = async (restaurant) => {
  const state = await getSubscriptionState(restaurant);
  if (!state) return null;

  return {
    periodStart: state.cycle.start,
    periodEnd: state.cycle.end,
    orderCount: state.usage.orders,
    grossOrderValue: state.usage.grossRevenue,
    commissionBase: state.usage.commissionBase,
    commissionCollected: state.usage.commissionCharged,
    freeOrdersTotal: state.quota.total,
    freeOrdersUsed: state.quota.used,
    remainingFreeOrders: state.quota.remaining,
  };
};
