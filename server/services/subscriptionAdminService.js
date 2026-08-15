import mongoose from "mongoose";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import SubscriptionPlan from "../models/SubscriptionPlan.js";
import RestaurantSubscription from "../models/RestaurantSubscription.js";
import { recordAudit } from "./auditService.js";
import { safeNotify } from "./notificationService.js";
import {
  buildPlanSnapshot,
  getEffectiveCommissionRate,
  getFallbackPlan,
  getTotalQuota,
  resolveSubscription,
  syncRestaurantPlanFields,
  COMMISSIONABLE_ORDER_STATUSES,
} from "./subscriptionService.js";

const EXPIRY_NOTICE_DAYS = [7, 3, 1];

const badRequest = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const positive = (value, fallback = 0) => Math.max(0, safeNumber(value, fallback));

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + Math.round(days));
  return next;
};

const daysBetween = (from, to) =>
  Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000));

const loadRestaurant = async (restaurantId) => {
  if (!mongoose.isValidObjectId(restaurantId)) {
    throw badRequest("Invalid restaurant id");
  }
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw badRequest("Restaurant not found", 404);
  return restaurant;
};

const planActionRoute = "/vendor?tab=plan";

// ─── Plan assignment ─────────────────────────────────────────────────────────

/**
 * Moves a restaurant onto a plan.
 *
 * The running subscription is closed out (kept as history) and a fresh one is
 * created with its own cycle, so quota and commission terms start clean. Past
 * orders are untouched — they carry their own snapshots.
 */
