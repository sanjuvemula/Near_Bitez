import mongoose from "mongoose";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import SubscriptionPlan, { serializePlan, slugifyPlanName } from "../models/SubscriptionPlan.js";
import RestaurantSubscription, {
  QUOTA_MILESTONES,
} from "../models/RestaurantSubscription.js";
import { safeNotify } from "./notificationService.js";

// Orders in these states count as commissionable. REJECTED orders are excluded
// and release any free-order slot they consumed.
export const COMMISSIONABLE_ORDER_STATUSES = [
  "SCHEDULED",
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

// Days before expiry at which the restaurant is warned. One notice per step.
const EXPIRY_NOTICE_DAYS = [7, 3, 1];

// Seeded only when the plans collection is empty. Admins own every plan after
// that: these are starting points, not hardcoded business rules.
export const DEFAULT_PLAN_TEMPLATES = [
  {
    name: "Free Basic",
    price: 0,
    freeOrderQuota: 0,
    commissionRate: 12,
    description: "Default plan for restaurants without an active subscription.",
    features: ["No monthly fee", "12% commission on every order", "Core ordering tools"],
    badge: "",
    isFallback: true,
    displayOrder: 0,
  },
  {
    name: "Starter",
    price: 399,
    freeOrderQuota: 50,
    commissionRate: 8,
    description: "For restaurants just moving their orders online.",
    features: ["50 orders at 0% commission", "8% commission after quota", "Menu and order tools"],
    badge: "",
    displayOrder: 1,
  },
  {
    name: "Growth",
    price: 799,
    freeOrderQuota: 150,
    commissionRate: 6,
    description: "For restaurants with steady repeat orders.",
    features: [
      "150 orders at 0% commission",
      "6% commission after quota",
      "Analytics and promo tools",
    ],
    badge: "POPULAR",
    displayOrder: 2,
  },
  {
    name: "Pro",
    price: 1499,
    freeOrderQuota: 400,
    commissionRate: 4,
    description: "For busy kitchens that need better margins.",
    features: [
      "400 orders at 0% commission",
      "4% commission after quota",
      "Priority support",
    ],
    badge: "BEST_VALUE",
    displayOrder: 3,
  },
  {
    name: "Premium",
    price: 2999,
    freeOrderQuota: 1000,
    commissionRate: 3,
    description: "For high-volume restaurants and cloud kitchens.",
    features: [
      "1000 orders at 0% commission",
      "3% commission after quota",
      "Dedicated account support",
    ],
    badge: "",
    displayOrder: 4,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const positive = (value, fallback = 0) => Math.max(0, safeNumber(value, fallback));

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + Math.max(1, Math.round(days)));
  return next;
};

const daysBetween = (from, to) =>
  Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000));

const makeCycleId = (subscriptionId, startedAt) =>
  `${subscriptionId}_${new Date(startedAt).toISOString().slice(0, 10)}`;

export const buildPlanSnapshot = (plan) => ({
  name: plan?.name || "Free Basic",
  slug: plan?.slug || "FREE_BASIC",
  price: positive(plan?.price),
  freeOrderQuota: positive(plan?.freeOrderQuota),
  commissionRate: Math.min(100, positive(plan?.commissionRate)),
  badge: plan?.badge || "",
  billingCycleDays: Math.max(1, safeNumber(plan?.billingCycleDays, 30)),
  features: plan?.features || [],
});

/** Admin override wins over the plan rate while it is set. */
export const getEffectiveCommissionRate = (subscription) => {
  if (!subscription) return 0;
  if (subscription.commissionRateOverride !== null && subscription.commissionRateOverride !== undefined) {
    return Math.min(100, positive(subscription.commissionRateOverride));
  }
  return Math.min(100, positive(subscription.commissionRate ?? subscription.planSnapshot?.commissionRate));
};

export const getTotalQuota = (subscription) =>
  positive(subscription?.freeOrderQuota) + positive(subscription?.bonusFreeOrders);

export const getRemainingQuota = (subscription) =>
  Math.max(0, getTotalQuota(subscription) - positive(subscription?.usedFreeOrders));

