import Order from "../models/Order.js";

export const FREE_ORDER_LIMIT = 20;
export const VENDOR_PLAN_KEYS = ["GROWTH", "PREMIUM", "PRO"];
export const LEGACY_VENDOR_PLAN_KEYS = ["STARTER"];
export const ALL_VENDOR_PLAN_KEYS = [...LEGACY_VENDOR_PLAN_KEYS, ...VENDOR_PLAN_KEYS];

export const VENDOR_PLAN_CONFIGS = {
  GROWTH: {
    key: "GROWTH",
    name: "Growth Plan",
    monthlyFee: 0,
    commissionPercent: 6,
    orderLimit: null,
    recommendedFor: "Restaurants starting online orders with no fixed monthly fee",
    shortPitch: "First 20 orders free, then 6% commission per order.",
    features: [
      "First 20 orders free",
      "No monthly fee",
      "6% commission after free orders",
      "Menu, order, wallet, promo, and chat tools",
    ],
  },
  PREMIUM: {
    key: "PREMIUM",
    name: "Premium Plan",
    monthlyFee: 399,
    commissionPercent: 3,
    orderLimit: null,
    recommendedFor: "Restaurants with steady repeat orders",
    shortPitch: "Lower commission with a small monthly subscription.",
    features: [
      "First 20 orders free",
      "Rs 399 monthly subscription",
      "3% commission after free orders",
      "Better margins for growing order volume",
    ],
  },
  PRO: {
    key: "PRO",
    name: "Pro Plan",
    monthlyFee: 999,
    commissionPercent: 0,
    orderLimit: null,
    recommendedFor: "High-volume restaurants that want predictable costs",
    shortPitch: "Unlimited orders with zero commission.",
    features: [
      "Unlimited orders",
      "Rs 999 monthly subscription",
      "0% commission",
      "Best for high-volume restaurants and cloud kitchens",
    ],
  },
};

const AGGREGATOR_COMMISSION_PERCENT = 25;
const BILLABLE_ORDER_STATUSES = ["SCHEDULED", "PLACED", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];

const addOneMonth = (date = new Date()) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
};

const getMonthPeriod = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
};

const safeAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export const normalizeVendorPlanKey = (value) => {
  const key = String(value || "").trim().toUpperCase();
  if (key === "STARTER") return "GROWTH";
  return VENDOR_PLAN_KEYS.includes(key) ? key : "";
};

export const getVendorPlanConfig = (value) => {
  const key = normalizeVendorPlanKey(value) || "GROWTH";
  return VENDOR_PLAN_CONFIGS[key];
};

export const getEffectivePlanConfig = (restaurant) => {
  if (!restaurant || restaurant.planStatus === "CANCELLED") {
    return VENDOR_PLAN_CONFIGS.GROWTH;
  }

  return getVendorPlanConfig(restaurant.subscriptionPlan);
};

export const getVendorRevenueBase = (orderOrTotals = {}) =>
  Math.max(
    0,
    safeAmount(orderOrTotals.itemTotal) -
      safeAmount(orderOrTotals.promoDiscount) -
      safeAmount(orderOrTotals.loyaltyDiscount)
  );

export const getRestaurantPlanUsage = async (restaurantId, date = new Date()) => {
  if (!restaurantId) {
    return {
      periodStart: null,
      periodEnd: null,
      orderCount: 0,
      deliveredCount: 0,
      grossOrderValue: 0,
      commissionBase: 0,
      commissionCollected: 0,
      freeOrdersTotal: FREE_ORDER_LIMIT,
      freeOrdersUsed: 0,
      remainingFreeOrders: FREE_ORDER_LIMIT,
    };
  }

  const { start, end } = getMonthPeriod(date);
  const [monthly, lifetimeFreeUsage] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          restaurant: restaurantId,
          createdAt: { $gte: start, $lt: end },
          status: { $ne: "REJECTED" },
        },
      },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          deliveredCount: {
            $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] },
          },
          grossOrderValue: { $sum: "$grandTotal" },
          commissionBase: { $sum: "$commissionBase" },
          commissionCollected: { $sum: "$commissionAmount" },
        },
      },
    ]),
    Order.countDocuments({
      restaurant: restaurantId,
      status: { $in: BILLABLE_ORDER_STATUSES },
    }),
  ]);

  const snapshot = monthly[0] || {};
  const freeOrdersUsed = Math.min(FREE_ORDER_LIMIT, lifetimeFreeUsage || 0);

  return {
    periodStart: start,
    periodEnd: end,
    orderCount: snapshot.orderCount || 0,
    deliveredCount: snapshot.deliveredCount || 0,
    grossOrderValue: Math.round(snapshot.grossOrderValue || 0),
    commissionBase: Math.round(snapshot.commissionBase || 0),
    commissionCollected: Math.round(snapshot.commissionCollected || 0),
    freeOrdersTotal: FREE_ORDER_LIMIT,
    freeOrdersUsed,
    remainingFreeOrders: Math.max(0, FREE_ORDER_LIMIT - freeOrdersUsed),
  };
};

