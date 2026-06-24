import Order from "../models/Order.js";

export const VENDOR_PLAN_KEYS = ["STARTER", "GROWTH", "PREMIUM"];

export const VENDOR_PLAN_CONFIGS = {
  STARTER: {
    key: "STARTER",
    name: "Starter",
    monthlyFee: 0,
    commissionPercent: 5,
    orderLimit: 100,
    recommendedFor: "New restaurants testing online orders",
    shortPitch: "Start without a fixed monthly cost.",
    features: [
      "Basic restaurant dashboard",
      "Online menu and order acceptance",
      "Customer chat",
      "Up to 100 included orders per month",
    ],
  },
  GROWTH: {
    key: "GROWTH",
    name: "Growth",
    monthlyFee: 499,
    commissionPercent: 2,
    orderLimit: 600,
    recommendedFor: "Local restaurants with repeat order volume",
    shortPitch: "Lower commission with growth tools.",
    features: [
      "Everything in Starter",
      "Marketing and promo tools",
      "Customer database access",
      "Analytics for orders and menu performance",
    ],
  },
  PREMIUM: {
    key: "PREMIUM",
    name: "Premium",
    monthlyFee: 1499,
    commissionPercent: 0,
    orderLimit: null,
    recommendedFor: "High-volume restaurants and cloud kitchens",
    shortPitch: "Zero commission with priority growth support.",
    features: [
      "Everything in Growth",
      "Unlimited orders",
      "Own-brand ordering experience",
      "Priority support and advanced insights",
    ],
  },
};

const AGGREGATOR_COMMISSION_PERCENT = 25;

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
  return VENDOR_PLAN_KEYS.includes(key) ? key : "";
};

export const getVendorPlanConfig = (value) => {
  const key = normalizeVendorPlanKey(value) || "STARTER";
  return VENDOR_PLAN_CONFIGS[key];
};

export const getEffectivePlanConfig = (restaurant) => {
  if (!restaurant || restaurant.planStatus === "CANCELLED") {
    return VENDOR_PLAN_CONFIGS.STARTER;
  }

  return getVendorPlanConfig(restaurant.subscriptionPlan);
};

export const getRestaurantPlanUsage = async (restaurantId, date = new Date()) => {
  if (!restaurantId) {
    return {
      periodStart: null,
      periodEnd: null,
      orderCount: 0,
      deliveredCount: 0,
      grossOrderValue: 0,
    };
  }

  const { start, end } = getMonthPeriod(date);
  const [snapshot] = await Order.aggregate([
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
      },
    },
  ]);

  return {
    periodStart: start,
    periodEnd: end,
    orderCount: snapshot?.orderCount || 0,
    deliveredCount: snapshot?.deliveredCount || 0,
    grossOrderValue: Math.round(snapshot?.grossOrderValue || 0),
  };
};

const getRecommendationKey = (usage) => {
  if (usage.orderCount >= 600 || usage.grossOrderValue >= 250000) {
    return "PREMIUM";
  }

  if (usage.orderCount > 100 || usage.grossOrderValue >= 50000) {
    return "GROWTH";
  }

  return "STARTER";
};

const estimateMonthlyCost = (plan, grossOrderValue) =>
  Math.round(plan.monthlyFee + (safeAmount(grossOrderValue) * plan.commissionPercent) / 100);

const buildPlanOption = (plan, usage) => {
  const projectedCost = estimateMonthlyCost(plan, usage.grossOrderValue);
  const aggregatorCost = Math.round(
    (safeAmount(usage.grossOrderValue) * AGGREGATOR_COMMISSION_PERCENT) / 100
  );

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
  const usagePercent = currentPlan.orderLimit
    ? Math.min(100, Math.round((usage.orderCount / currentPlan.orderLimit) * 100))
    : 0;

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
      usagePercent,
      remainingOrders:
        currentPlan.orderLimit === null
          ? null
          : Math.max(0, currentPlan.orderLimit - usage.orderCount),
      overLimit:
        currentPlan.orderLimit !== null && usage.orderCount > currentPlan.orderLimit,
    },
    options: VENDOR_PLAN_KEYS.map((key) => buildPlanOption(VENDOR_PLAN_CONFIGS[key], usage)),
    recommendation: {
      planKey: recommendationKey,
      title:
        recommendationKey === "PREMIUM"
          ? "Premium is the best fit for your current scale."
          : recommendationKey === "GROWTH"
          ? "Growth is the best fit as orders become regular."
          : "Starter is enough while you validate demand.",
      reason:
        recommendationKey === "PREMIUM"
          ? "Your order volume can save more with zero commission than with a low fixed plan."
          : recommendationKey === "GROWTH"
          ? "You are moving beyond starter volume, so lower commission protects margin."
          : "Your current order volume is still early-stage, so no monthly fee is practical.",
    },
    positioning: {
      headline: "Keep your customers. Use your own delivery. Pay less commission.",
      subheadline:
        "NearBites is built as restaurant software plus marketplace discovery, not a high-fee delivery aggregator.",
      pillars: [
        "Restaurants own the customer relationship",
        "Restaurants can use their own delivery staff",
        "Commission drops as a restaurant grows",
        "Promos, loyalty, analytics, and chat stay in one dashboard",
      ],
    },
  };
};

export const applyVendorPlan = async (restaurant, planKey) => {
  const normalizedPlanKey = normalizeVendorPlanKey(planKey);
  if (!normalizedPlanKey) {
    const error = new Error("Invalid restaurant plan");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  restaurant.subscriptionPlan = normalizedPlanKey;
  restaurant.planStatus = "ACTIVE";
  restaurant.planActivatedAt = restaurant.planActivatedAt || now;
  restaurant.planChangedAt = now;
  restaurant.planRenewalDate = addOneMonth(now);
  await restaurant.save();

  return buildVendorPlanPayload(restaurant);
};