/** Drives the progress bar colour: normal → warning → danger → exhausted. */
export const getQuotaState = (used, total) => {
  if (total <= 0) return "NONE";
  const percent = (used / total) * 100;
  if (percent >= 100) return "EXHAUSTED";
  if (percent >= 90) return "CRITICAL";
  if (percent >= 80) return "WARNING";
  if (percent >= 50) return "MODERATE";
  return "HEALTHY";
};

// ─── Plan seeding and lookup ─────────────────────────────────────────────────

export const seedDefaultPlans = async () => {
  const existing = await SubscriptionPlan.countDocuments({});
  if (existing > 0) return [];

  const created = await SubscriptionPlan.insertMany(
    DEFAULT_PLAN_TEMPLATES.map((template) => ({
      ...template,
      slug: slugifyPlanName(template.name),
      isActive: true,
      isArchived: false,
      billingCycleDays: 30,
    }))
  );

  console.log(`Seeded ${created.length} default subscription plans`);
  return created;
};

/**
 * The plan restaurants land on with no subscription or after expiry.
 * Falls back to the cheapest active plan, then any active plan, so the system
 * still resolves if an admin clears the fallback flag.
 */
export const getFallbackPlan = async () => {
  const flagged = await SubscriptionPlan.findOne({ isFallback: true, isArchived: false });
  if (flagged) return flagged;

  return SubscriptionPlan.findOne({ isActive: true, isArchived: false }).sort({
    price: 1,
    displayOrder: 1,
  });
};

export const getActivePlans = () =>
  SubscriptionPlan.find({ isActive: true, isArchived: false }).sort({
    displayOrder: 1,
    price: 1,
  });

// ─── Subscription lifecycle ──────────────────────────────────────────────────

const createSubscriptionDoc = async ({
  restaurant,
  plan,
  actor = null,
  source = "SYSTEM",
  status = "ACTIVE",
  paymentStatus,
  startDate = new Date(),
}) => {
  const snapshot = buildPlanSnapshot(plan);
  const isFree = snapshot.price <= 0;
  const cycleEnd = addDays(startDate, snapshot.billingCycleDays);

  const subscription = await RestaurantSubscription.create({
    restaurant: restaurant._id,
    vendor: restaurant.vendor || null,
    plan: plan?._id || null,
    planSnapshot: snapshot,
    status,
    isCurrent: true,
    startDate,
    // Free plans never expire; paid plans run to the end of the paid cycle.
    endDate: isFree ? null : cycleEnd,
    cycleStart: startDate,
    cycleEnd,
    freeOrderQuota: snapshot.freeOrderQuota,
    bonusFreeOrders: 0,
    usedFreeOrders: 0,
    commissionRate: snapshot.commissionRate,
    commissionRateOverride: null,
    paymentStatus: paymentStatus || (isFree ? "WAIVED" : "PENDING"),
    assignedBy: actor?._id || null,
    source,
  });

  subscription.cycleId = makeCycleId(subscription._id, startDate);
  await subscription.save();

  await syncRestaurantPlanFields(restaurant, subscription);
  return subscription;
};

/**
 * Mirrors the live subscription onto the Restaurant document.
 *
 * The legacy `subscriptionPlan` / `planStatus` / `planRenewalDate` fields are
 * still read by existing admin and vendor surfaces, so they are kept in sync
 * rather than removed.
 */
export const syncRestaurantPlanFields = async (restaurant, subscription) => {
  if (!restaurant || !subscription) return;

  const update = {
    activeSubscription: subscription._id,
    subscriptionPlan: subscription.planSnapshot?.slug || "FREE_BASIC",
    subscriptionPlanName: subscription.planSnapshot?.name || "Free Basic",
    planStatus: subscription.status === "ACTIVE" ? "ACTIVE" : subscription.status,
    planChangedAt: new Date(),
    planRenewalDate: subscription.endDate || null,
  };

  if (!restaurant.planActivatedAt) {
    update.planActivatedAt = subscription.startDate || new Date();
  }

  await Restaurant.updateOne({ _id: restaurant._id }, { $set: update });

  // Keep the in-memory document consistent for the rest of the request.
  Object.assign(restaurant, update);
};