const getRecommendationKey = (usage) => {
  const value = safeAmount(usage.commissionBase || usage.grossOrderValue);
  if (usage.orderCount >= 250 || value >= 180000) return "PRO";
  if (usage.orderCount >= 40 || value >= 30000) return "PREMIUM";
  return "GROWTH";
};

const estimateMonthlyCost = (plan, grossOrderValue, remainingFreeOrders = 0, averageOrderValue = 0) => {
  const estimatedFreeValue = safeAmount(remainingFreeOrders) * safeAmount(averageOrderValue);
  const commissionableValue = Math.max(0, safeAmount(grossOrderValue) - estimatedFreeValue);
  return Math.round(plan.monthlyFee + (commissionableValue * plan.commissionPercent) / 100);
};

const buildPlanOption = (plan, usage) => {
  const averageOrderValue = usage.orderCount ? usage.grossOrderValue / usage.orderCount : 0;
  const projectedCost = estimateMonthlyCost(plan, usage.grossOrderValue, usage.remainingFreeOrders, averageOrderValue);
  const aggregatorCost = Math.round((safeAmount(usage.grossOrderValue) * AGGREGATOR_COMMISSION_PERCENT) / 100);

  return {
    ...plan,
    projectedMonthlyCost: projectedCost,
    estimatedAggregatorCost: aggregatorCost,
    estimatedSavingsVsAggregator: Math.max(0, aggregatorCost - projectedCost),
  };
};

export const buildVendorPlanPayload = async (restaurant) => {
  if (!restaurant) return null;

  const usage = await getRestaurantPlanUsage(restaurant._id);
  const currentPlan = getEffectivePlanConfig(restaurant);
  const recommendationKey = getRecommendationKey(usage);

  return {
    current: {
      ...currentPlan,
      status: restaurant.planStatus || "ACTIVE",
      activatedAt: restaurant.planActivatedAt || restaurant.createdAt,
      changedAt: restaurant.planChangedAt || restaurant.updatedAt,
      renewalDate: restaurant.planRenewalDate || null,
    },
    usage: {
      ...usage,
      usagePercent: Math.min(100, Math.round((usage.freeOrdersUsed / FREE_ORDER_LIMIT) * 100)),
      overLimit: false,
    },
    options: VENDOR_PLAN_KEYS.map((key) => buildPlanOption(VENDOR_PLAN_CONFIGS[key], usage)),
    recommendation: {
      planKey: recommendationKey,
      title:
        recommendationKey === "PRO"
          ? "Pro is the best fit for high order volume."
          : recommendationKey === "PREMIUM"
          ? "Premium can protect your margins as orders grow."
          : "Growth keeps fixed costs at zero while you validate demand.",
      reason:
        recommendationKey === "PRO"
          ? "Your projected commission can exceed the fixed Pro fee, so 0% commission is more predictable."
          : recommendationKey === "PREMIUM"
          ? "Your order volume is high enough that 3% commission can beat the free Growth plan."
          : "You still have room to use the first free orders and avoid monthly fees.",
    },
    positioning: {
      headline: "Start free, then choose the margin model that fits your restaurant.",
      subheadline:
        "NearBites tracks free orders automatically and applies the active plan to each new order.",
      pillars: [
        "First 20 orders are commission-free",
        "Growth has no monthly fee",
        "Premium lowers commission to 3%",
        "Pro gives unlimited orders at 0% commission",
      ],
    },
  };
};

export const buildOrderMonetizationSnapshot = async (restaurant, commissionBase = 0) => {
  const plan = getEffectivePlanConfig(restaurant);
  const usage = await getRestaurantPlanUsage(restaurant?._id);
  const nextOrderSequence = usage.freeOrdersUsed + 1;
  const freeOrderApplied = nextOrderSequence <= FREE_ORDER_LIMIT;
  const commissionPercent = freeOrderApplied ? 0 : plan.commissionPercent;
  const base = Math.round(safeAmount(commissionBase));
  const commissionAmount = Math.round((base * commissionPercent) / 100);

  return {
    vendorPlan: plan.key,
    vendorPlanName: plan.name,
    vendorPlanMonthlyFee: plan.monthlyFee,
    commissionBase: base,
    commissionPercent,
    commissionAmount,
    vendorNetAmount: Math.max(0, base - commissionAmount),
    freeOrderApplied,
    freeOrderSequence: nextOrderSequence,
    freeOrdersRemainingAfter: Math.max(0, FREE_ORDER_LIMIT - nextOrderSequence),
  };
};

export const applyVendorPlan = async (restaurant, planKey, overrides = {}) => {
  const normalizedPlanKey = normalizeVendorPlanKey(planKey);
  if (!normalizedPlanKey) {
    const error = new Error("Invalid restaurant plan");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const plan = getVendorPlanConfig(normalizedPlanKey);
  restaurant.subscriptionPlan = normalizedPlanKey;
  restaurant.planStatus = overrides.status || "ACTIVE";
  restaurant.planActivatedAt = restaurant.planActivatedAt || now;
  restaurant.planChangedAt = now;
  restaurant.planRenewalDate =
    overrides.renewalDate !== undefined
      ? overrides.renewalDate
      : plan.monthlyFee > 0
      ? addOneMonth(now)
      : null;
  await restaurant.save();

  return buildVendorPlanPayload(restaurant);
};