export const assignPlanToRestaurant = async ({
  restaurantId,
  planId,
  actor = null,
  source = "ADMIN",
  paymentStatus,
  status,
  notes = "",
} = {}) => {
  const restaurant = await loadRestaurant(restaurantId);

  if (!mongoose.isValidObjectId(planId)) {
    throw badRequest("Invalid plan id");
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw badRequest("Subscription plan not found", 404);
  if (plan.isArchived) throw badRequest("This plan has been archived");
  if (!plan.isActive && source === "VENDOR") {
    throw badRequest("This plan is not available right now");
  }

  const previous = await RestaurantSubscription.findOne({
    restaurant: restaurant._id,
    isCurrent: true,
  });

  if (previous && String(previous.plan) === String(plan._id) && previous.status === "ACTIVE") {
    throw badRequest("Restaurant is already on this plan");
  }

  const previousPrice = positive(previous?.planSnapshot?.price);
  const isUpgrade = plan.price > previousPrice;
  const isDowngrade = plan.price < previousPrice;

  if (previous) {
    previous.isCurrent = false;
    previous.status = "SUPERSEDED";
    await previous.save();
  }

  const snapshot = buildPlanSnapshot(plan);
  const now = new Date();
  const isFree = snapshot.price <= 0;
  const cycleEnd = addDays(now, snapshot.billingCycleDays);

  // Paid plans a vendor selects themselves stay PENDING_PAYMENT until a real
  // payment is recorded. Free quota only applies once the subscription is
  // ACTIVE, so nothing is granted before payment clears.
  const initialStatus = ["ACTIVE", "PENDING_PAYMENT"].includes(String(status || "").toUpperCase())
    ? String(status).toUpperCase()
    : "ACTIVE";

  const subscription = await RestaurantSubscription.create({
    restaurant: restaurant._id,
    vendor: restaurant.vendor || null,
    plan: plan._id,
    planSnapshot: snapshot,
    status: initialStatus,
    isCurrent: true,
    startDate: now,
    endDate: isFree ? null : cycleEnd,
    cycleStart: now,
    cycleEnd,
    cycleId: "",
    freeOrderQuota: snapshot.freeOrderQuota,
    bonusFreeOrders: 0,
    usedFreeOrders: 0,
    commissionRate: snapshot.commissionRate,
    paymentStatus: paymentStatus || (isFree ? "WAIVED" : "PENDING"),
    assignedBy: actor?._id || null,
    source,
    notes: String(notes || "").slice(0, 500),
  });

  subscription.cycleId = `${subscription._id}_${now.toISOString().slice(0, 10)}`;
  await subscription.save();

  await syncRestaurantPlanFields(restaurant, subscription);

  await recordAudit({
    admin: actor,
    action: previous ? "SUBSCRIPTION_CHANGED" : "SUBSCRIPTION_ASSIGNED",
    restaurant: restaurant._id,
    plan: plan._id,
    subscription: subscription._id,
    previousValue: previous
      ? { plan: previous.planSnapshot?.name, price: previousPrice, status: previous.status }
      : null,
    newValue: { plan: plan.name, price: plan.price, commissionRate: plan.commissionRate },
    description: `${source === "VENDOR" ? "Vendor" : "Admin"} set plan to ${plan.name}`,
  });

  const changeLabel = isUpgrade ? "upgraded" : isDowngrade ? "changed" : "activated";
  await safeNotify({
    user: restaurant.vendor,
    restaurant: restaurant._id,
    category: "SUBSCRIPTION",
    type: isUpgrade ? "PLAN_UPGRADED" : isDowngrade ? "PLAN_DOWNGRADED" : "SUBSCRIPTION_ACTIVATED",
    title: `Your ${plan.name} is now active`,
    message: `Your plan has been ${changeLabel}. You have ${snapshot.freeOrderQuota} orders at 0% commission this cycle, then ${plan.commissionRate}% commission.`,
    icon: isUpgrade ? "⬆️" : isDowngrade ? "⬇️" : "✅",
    actionLabel: "View Subscription",
    actionRoute: planActionRoute,
    meta: { planId: String(plan._id), planName: plan.name },
  });

  return subscription;
};

// ─── Status transitions ──────────────────────────────────────────────────────

const STATUS_COPY = {
  PAUSED: {
    type: "SUBSCRIPTION_PAUSED",
    title: "Subscription paused",
    message: "Your subscription is paused. Free-order quota will not apply until it resumes.",
    icon: "⏸️",
    action: "SUBSCRIPTION_PAUSED",
  },
  ACTIVE: {
    type: "SUBSCRIPTION_RESUMED",
    title: "Subscription resumed",
    message: "Your subscription is active again and your 0% commission quota is back in effect.",
    icon: "▶️",
    action: "SUBSCRIPTION_RESUMED",
  },
  CANCELLED: {
    type: "SUBSCRIPTION_CANCELLED",
    title: "Subscription cancelled",
    message: "Your subscription has been cancelled. You have been moved to the default plan.",
    icon: "🚫",
    action: "SUBSCRIPTION_CANCELLED",
  },
};

export const setSubscriptionStatus = async ({ restaurantId, status, actor = null } = {}) => {
  const restaurant = await loadRestaurant(restaurantId);
  const normalized = String(status || "").trim().toUpperCase();

  if (!["ACTIVE", "PAUSED", "CANCELLED"].includes(normalized)) {
    throw badRequest("Status must be ACTIVE, PAUSED or CANCELLED");
  }

  const subscription = await resolveSubscription(restaurant);
  if (!subscription) throw badRequest("No subscription found for this restaurant", 404);

  const previousStatus = subscription.status;
  if (previousStatus === normalized) {
    throw badRequest(`Subscription is already ${normalized.toLowerCase()}`);
  }

  // Cancelling closes the paid plan and drops the restaurant to the fallback so
  // it keeps receiving orders under default commission terms.
  if (normalized === "CANCELLED") {
    subscription.status = "CANCELLED";
    subscription.cancelledAt = new Date();
    subscription.isCurrent = false;
    subscription.autoRenew = false;
    await subscription.save();

    const fallbackPlan = await getFallbackPlan();
    const replacement = fallbackPlan
      ? await assignPlanToRestaurant({
          restaurantId: restaurant._id,
          planId: fallbackPlan._id,
          actor,
          source: "SYSTEM",
        })
      : null;

    await recordAudit({
      admin: actor,
      action: "SUBSCRIPTION_CANCELLED",
      restaurant: restaurant._id,
      subscription: subscription._id,
      previousValue: { status: previousStatus, plan: subscription.planSnapshot?.name },
      newValue: { status: "CANCELLED", movedTo: fallbackPlan?.name || null },
      description: `Cancelled ${subscription.planSnapshot?.name || "subscription"}`,
    });

    await safeNotify({
      user: restaurant.vendor,
      restaurant: restaurant._id,
      category: "SUBSCRIPTION",
      ...STATUS_COPY.CANCELLED,
      actionLabel: "Choose a Plan",
      actionRoute: planActionRoute,
    });

    return replacement || subscription;
  }

  subscription.status = normalized;
  subscription.pausedAt = normalized === "PAUSED" ? new Date() : null;
  await subscription.save();
  await syncRestaurantPlanFields(restaurant, subscription);

  const copy = STATUS_COPY[normalized];
  await recordAudit({
    admin: actor,
    action: copy.action,
    restaurant: restaurant._id,
    subscription: subscription._id,
    previousValue: { status: previousStatus },
    newValue: { status: normalized },
    description: `Subscription ${normalized.toLowerCase()}`,
  });

  await safeNotify({
    user: restaurant.vendor,
    restaurant: restaurant._id,
    category: "SUBSCRIPTION",
    type: copy.type,
    title: copy.title,
    message: copy.message,
    icon: copy.icon,
    actionLabel: "View Subscription",
    actionRoute: planActionRoute,
  });

  return subscription;
};

// ─── Extension and renewal ───────────────────────────────────────────────────

export const extendSubscription = async ({ restaurantId, days, actor = null } = {}) => {
  const restaurant = await loadRestaurant(restaurantId);
  const extraDays = Math.round(safeNumber(days, 0));

  if (!Number.isFinite(extraDays) || extraDays < 1 || extraDays > 730) {
    throw badRequest("Extension must be between 1 and 730 days");
  }

  const subscription = await resolveSubscription(restaurant);
  if (!subscription) throw badRequest("No subscription found for this restaurant", 404);

  const previousEnd = subscription.endDate;
  // Extend from whichever is later so a lapsed plan gains the full window.
  const base = previousEnd && new Date(previousEnd) > new Date() ? new Date(previousEnd) : new Date();
  subscription.endDate = addDays(base, extraDays);
  subscription.status = subscription.status === "EXPIRED" ? "ACTIVE" : subscription.status;
  subscription.isCurrent = true;
  await subscription.save();
  await syncRestaurantPlanFields(restaurant, subscription);

  await recordAudit({
    admin: actor,
    action: "SUBSCRIPTION_EXTENDED",
    restaurant: restaurant._id,
    subscription: subscription._id,
    previousValue: { endDate: previousEnd },
    newValue: { endDate: subscription.endDate, days: extraDays },
    description: `Extended subscription by ${extraDays} days`,
  });

  await safeNotify({
    user: restaurant.vendor,
    restaurant: restaurant._id,
    category: "SUBSCRIPTION",
    type: "SUBSCRIPTION_RENEWED",
    title: "Subscription extended",
    message: `Your ${subscription.planSnapshot?.name} now runs until ${new Date(
      subscription.endDate
    ).toLocaleDateString("en-IN")}.`,
    icon: "📅",
    actionLabel: "View Subscription",
    actionRoute: planActionRoute,
  });

  return subscription;
};

// ─── Quota management ────────────────────────────────────────────────────────

export const adjustBonusQuota = async ({ restaurantId, amount, actor = null } = {}) => {
  const restaurant = await loadRestaurant(restaurantId);
  const delta = Math.round(safeNumber(amount, 0));

  if (!delta || Math.abs(delta) > 100000) {
    throw badRequest("Bonus quota change must be a non-zero number up to 100000");
  }

  const subscription = await resolveSubscription(restaurant);
  if (!subscription) throw badRequest("No subscription found for this restaurant", 404);

  const previousBonus = positive(subscription.bonusFreeOrders);
  const nextBonus = Math.max(0, previousBonus + delta);

  if (nextBonus === previousBonus) {
    throw badRequest("Bonus quota is already at zero");
  }

  subscription.bonusFreeOrders = nextBonus;
  await subscription.save();

  await recordAudit({
    admin: actor,
    action: delta > 0 ? "BONUS_QUOTA_ADDED" : "BONUS_QUOTA_REMOVED",
    restaurant: restaurant._id,
    subscription: subscription._id,
    previousValue: { bonusFreeOrders: previousBonus },
    newValue: { bonusFreeOrders: nextBonus },
    description: `${delta > 0 ? "Added" : "Removed"} ${Math.abs(delta)} bonus free orders`,
  });

  await safeNotify({
    user: restaurant.vendor,
    restaurant: restaurant._id,
    category: "SUBSCRIPTION",
    type: delta > 0 ? "BONUS_QUOTA_ADDED" : "BONUS_QUOTA_REMOVED",
    title: delta > 0 ? "Bonus free orders added" : "Bonus free orders adjusted",
    message:
      delta > 0
        ? `${delta} bonus orders at 0% commission were added to this cycle. You now have ${Math.max(
            0,
            getTotalQuota(subscription) - positive(subscription.usedFreeOrders)
          )} free orders remaining.`
        : `${Math.abs(delta)} bonus orders were removed from this cycle.`,
    icon: delta > 0 ? "🎁" : "✂️",
    actionLabel: "View Subscription",
    actionRoute: planActionRoute,
  });

  return subscription;
};

export const resetQuotaUsage = async ({ restaurantId, actor = null } = {}) => {
  const restaurant = await loadRestaurant(restaurantId);
  const subscription = await resolveSubscription(restaurant);
  if (!subscription) throw badRequest("No subscription found for this restaurant", 404);

  const previousUsed = positive(subscription.usedFreeOrders);
  subscription.usedFreeOrders = 0;
  subscription.milestonesNotified = [];
  await subscription.save();

  await recordAudit({
    admin: actor,
    action: "QUOTA_RESET",
    restaurant: restaurant._id,
    subscription: subscription._id,
    previousValue: { usedFreeOrders: previousUsed },
    newValue: { usedFreeOrders: 0 },
    description: `Reset free order usage from ${previousUsed} to 0`,
  });

  await safeNotify({
    user: restaurant.vendor,
    restaurant: restaurant._id,
    category: "SUBSCRIPTION",
    type: "QUOTA_RESET",
    title: "Free order quota reset",
    message: `Your free order usage has been reset. You have ${getTotalQuota(
      subscription
    )} orders at 0% commission this cycle.`,
    icon: "🔄",
    actionLabel: "View Subscription",
    actionRoute: planActionRoute,
  });

  return subscription;
};

// ─── Commission override ─────────────────────────────────────────────────────

export const setCommissionOverride = async ({ restaurantId, rate, actor = null } = {}) => {
  const restaurant = await loadRestaurant(restaurantId);
  const subscription = await resolveSubscription(restaurant);
  if (!subscription) throw badRequest("No subscription found for this restaurant", 404);

  const clearing = rate === null || rate === undefined || rate === "";
  const parsed = clearing ? null : safeNumber(rate, Number.NaN);

  if (!clearing && (!Number.isFinite(parsed) || parsed < 0 || parsed > 100)) {
    throw badRequest("Commission must be between 0 and 100");
  }

  const previousRate = getEffectiveCommissionRate(subscription);
  subscription.commissionRateOverride = clearing ? null : parsed;
  await subscription.save();

  const newRate = getEffectiveCommissionRate(subscription);

  await recordAudit({
    admin: actor,
    action: clearing ? "COMMISSION_OVERRIDE_CLEARED" : "COMMISSION_OVERRIDDEN",
    restaurant: restaurant._id,
    subscription: subscription._id,
    previousValue: { commissionRate: previousRate },
    newValue: { commissionRate: newRate, override: subscription.commissionRateOverride },
    description: clearing
      ? `Cleared commission override, back to plan rate ${newRate}%`
      : `Set custom commission to ${parsed}%`,
  });

  await safeNotify({
    user: restaurant.vendor,
    restaurant: restaurant._id,
    category: "SUBSCRIPTION",
    type: "COMMISSION_UPDATED",
    title: "Commission rate updated",
    message: `Your commission rate after the free quota is now ${newRate}%.`,
    icon: "📝",
    actionLabel: "View Subscription",
    actionRoute: planActionRoute,
  });

  return subscription;
};

// ─── Payments ────────────────────────────────────────────────────────────────

/**
 * Records a subscription payment attempt.
 *
 * Real gateway callbacks should route through here after signature
 * verification: passing a `reference` makes the write idempotent, so a repeated
 * webhook for the same transaction will not double-record or re-notify.
 */
export const recordSubscriptionPayment = async ({
  restaurantId,
  amount,
  status = "PAID",
  provider = "MANUAL",
  reference = "",
  note = "",
  actor = null,
} = {}) => {
  const restaurant = await loadRestaurant(restaurantId);
  const normalizedStatus = String(status || "").trim().toUpperCase();

  if (!["PAID", "PENDING", "FAILED", "WAIVED", "REFUNDED"].includes(normalizedStatus)) {
    throw badRequest("Invalid payment status");
  }

  const subscription = await resolveSubscription(restaurant);
  if (!subscription) throw badRequest("No subscription found for this restaurant", 404);

  const cleanReference = String(reference || "").trim().slice(0, 120);
  if (
    cleanReference &&
    (subscription.paymentHistory || []).some((entry) => entry.reference === cleanReference)
  ) {
    // Duplicate gateway callback — already applied.
    return subscription;
  }

  const previousStatus = subscription.paymentStatus;
  const paidAmount = positive(amount, positive(subscription.planSnapshot?.price));

  subscription.paymentHistory.push({
    amount: paidAmount,
    status: normalizedStatus,
    provider: String(provider || "MANUAL").slice(0, 40),
    reference: cleanReference,
    note: String(note || "").slice(0, 240),
    recordedBy: actor?._id || null,
    recordedAt: new Date(),
  });

  subscription.paymentStatus = normalizedStatus;
  subscription.paymentProvider = String(provider || "MANUAL").slice(0, 40);
  subscription.paymentReference = cleanReference;

  if (normalizedStatus === "PAID") {
    subscription.lastPaymentAt = new Date();
    if (subscription.status === "PENDING_PAYMENT") subscription.status = "ACTIVE";
  }

  await subscription.save();
  await syncRestaurantPlanFields(restaurant, subscription);

  await recordAudit({
    admin: actor,
    action: "PAYMENT_RECORDED",
    restaurant: restaurant._id,
    subscription: subscription._id,
    previousValue: { paymentStatus: previousStatus },
    newValue: { paymentStatus: normalizedStatus, amount: paidAmount, reference: cleanReference },
    description: `Recorded ${normalizedStatus} payment of ${paidAmount}`,
  });

  await safeNotify({
    user: restaurant.vendor,
    restaurant: restaurant._id,
    category: "PAYMENT",
    type: normalizedStatus === "FAILED" ? "PAYMENT_FAILED" : "PAYMENT_RECORDED",
    title: normalizedStatus === "FAILED" ? "Subscription payment failed" : "Payment recorded",
    message:
      normalizedStatus === "FAILED"
        ? "We could not process your subscription payment. Please retry to keep your current benefits."
        : `A payment of Rs ${paidAmount} was recorded for your ${subscription.planSnapshot?.name}.`,
    icon: normalizedStatus === "FAILED" ? "❌" : "💳",
    actionLabel: normalizedStatus === "FAILED" ? "Retry Payment" : "View Subscription",
    actionRoute: planActionRoute,
  });

  return subscription;
};

// ─── Scheduled maintenance ───────────────────────────────────────────────────

/**
 * Daily job: warns restaurants whose plan is about to lapse and expires the
 * ones that already have. Each warning step fires at most once.
 */
export const runSubscriptionMaintenance = async () => {
  const now = new Date();
  const horizon = addDays(now, Math.max(...EXPIRY_NOTICE_DAYS));
  let warned = 0;
  let expired = 0;

  const expiring = await RestaurantSubscription.find({
    isCurrent: true,
    status: { $in: ["ACTIVE", "PENDING_PAYMENT"] },
    endDate: { $ne: null, $gt: now, $lte: horizon },
  }).limit(1000);

  for (const subscription of expiring) {
    const remaining = Math.max(0, daysBetween(now, subscription.endDate));
    const step = EXPIRY_NOTICE_DAYS.find((day) => remaining <= day);
    if (!step) continue;

    const key = `EXPIRY_${step}`;
    if ((subscription.expiryNoticesSent || []).includes(key)) continue;

    subscription.expiryNoticesSent.push(key);
    await subscription.save();
    warned += 1;

    await safeNotify({
      user: subscription.vendor,
      restaurant: subscription.restaurant,
      category: "SUBSCRIPTION",
      type: "SUBSCRIPTION_EXPIRING",
      title: "Subscription expiring soon",
      message: `Your ${subscription.planSnapshot?.name} expires in ${remaining} day${
        remaining === 1 ? "" : "s"
      }. Renew now to continue receiving 0% commission orders.`,
      icon: "⏳",
      actionLabel: "Renew Plan",
      actionRoute: planActionRoute,
      meta: { daysRemaining: remaining },
      dedupeKey: `expiring:${subscription._id}:${subscription.cycleId}:${step}`,
    });
  }

  // resolveSubscription performs the actual expiry transition and fallback move.
  const lapsed = await RestaurantSubscription.find({
    isCurrent: true,
    status: { $in: ["ACTIVE", "PENDING_PAYMENT"] },
    endDate: { $ne: null, $lte: now },
  })
    .select("restaurant")
    .limit(1000);

  for (const entry of lapsed) {
    try {
      await resolveSubscription(entry.restaurant);
      expired += 1;
    } catch (error) {
      console.error(`Subscription expiry failed for ${entry.restaurant}:`, error.message);
    }
  }

  return { warned, expired };
};

// ─── Analytics ───────────────────────────────────────────────────────────────

/**
 * Aggregated subscription health for the admin dashboard: MRR, commission
 * revenue, per-plan distribution, and the restaurants that need attention.
 */
export const getSubscriptionAnalytics = async ({ from, to, planId, status } = {}) => {
  const now = new Date();
  const rangeStart = from ? new Date(from) : addDays(now, -30);
  const rangeEnd = to ? new Date(to) : now;

  const subscriptionQuery = { isCurrent: true };
  if (planId && mongoose.isValidObjectId(planId)) subscriptionQuery.plan = planId;
  if (status) subscriptionQuery.status = String(status).toUpperCase();

  const [plans, subscriptions, orderStats, upgradeCounts] = await Promise.all([
    SubscriptionPlan.find({ isArchived: false }).sort({ displayOrder: 1, price: 1 }),
    RestaurantSubscription.find(subscriptionQuery).populate("restaurant", "name isActive"),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
          status: { $in: COMMISSIONABLE_ORDER_STATUSES },
        },
      },
      {
        $group: {
          _id: "$subscriptionPlan",
          commission: { $sum: "$commissionAmount" },
          orders: { $sum: 1 },
          freeOrders: { $sum: { $cond: ["$freeOrderApplied", 1, 0] } },
          gross: { $sum: "$grandTotal" },
        },
      },
    ]),
    RestaurantSubscription.aggregate([
      { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd }, source: { $ne: "SYSTEM" } } },
      { $group: { _id: "$planSnapshot.slug", count: { $sum: 1 } } },
    ]),
  ]);

  const commissionByPlan = new Map(
    orderStats.map((row) => [String(row._id || ""), row])
  );

  const activeSubscriptions = subscriptions.filter((sub) => sub.status === "ACTIVE");

  const planRows = plans.map((plan) => {
    const planSubs = subscriptions.filter((sub) => String(sub.plan) === String(plan._id));
    const activeCount = planSubs.filter((sub) => sub.status === "ACTIVE").length;
    const stats = commissionByPlan.get(String(plan._id)) || {};

    return {
      _id: plan._id,
      name: plan.name,
      slug: plan.slug,
      price: plan.price,
      commissionRate: plan.commissionRate,
      freeOrderQuota: plan.freeOrderQuota,
      isActive: plan.isActive,
      badge: plan.badge,
      restaurantCount: planSubs.length,
      activeCount,
      // Recurring revenue from restaurants currently paying for this plan.
      monthlyRevenue: activeCount * positive(plan.price),
      commissionRevenue: Math.round(stats.commission || 0),
      orders: stats.orders || 0,
      freeOrders: stats.freeOrders || 0,
      grossOrderValue: Math.round(stats.gross || 0),
    };
  });

  const totalCommission = planRows.reduce((sum, row) => sum + row.commissionRevenue, 0);
  const mrr = planRows.reduce((sum, row) => sum + row.monthlyRevenue, 0);

  const nearQuota = subscriptions
    .filter((sub) => {
      const total = getTotalQuota(sub);
      if (total <= 0) return false;
      return positive(sub.usedFreeOrders) / total >= 0.8;
    })
    .map((sub) => ({
      restaurantId: sub.restaurant?._id || sub.restaurant,
      restaurantName: sub.restaurant?.name || "Restaurant",
      planName: sub.planSnapshot?.name || "",
      used: positive(sub.usedFreeOrders),
      total: getTotalQuota(sub),
      percent: Math.min(100, Math.round((positive(sub.usedFreeOrders) / getTotalQuota(sub)) * 100)),
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 25);

  const expiringSoon = subscriptions
    .filter(
      (sub) =>
        sub.endDate &&
        sub.status === "ACTIVE" &&
        new Date(sub.endDate) > now &&
        daysBetween(now, sub.endDate) <= 7
    )
    .map((sub) => ({
      restaurantId: sub.restaurant?._id || sub.restaurant,
      restaurantName: sub.restaurant?.name || "Restaurant",
      planName: sub.planSnapshot?.name || "",
      endDate: sub.endDate,
      daysRemaining: Math.max(0, daysBetween(now, sub.endDate)),
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 25);

  const expiredCount = await RestaurantSubscription.countDocuments({ status: "EXPIRED" });

  const mostPopular = [...planRows].sort((a, b) => b.activeCount - a.activeCount)[0] || null;

  return {
    range: { from: rangeStart, to: rangeEnd },
    totals: {
      activeSubscriptions: activeSubscriptions.length,
      totalSubscriptions: subscriptions.length,
      monthlyRecurringRevenue: mrr,
      commissionRevenue: totalCommission,
      totalRevenue: mrr + totalCommission,
      expiredSubscriptions: expiredCount,
      pausedSubscriptions: subscriptions.filter((sub) => sub.status === "PAUSED").length,
      restaurantsNearQuota: nearQuota.length,
      expiringSoon: expiringSoon.length,
    },
    mostPopularPlan: mostPopular ? { name: mostPopular.name, count: mostPopular.activeCount } : null,
    planRows,
    nearQuota,
    expiringSoon,
    planChanges: upgradeCounts.map((row) => ({ plan: row._id || "Unknown", count: row.count })),
  };
};