const archiveCurrentCycle = (subscription) => ({
  cycleId: subscription.cycleId || makeCycleId(subscription._id, subscription.cycleStart),
  startedAt: subscription.cycleStart,
  endedAt: subscription.cycleEnd,
  freeOrderQuota: positive(subscription.freeOrderQuota),
  bonusFreeOrders: positive(subscription.bonusFreeOrders),
  usedFreeOrders: positive(subscription.usedFreeOrders),
  commissionableOrders: 0,
  commissionCharged: 0,
});

/**
 * Advances the billing cycle when the current one has elapsed.
 *
 * Rollover is a renewal: the quota resets to zero used, milestone flags clear,
 * and the plan snapshot is refreshed from the live plan so the restaurant runs
 * on current terms. Orders already placed keep their own snapshot and are
 * unaffected.
 */
const rollCycleIfNeeded = async (subscription) => {
  if (!subscription?.cycleEnd) return subscription;

  const now = new Date();
  if (now < new Date(subscription.cycleEnd)) return subscription;

  const livePlan = subscription.plan
    ? await SubscriptionPlan.findById(subscription.plan)
    : null;

  let rolled = false;
  let guard = 0;

  while (now >= new Date(subscription.cycleEnd) && guard < 120) {
    guard += 1;
    rolled = true;

    subscription.cycleHistory.push(archiveCurrentCycle(subscription));
    if (subscription.cycleHistory.length > 24) {
      subscription.cycleHistory = subscription.cycleHistory.slice(-24);
    }

    const nextStart = new Date(subscription.cycleEnd);
    const cycleDays = Math.max(
      1,
      safeNumber(subscription.planSnapshot?.billingCycleDays, 30)
    );

    subscription.cycleStart = nextStart;
    subscription.cycleEnd = addDays(nextStart, cycleDays);
    subscription.cycleId = makeCycleId(subscription._id, nextStart);
    subscription.usedFreeOrders = 0;
    subscription.milestonesNotified = [];
  }

  if (!rolled) return subscription;

  // Refresh terms from the live plan if it is still available.
  if (livePlan && !livePlan.isArchived) {
    subscription.planSnapshot = buildPlanSnapshot(livePlan);
    subscription.freeOrderQuota = positive(livePlan.freeOrderQuota);
    subscription.commissionRate = Math.min(100, positive(livePlan.commissionRate));
  }

  // Bonus quota is a one-time grant and does not carry into the next cycle.
  subscription.bonusFreeOrders = 0;
  subscription.expiryNoticesSent = [];

  await subscription.save();

  await safeNotify({
    user: subscription.vendor,
    restaurant: subscription.restaurant,
    category: "SUBSCRIPTION",
    type: "CYCLE_RENEWED",
    title: "New billing cycle started",
    message: `Your ${subscription.planSnapshot.name} quota has reset. You have ${getTotalQuota(
      subscription
    )} orders at 0% commission this cycle.`,
    icon: "🔄",
    actionLabel: "View Subscription",
    actionRoute: "/vendor?tab=plan",
    meta: { cycleId: subscription.cycleId },
    dedupeKey: `cycle:${subscription._id}:${subscription.cycleId}`,
  });

  return subscription;
};

/**
 * Expires a lapsed paid subscription and moves the restaurant to the fallback
 * plan. Orders keep flowing — expiry changes commission terms, it does not
 * block the restaurant.
 */
const applyExpiryIfNeeded = async (subscription, restaurant) => {
  if (!subscription?.endDate) return subscription;
  if (!["ACTIVE", "PENDING_PAYMENT"].includes(subscription.status)) return subscription;

  const now = new Date();
  if (now <= new Date(subscription.endDate)) return subscription;

  subscription.status = "EXPIRED";
  subscription.isCurrent = false;
  await subscription.save();

  await safeNotify({
    user: subscription.vendor,
    restaurant: subscription.restaurant,
    category: "SUBSCRIPTION",
    type: "SUBSCRIPTION_EXPIRED",
    title: "Subscription expired",
    message: `Your ${subscription.planSnapshot.name} has expired. You have been moved to the default plan until you renew.`,
    icon: "⚠️",
    actionLabel: "Renew Plan",
    actionRoute: "/vendor?tab=plan",
    meta: { subscriptionId: String(subscription._id) },
    dedupeKey: `expired:${subscription._id}`,
  });

  const fallbackPlan = await getFallbackPlan();
  const target = restaurant || (await Restaurant.findById(subscription.restaurant));
  if (!target) return subscription;

  return createSubscriptionDoc({
    restaurant: target,
    plan: fallbackPlan,
    source: "SYSTEM",
    status: "ACTIVE",
  });
};

/**
 * Returns the live subscription for a restaurant, creating a fallback one if
 * none exists and applying any pending expiry or cycle rollover first.
 */
export const resolveSubscription = async (restaurantOrId) => {
  const restaurant =
    restaurantOrId && restaurantOrId._id
      ? restaurantOrId
      : await Restaurant.findById(restaurantOrId);

  if (!restaurant?._id) return null;

  let subscription = await RestaurantSubscription.findOne({
    restaurant: restaurant._id,
    isCurrent: true,
  });

  if (!subscription) {
    const fallbackPlan = await getFallbackPlan();
    subscription = await createSubscriptionDoc({
      restaurant,
      plan: fallbackPlan,
      source: "SYSTEM",
    });
    return subscription;
  }

  subscription = await applyExpiryIfNeeded(subscription, restaurant);
  subscription = await rollCycleIfNeeded(subscription);

  return subscription;
};

// ─── Quota milestones ────────────────────────────────────────────────────────

const notifyQuotaMilestones = async (subscription) => {
  const total = getTotalQuota(subscription);
  if (total <= 0) return;

  const used = positive(subscription.usedFreeOrders);
  const percent = (used / total) * 100;

  const due = QUOTA_MILESTONES.filter(
    (milestone) =>
      percent >= milestone.percent &&
      !(subscription.milestonesNotified || []).includes(milestone.key)
  );

  if (due.length === 0) return;

  // Only announce the highest threshold crossed so a burst of orders does not
  // produce a stack of notifications.
  const highest = due[due.length - 1];
  const remaining = Math.max(0, total - used);
  const planName = subscription.planSnapshot?.name || "your plan";
  const rate = getEffectiveCommissionRate(subscription);

  const copy =
    highest.key === "QUOTA_100"
      ? {
          title: "Free order quota finished",
          message: `You have used all ${total} free orders. New eligible orders will now incur ${rate}% commission.`,
          icon: "🔴",
        }
      : highest.key === "QUOTA_90"
      ? {
          title: "0% commission quota almost finished",
          message: `You have used ${used} of your ${total} free orders. Only ${remaining} free order${
            remaining === 1 ? "" : "s"
          } remain${remaining === 1 ? "s" : ""}.`,
          icon: "🟠",
        }
      : highest.key === "QUOTA_80"
      ? {
          title: "80% of free orders used",
          message: `You have used ${used} of your ${total} free orders. Only ${remaining} free orders remain.`,
          icon: "🟡",
        }
      : {
          title: "Half of your free orders used",
          message: `You have used ${used} of your ${total} free orders on ${planName}.`,
          icon: "📊",
        };

  await RestaurantSubscription.updateOne(
    { _id: subscription._id },
    { $addToSet: { milestonesNotified: { $each: due.map((item) => item.key) } } }
  );

  await safeNotify({
    user: subscription.vendor,
    restaurant: subscription.restaurant,
    category: "SUBSCRIPTION",
    ...copy,
    type: highest.key,
    actionLabel: "View Subscription",
    actionRoute: "/vendor?tab=plan",
    meta: { used, total, remaining, cycleId: subscription.cycleId },
    dedupeKey: `${highest.key}:${subscription._id}:${subscription.cycleId}`,
  });
};

// ─── Order commission ────────────────────────────────────────────────────────

const emptyCommissionSnapshot = (base) => ({
  vendorPlan: "FREE_BASIC",
  vendorPlanName: "Free Basic",
  vendorPlanMonthlyFee: 0,
  subscriptionPlan: null,
  subscription: null,
  subscriptionCycleId: "",
  commissionBase: base,
  commissionPercent: 0,
  commissionAmount: 0,
  vendorNetAmount: base,
  freeOrderApplied: false,
  freeOrderSequence: null,
  freeOrdersRemainingAfter: 0,
  quotaUsedAtOrder: 0,
  quotaTotalAtOrder: 0,
});

/**
 * Reserves a free-order slot if quota remains and returns the immutable
 * commission snapshot stored on the order.
 *
 * The reservation is a single conditional `$inc`, so concurrent orders can
 * never oversell the quota. Everything the order needs to explain its own
 * commission later is captured here — later plan edits cannot rewrite it.
 */
export const reserveOrderCommission = async (restaurant, commissionBase = 0) => {
  const base = Math.max(0, Math.round(safeNumber(commissionBase)));
  const subscription = await resolveSubscription(restaurant);

  if (!subscription) return emptyCommissionSnapshot(base);

  let current = subscription;
  let freeOrderApplied = false;

  // Paused, cancelled and unpaid subscriptions do not earn free orders.
  if (subscription.status === "ACTIVE") {
    const consumed = await RestaurantSubscription.findOneAndUpdate(
      {
        _id: subscription._id,
        isCurrent: true,
        status: "ACTIVE",
        $expr: {
          $lt: ["$usedFreeOrders", { $add: ["$freeOrderQuota", "$bonusFreeOrders"] }],
        },
      },
      { $inc: { usedFreeOrders: 1 } },
      { new: true }
    );

    if (consumed) {
      freeOrderApplied = true;
      current = consumed;
    }
  }

  const commissionPercent = freeOrderApplied ? 0 : getEffectiveCommissionRate(current);
  const commissionAmount = Math.round((base * commissionPercent) / 100);
  const total = getTotalQuota(current);
  const used = positive(current.usedFreeOrders);

  if (freeOrderApplied) {
    try {
      await notifyQuotaMilestones(current);
    } catch (error) {
      console.error("Quota milestone notification failed:", error.message);
    }
  }

  return {
    vendorPlan: current.planSnapshot?.slug || "FREE_BASIC",
    vendorPlanName: current.planSnapshot?.name || "Free Basic",
    vendorPlanMonthlyFee: positive(current.planSnapshot?.price),
    subscriptionPlan: current.plan || null,
    subscription: current._id,
    subscriptionCycleId: current.cycleId || "",
    commissionBase: base,
    commissionPercent,
    commissionAmount,
    vendorNetAmount: Math.max(0, base - commissionAmount),
    freeOrderApplied,
    freeOrderSequence: freeOrderApplied ? used : null,
    freeOrdersRemainingAfter: Math.max(0, total - used),
    quotaUsedAtOrder: used,
    quotaTotalAtOrder: total,
  };
};

/**
 * Returns a consumed free-order slot when an order is rejected.
 *
 * Only refunds within the same billing cycle — a rejection after rollover must
 * not credit the new cycle's quota.
 */
export const releaseOrderQuota = async (order) => {
  if (!order?.freeOrderApplied || !order?.subscription) return false;

  const result = await RestaurantSubscription.updateOne(
    {
      _id: order.subscription,
      cycleId: order.subscriptionCycleId,
      usedFreeOrders: { $gt: 0 },
    },
    { $inc: { usedFreeOrders: -1 } }
  );

  return result.modifiedCount > 0;
};

// ─── Reporting ───────────────────────────────────────────────────────────────

const getCycleOrderStats = async (restaurantId, cycleStart, cycleEnd) => {
  if (!restaurantId) {
    return { orderCount: 0, commissionCharged: 0, grossRevenue: 0, commissionBase: 0, freeOrders: 0 };
  }

  const [result] = await Order.aggregate([
    {
      $match: {
        restaurant: new mongoose.Types.ObjectId(String(restaurantId)),
        createdAt: { $gte: new Date(cycleStart), $lt: new Date(cycleEnd) },
        status: { $in: COMMISSIONABLE_ORDER_STATUSES },
      },
    },
    {
      $group: {
        _id: null,
        orderCount: { $sum: 1 },
        commissionCharged: { $sum: "$commissionAmount" },
        grossRevenue: { $sum: "$grandTotal" },
        commissionBase: { $sum: "$commissionBase" },
        freeOrders: { $sum: { $cond: ["$freeOrderApplied", 1, 0] } },
      },
    },
  ]);

  return {
    orderCount: result?.orderCount || 0,
    commissionCharged: Math.round(result?.commissionCharged || 0),
    grossRevenue: Math.round(result?.grossRevenue || 0),
    commissionBase: Math.round(result?.commissionBase || 0),
    freeOrders: result?.freeOrders || 0,
  };
};

/**
 * Full subscription payload for the vendor dashboard and admin detail view.
 * Everything the UI renders — quota, commission, expiry, savings — is derived
 * here on the server.
 */
export const getSubscriptionState = async (restaurant) => {
  const subscription = await resolveSubscription(restaurant);
  if (!subscription) return null;

  const total = getTotalQuota(subscription);
  const used = positive(subscription.usedFreeOrders);
  const remaining = Math.max(0, total - used);
  const rate = getEffectiveCommissionRate(subscription);

  const stats = await getCycleOrderStats(
    subscription.restaurant,
    subscription.cycleStart,
    subscription.cycleEnd
  );

  const now = new Date();
  const daysUntilExpiry = subscription.endDate
    ? Math.max(0, daysBetween(now, subscription.endDate))
    : null;

  // What the free orders were worth: commission that would have applied had the
  // restaurant been on the same plan with no quota.
  const averageBase = stats.orderCount ? stats.commissionBase / stats.orderCount : 0;
  const savedThisCycle = Math.round((averageBase * stats.freeOrders * rate) / 100);

  // Project the full-cycle commission by extrapolating the current order rate
  // across the remaining days, then charging only the orders beyond quota.
  const cycleDays = Math.max(1, daysBetween(subscription.cycleStart, subscription.cycleEnd));
  const elapsedDays = Math.min(cycleDays, Math.max(1, daysBetween(subscription.cycleStart, now)));
  const projectedOrders = Math.round((stats.orderCount / elapsedDays) * cycleDays);
  const projectedCommissionable = Math.max(0, projectedOrders - total);
  const estimatedCommission = Math.round((projectedCommissionable * averageBase * rate) / 100);

  return {
    subscription: {
      _id: subscription._id,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      paymentStatus: subscription.paymentStatus,
      autoRenew: subscription.autoRenew,
      source: subscription.source,
      commissionRateOverride: subscription.commissionRateOverride,
      notes: subscription.notes || "",
    },
    plan: {
      _id: subscription.plan,
      name: subscription.planSnapshot?.name || "Free Basic",
      slug: subscription.planSnapshot?.slug || "FREE_BASIC",
      price: positive(subscription.planSnapshot?.price),
      badge: subscription.planSnapshot?.badge || "",
      features: subscription.planSnapshot?.features || [],
      commissionRate: rate,
      planCommissionRate: positive(subscription.planSnapshot?.commissionRate),
      billingCycleDays: subscription.planSnapshot?.billingCycleDays || 30,
    },
    quota: {
      base: positive(subscription.freeOrderQuota),
      bonus: positive(subscription.bonusFreeOrders),
      total,
      used,
      remaining,
      percent: total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0,
      state: getQuotaState(used, total),
    },
    cycle: {
      id: subscription.cycleId,
      start: subscription.cycleStart,
      end: subscription.cycleEnd,
      daysRemaining: subscription.cycleEnd ? Math.max(0, daysBetween(now, subscription.cycleEnd)) : null,
    },
    expiry: {
      expiresAt: subscription.endDate,
      daysUntilExpiry,
      expiringSoon: daysUntilExpiry !== null && daysUntilExpiry <= 7,
      expired: subscription.status === "EXPIRED",
    },
    usage: {
      orders: stats.orderCount,
      freeOrders: stats.freeOrders,
      commissionableOrders: Math.max(0, stats.orderCount - stats.freeOrders),
      commissionCharged: stats.commissionCharged,
      grossRevenue: stats.grossRevenue,
      commissionBase: stats.commissionBase,
      savedThisCycle,
      projectedOrders,
      // Projected commission for the full cycle at the current order rate.
      estimatedCommission: Math.max(stats.commissionCharged, estimatedCommission),
    },
    cycleHistory: (subscription.cycleHistory || []).slice(-12).reverse(),
  };
};

export default {
  seedDefaultPlans,
  getFallbackPlan,
  getActivePlans,
  resolveSubscription,
  reserveOrderCommission,
  releaseOrderQuota,
  getSubscriptionState,
};
