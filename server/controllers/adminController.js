import GameRewardClaim from "../models/GameRewardClaim.js";
import MenuItem from "../models/MenuItem.js";
import Order, { ORDER_STATUSES } from "../models/Order.js";
import PayoutRequest, { PAYOUT_STATUSES } from "../models/PayoutRequest.js";
import Promo from "../models/Promo.js";
import Restaurant from "../models/Restaurant.js";
import TiffinSubscription, {
  TIFFIN_SUBSCRIPTION_STATUSES,
} from "../models/TiffinSubscription.js";
import User, { getTierFromPoints } from "../models/User.js";
import {
  getAdminEmails,
  getEffectiveRole,
  isAdminEmail,
} from "../utils/adminAccess.js";
import {
  applyVendorPlan,
  buildVendorPlanPayload,
  getVendorPlanConfig,
  VENDOR_PLAN_KEYS,
} from "../services/vendorPlanService.js";

const USER_ROLES = ["customer", "vendor", "admin"];
const PROMO_TYPES = ["PERCENTAGE", "FLAT"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const RESTAURANT_PLAN_STATUSES = ["ACTIVE", "PAST_DUE", "CANCELLED"];

const asBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

const asCleanString = (value, maxLength = 500) =>
  String(value ?? "").trim().slice(0, maxLength);

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const asNumber = (value, fallback = 0, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const asOptionalNumber = (value, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
};

const asDateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseCuisineType = (value) =>
  Array.isArray(value)
    ? value.map((item) => asCleanString(item, 60)).filter(Boolean)
    : String(value || "")
        .split(",")
        .map((item) => asCleanString(item, 60))
        .filter(Boolean);

const parseWeeklyMenu = (value, current = {}) => {
  if (value === undefined) return current || {};

  let source = value;
  if (typeof value === "string") {
    try {
      source = JSON.parse(value);
    } catch {
      source = {};
    }
  }

  return DAYS.reduce((menu, day) => {
    menu[day] = asCleanString(source?.[day], 240);
    return menu;
  }, {});
};

const buildRestaurantUpdate = (body, current = {}) => {
  const update = {};
  const stringFields = {
    name: 120,
    description: 500,
    address: 500,
    category: 80,
    imageUrl: 1000,
  };

  for (const [field, max] of Object.entries(stringFields)) {
    if (body[field] !== undefined) update[field] = asCleanString(body[field], max);
  }

  if (body.cuisineType !== undefined) update.cuisineType = parseCuisineType(body.cuisineType);
  if (body.deliveryTime !== undefined) update.deliveryTime = asNumber(body.deliveryTime, current.deliveryTime ?? 30, { min: 5, max: 120 });
  if (body.rating !== undefined) update.rating = asNumber(body.rating, current.rating ?? 0, { min: 0, max: 5 });
  if (body.isVegOnly !== undefined) update.isVegOnly = asBoolean(body.isVegOnly, current.isVegOnly ?? false);
  if (body.isActive !== undefined) update.isActive = asBoolean(body.isActive, current.isActive ?? true);

  if (body.locationLat !== undefined || body.locationLng !== undefined || body.location !== undefined) {
    const source = body.location || {};
    update.location = {
      lat: asOptionalNumber(body.locationLat ?? source.lat, { min: -90, max: 90 }),
      lng: asOptionalNumber(body.locationLng ?? source.lng, { min: -180, max: 180 }),
    };
  }

  if (body.deliveryRadiusKm !== undefined) update.deliveryRadiusKm = asNumber(body.deliveryRadiusKm, current.deliveryRadiusKm ?? 5, { min: 1, max: 50 });
  if (body.baseDeliveryFee !== undefined) update.baseDeliveryFee = asNumber(body.baseDeliveryFee, current.baseDeliveryFee ?? 40, { min: 0, max: 1000 });
  if (body.freeDeliveryAbove !== undefined) update.freeDeliveryAbove = asNumber(body.freeDeliveryAbove, current.freeDeliveryAbove ?? 500, { min: 0, max: 100000 });
  if (body.isSelfDelivery !== undefined) update.isSelfDelivery = asBoolean(body.isSelfDelivery, current.isSelfDelivery ?? true);

  return update;
};

const buildTiffinUpdate = (body, current = {}) => {
  const update = {};
  if (body.tiffinAvailable !== undefined) update.tiffinAvailable = asBoolean(body.tiffinAvailable, current.tiffinAvailable ?? false);
  if (body.tiffinPrice !== undefined) update.tiffinPrice = asNumber(body.tiffinPrice, current.tiffinPrice ?? 0, { min: 0, max: 100000 });
  if (body.tiffinMealType !== undefined) {
    const mealType = asCleanString(body.tiffinMealType, 20);
    if (["veg", "non-veg", "both"].includes(mealType)) update.tiffinMealType = mealType;
  }
  if (body.tiffinDescription !== undefined) update.tiffinDescription = asCleanString(body.tiffinDescription, 500);
  if (body.tiffinDeliveryType !== undefined) {
    const deliveryType = asCleanString(body.tiffinDeliveryType, 20);
    if (["delivery", "pickup", "both"].includes(deliveryType)) update.tiffinDeliveryType = deliveryType;
  }
  if (body.tiffinMealsPerDay !== undefined) update.tiffinMealsPerDay = asNumber(body.tiffinMealsPerDay, current.tiffinMealsPerDay ?? 1, { min: 1, max: 5 });
  if (body.tiffinDuration !== undefined) {
    const duration = asCleanString(body.tiffinDuration, 20);
    if (["weekly", "10days", "15days", "monthly"].includes(duration)) update.tiffinDuration = duration;
  }
  if (body.tiffinWeeklyMenu !== undefined) update.tiffinWeeklyMenu = parseWeeklyMenu(body.tiffinWeeklyMenu, current.tiffinWeeklyMenu);
  return update;
};

const emitTiffinUpdate = (req, restaurant) => {
  const io = req.app.get("io");
  if (!io || !restaurant) return;

  io.to("tiffin_subscribers").emit("tiffin_updated", {
    _id: restaurant._id,
    vendorName: restaurant.name,
    imageUrl: restaurant.imageUrl || null,
    price: restaurant.tiffinPrice || 0,
    mealType: restaurant.tiffinMealType || "veg",
    description: restaurant.tiffinDescription || "Fresh home-style meals delivered daily",
    deliveryType: restaurant.tiffinDeliveryType || "delivery",
    mealsPerDay: restaurant.tiffinMealsPerDay || 1,
    duration: restaurant.tiffinDuration || "monthly",
    rating: restaurant.rating || null,
    address: restaurant.address || "",
    cuisineType: restaurant.cuisineType || [],
    tiffinAvailable: restaurant.tiffinAvailable || false,
    weeklyMenu: restaurant.tiffinWeeklyMenu || {},
  });
};

const buildMenuUpdate = (body, current = {}) => {
  const update = {};
  if (body.name !== undefined) update.name = asCleanString(body.name, 120);
  if (body.description !== undefined) update.description = asCleanString(body.description, 500);
  if (body.category !== undefined) update.category = asCleanString(body.category, 80);
  if (body.price !== undefined) update.price = asNumber(body.price, current.price ?? 1, { min: 1, max: 100000 });
  if (body.imageUrl !== undefined) update.imageUrl = asCleanString(body.imageUrl, 1000);
  if (body.isVeg !== undefined) update.isVeg = asBoolean(body.isVeg, current.isVeg ?? true);
  if (body.isAvailable !== undefined) update.isAvailable = asBoolean(body.isAvailable, current.isAvailable ?? true);
  return update;
};

const getRestaurantForPromo = async (restaurantId) => {
  if (!restaurantId) return null;
  return Restaurant.findById(restaurantId);
};

const buildPromoUpdate = (body, restaurant, current = {}) => {
  const update = {};
  if (restaurant) {
    update.restaurant = restaurant._id;
    update.vendor = restaurant.vendor;
  }
  if (body.code !== undefined) update.code = asCleanString(body.code, 30).toUpperCase();
  if (body.discountType !== undefined && PROMO_TYPES.includes(body.discountType)) update.discountType = body.discountType;
  if (body.value !== undefined) update.value = asNumber(body.value, current.value ?? 1, { min: 1, max: 100000 });
  if (body.minOrderValue !== undefined) update.minOrderValue = asNumber(body.minOrderValue, current.minOrderValue ?? 0, { min: 0, max: 100000 });
  if (body.maxDiscount !== undefined) update.maxDiscount = asOptionalNumber(body.maxDiscount, { min: 0, max: 100000 });
  if (body.validUntil !== undefined) {
    const validUntil = asDateOrNull(body.validUntil);
    if (validUntil) update.validUntil = validUntil;
  }
  if (body.usageLimit !== undefined) update.usageLimit = asOptionalNumber(body.usageLimit, { min: 1, max: 1000000 });
  if (body.isActive !== undefined) update.isActive = asBoolean(body.isActive, current.isActive ?? true);
  if (body.isGameReward !== undefined) update.isGameReward = asBoolean(body.isGameReward, current.isGameReward ?? false);
  if (body.gameKey !== undefined) update.gameKey = asCleanString(body.gameKey || "any", 60) || "any";
  if (body.gameRewardTier !== undefined) update.gameRewardTier = String(body.gameRewardTier).toUpperCase() === "TOP" ? "TOP" : "PLAY";
  if (body.gameMinScore !== undefined) update.gameMinScore = asNumber(body.gameMinScore, current.gameMinScore ?? 40, { min: 0, max: 100000 });
  if (body.gameHoldMinutes !== undefined) update.gameHoldMinutes = asNumber(body.gameHoldMinutes, current.gameHoldMinutes ?? 30, { min: 1, max: 10080 });
  return update;
};

const populateAdminPromo = (query) =>
  query.populate("vendor", "name email phone").populate("restaurant", "name category isActive");

const serializeAdminUser = (user) => {
  const safeUser = typeof user?.toObject === "function" ? user.toObject() : { ...(user || {}) };
  delete safeUser.password;
  delete safeUser.pointsHistory;

  return {
    ...safeUser,
    role: getEffectiveRole(safeUser) || safeUser.role,
    isSystemAdmin: isAdminEmail(safeUser.email),
  };
};

export const getStats = async (_req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const dailyKeys = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return date.toISOString().slice(0, 10);
    });

    const [
      totalUsers,
      totalCustomers,
      totalVendors,
      totalAdmins,
      totalRestaurants,
      activeRestaurants,
      tiffinProviders,
      totalMenuItems,
      activeMenuItems,
      totalOrders,
      deliveredOrders,
      pendingOrders,
      revenueResult,
      newUsersThisWeek,
      newOrdersThisWeek,
      activeCoupons,
      gameRewards,
      pendingPayouts,
      activeSubscriptions,
      orderStatusBreakdown,
      dailyOrderRevenue,
      topRestaurants,
      payoutTotals,
      recentOrders,
      recentUsers,
      recentPayouts,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "vendor" }),
      User.countDocuments({ role: "admin" }),
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ isActive: true }),
      Restaurant.countDocuments({ tiffinAvailable: true }),
      MenuItem.countDocuments(),
      MenuItem.countDocuments({ isAvailable: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: "DELIVERED" }),
      Order.countDocuments({ status: { $nin: ["DELIVERED", "REJECTED"] } }),
      Order.aggregate([
        { $match: { status: "DELIVERED" } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      Order.countDocuments({ createdAt: { $gte: weekAgo } }),
      Promo.countDocuments({ isActive: true, isGameReward: { $ne: true }, validUntil: { $gte: new Date() } }),
      Promo.countDocuments({ isActive: true, isGameReward: true, validUntil: { $gte: new Date() } }),
      PayoutRequest.countDocuments({ status: { $in: ["REQUESTED", "APPROVED"] } }),
      TiffinSubscription.countDocuments({ status: { $in: ["ACTIVE", "EXPIRING_SOON"] } }),
      Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            revenue: { $sum: "$grandTotal" },
          },
        },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: new Date(`${dailyKeys[0]}T00:00:00.000Z`) } } },
        {
          $group: {
            _id: {
              $dateToString: {
                date: "$createdAt",
                format: "%Y-%m-%d",
                timezone: "Asia/Kolkata",
              },
            },
            orders: { $sum: 1 },
            revenue: { $sum: "$grandTotal" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { status: "DELIVERED" } },
        {
          $group: {
            _id: "$restaurant",
            orders: { $sum: 1 },
            revenue: { $sum: "$grandTotal" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "restaurants",
            localField: "_id",
            foreignField: "_id",
            as: "restaurant",
          },
        },
        { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: "$restaurant.name",
            category: "$restaurant.category",
            isActive: "$restaurant.isActive",
            orders: 1,
            revenue: 1,
          },
        },
      ]),
      PayoutRequest.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
      ]),
      Order.find()
        .populate("customer", "name email phone")
        .populate("restaurant", "name category")
        .sort({ createdAt: -1 })
        .limit(6),
      User.find().select("-password").sort({ createdAt: -1 }).limit(6),
      PayoutRequest.find({ status: { $in: ["REQUESTED", "APPROVED"] } })
        .populate("vendor", "name email")
        .populate("restaurant", "name")
        .sort({ createdAt: -1 })
        .limit(6),
    ]);

    const statusMap = new Map(orderStatusBreakdown.map((item) => [item._id, item]));
    const dailyMap = new Map(dailyOrderRevenue.map((item) => [item._id, item]));
    const payoutMap = new Map(payoutTotals.map((item) => [item._id, item]));
    const openPayoutAmount = ["REQUESTED", "APPROVED"].reduce(
      (total, status) => total + (payoutMap.get(status)?.amount || 0),
      0
    );

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          vendors: totalVendors,
          admins: totalAdmins,
          newThisWeek: newUsersThisWeek,
        },
        restaurants: {
          total: totalRestaurants,
          active: activeRestaurants,
          paused: totalRestaurants - activeRestaurants,
          tiffinProviders,
        },
        menu: {
          total: totalMenuItems,
          active: activeMenuItems,
          paused: totalMenuItems - activeMenuItems,
        },
        orders: {
          total: totalOrders,
          delivered: deliveredOrders,
          pending: pendingOrders,
          newThisWeek: newOrdersThisWeek,
        },
        revenue: { total: revenueResult[0]?.total || 0 },
        growth: { newUsersThisWeek, newOrdersThisWeek },
        marketing: { activeCoupons, gameRewards },
        finance: {
          pendingPayouts,
          openPayoutAmount,
          payoutsByStatus: PAYOUT_STATUSES.map((status) => ({
            status,
            count: payoutMap.get(status)?.count || 0,
            amount: payoutMap.get(status)?.amount || 0,
          })),
        },
        tiffin: { activeSubscriptions },
        analytics: {
          orderStatuses: ORDER_STATUSES.map((status) => ({
            status,
            count: statusMap.get(status)?.count || 0,
            revenue: statusMap.get(status)?.revenue || 0,
          })),
          daily: dailyKeys.map((date) => ({
            date,
            orders: dailyMap.get(date)?.orders || 0,
            revenue: dailyMap.get(date)?.revenue || 0,
          })),
          topRestaurants,
        },
        recent: {
          orders: recentOrders,
          users: recentUsers,
          payouts: recentPayouts,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    const filters = [];
    const requestedRole = asCleanString(role, 20).toLowerCase();
    const adminEmails = getAdminEmails();

    if (requestedRole && requestedRole !== "all") {
      if (!USER_ROLES.includes(requestedRole)) {
        return res.status(400).json({ success: false, message: "Invalid role filter" });
      }

      if (requestedRole === "admin") {
        filters.push({ $or: [{ role: "admin" }, { email: { $in: adminEmails } }] });
      } else {
        filters.push({ role: requestedRole, email: { $nin: adminEmails } });
      }
    }

    const safeSearch = asCleanString(search, 100);
    if (safeSearch) {
      const pattern = escapeRegex(safeSearch);
      filters.push({
        $or: [
          { name: { $regex: pattern, $options: "i" } },
          { email: { $regex: pattern, $options: "i" } },
          { phone: { $regex: pattern, $options: "i" } },
        ],
      });
    }

    const query = filters.length ? { $and: filters } : {};
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const safePage = Math.max(1, Number(page) || 1);
    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .lean(),
      User.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    res.json({
      success: true,
      data: users.map(serializeAdminUser),
      total,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("+pointsHistory");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (req.body.role !== undefined) {
      const nextRole = asCleanString(req.body.role, 20).toLowerCase();
      if (!USER_ROLES.includes(nextRole)) {
        return res.status(400).json({ success: false, message: "Invalid role" });
      }
      if (isAdminEmail(user.email) && nextRole !== "admin") {
        return res.status(403).json({ success: false, message: "System admin access cannot be removed here" });
      }
      if (String(user._id) === String(req.user._id) && nextRole !== "admin") {
        return res.status(403).json({ success: false, message: "You cannot remove your own admin access" });
      }

      if (user.role === "vendor" && nextRole !== "vendor") {
        const ownsRestaurant = await Restaurant.exists({ vendor: user._id });
        if (ownsRestaurant) {
          return res.status(409).json({
            success: false,
            message: "Delete or transfer this vendor's restaurant before changing their role",
          });
        }
      }

      user.role = nextRole;
    }

    if (req.body.name !== undefined) {
      const nextName = asCleanString(req.body.name, 80);
      if (!nextName) return res.status(400).json({ success: false, message: "Name is required" });
      user.name = nextName;
    }
    if (req.body.phone !== undefined) user.phone = asCleanString(req.body.phone, 40);
    if (req.body.address !== undefined) user.address = asCleanString(req.body.address, 500);
    if (req.body.loyaltyPoints !== undefined) user.loyaltyPoints = asNumber(req.body.loyaltyPoints, user.loyaltyPoints, { min: 0, max: 10000000 });
    if (req.body.nearCoins !== undefined) user.nearCoins = asNumber(req.body.nearCoins, user.nearCoins, { min: 0, max: 10000000 });
    if (req.body.totalPointsEarned !== undefined) user.totalPointsEarned = asNumber(req.body.totalPointsEarned, user.totalPointsEarned, { min: 0, max: 10000000 });
    user.totalPointsEarned = Math.max(user.totalPointsEarned || 0, user.loyaltyPoints || 0);

    user.loyaltyTier = getTierFromPoints(user.loyaltyPoints);
    await user.save();

    const safe = await User.findById(user._id).select("-password").lean();
    res.json({ success: true, data: serializeAdminUser(safe) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to update user" });
  }
};

export const updateUserRole = async (req, res) => updateUser(req, res);

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (String(user._id) === String(req.user._id)) {
      return res.status(403).json({ success: false, message: "You cannot delete your own account" });
    }
    if (getEffectiveRole(user) === "admin") {
      return res.status(403).json({ success: false, message: "Cannot delete admin users" });
    }

    if (user.role === "vendor") {
      const restaurants = await Restaurant.find({ vendor: user._id }).select("_id").lean();
      const restaurantIds = restaurants.map((restaurant) => restaurant._id);
      if (restaurantIds.length) {
        await Promise.all([
          Restaurant.deleteMany({ _id: { $in: restaurantIds } }),
          MenuItem.deleteMany({ restaurant: { $in: restaurantIds } }),
          Promo.deleteMany({ restaurant: { $in: restaurantIds } }),
          TiffinSubscription.deleteMany({ restaurant: { $in: restaurantIds } }),
        ]);
      }
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllRestaurants = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }
    if (status === "active") query.isActive = true;
    if (status === "paused") query.isActive = false;
    if (status === "tiffin") query.tiffinAvailable = true;

    const restaurants = await Restaurant.find(query)
      .populate("vendor", "name email phone")
      .sort({ createdAt: -1 });

    const ids = restaurants.map((restaurant) => restaurant._id);
    const [orderCounts, menuCounts, subscriptionCounts] = await Promise.all([
      Order.aggregate([
        { $match: { restaurant: { $in: ids } } },
        {
          $group: {
            _id: "$restaurant",
            count: { $sum: 1 },
            revenue: { $sum: "$grandTotal" },
          },
        },
      ]),
      MenuItem.aggregate([
        { $match: { restaurant: { $in: ids } } },
        {
          $group: {
            _id: "$restaurant",
            count: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ["$isAvailable", true] }, 1, 0] } },
          },
        },
      ]),
      TiffinSubscription.aggregate([
        { $match: { restaurant: { $in: ids }, status: { $in: ["ACTIVE", "EXPIRING_SOON"] } } },
        { $group: { _id: "$restaurant", count: { $sum: 1 } } },
      ]),
    ]);

    const orderMap = new Map(orderCounts.map((item) => [String(item._id), item]));
    const menuMap = new Map(menuCounts.map((item) => [String(item._id), item]));
    const subscriptionMap = new Map(subscriptionCounts.map((item) => [String(item._id), item.count]));

    const data = restaurants.map((restaurant) => ({
      ...restaurant.toObject(),
      orderCount: orderMap.get(String(restaurant._id))?.count || 0,
      totalRevenue: orderMap.get(String(restaurant._id))?.revenue || 0,
      menuCount: menuMap.get(String(restaurant._id))?.count || 0,
      activeMenuCount: menuMap.get(String(restaurant._id))?.active || 0,
      activeTiffinSubscriptions: subscriptionMap.get(String(restaurant._id)) || 0,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRestaurant = async (req, res) => {
  try {
    const vendor = await User.findById(req.body.vendorId);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor user not found" });
    if (!["vendor", "admin"].includes(vendor.role)) {
      return res.status(400).json({ success: false, message: "Restaurant owner must be a vendor or admin" });
    }

    const existing = await Restaurant.findOne({ vendor: vendor._id });
    if (existing) {
      return res.status(409).json({ success: false, message: "This vendor already has a restaurant" });
    }

    const payload = {
      vendor: vendor._id,
      name: asCleanString(req.body.name, 120),
      address: asCleanString(req.body.address, 500),
      category: asCleanString(req.body.category, 80),
      ...buildRestaurantUpdate(req.body),
      ...buildTiffinUpdate(req.body),
    };

    if (!payload.name || !payload.address || !payload.category) {
      return res.status(400).json({ success: false, message: "Name, address, and category are required" });
    }

    const restaurant = await Restaurant.create(payload);
    res.status(201).json({ success: true, data: restaurant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to create restaurant" });
  }
};

export const updateRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    restaurant.set({
      ...buildRestaurantUpdate(req.body, restaurant),
      ...buildTiffinUpdate(req.body, restaurant),
    });
    await restaurant.save();

    if (Object.keys(buildTiffinUpdate(req.body, restaurant)).length) {
      emitTiffinUpdate(req, restaurant);
    }

    res.json({ success: true, data: restaurant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to update restaurant" });
  }
};

export const toggleRestaurantStatus = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();
    res.json({ success: true, data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });
    await MenuItem.deleteMany({ restaurant: restaurant._id });
    await Promo.deleteMany({ restaurant: restaurant._id });
    await TiffinSubscription.deleteMany({ restaurant: restaurant._id });
    res.json({ success: true, message: "Restaurant deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRestaurantSubscriptions = async (req, res) => {
  try {
    const { plan = "all", status = "all", search = "" } = req.query;
    const query = {};

    if (plan !== "all") {
      const normalizedPlan = String(plan || "").trim().toUpperCase();
      if (!VENDOR_PLAN_KEYS.includes(normalizedPlan)) {
        return res.status(400).json({ success: false, message: "Invalid plan filter" });
      }
      query.subscriptionPlan = normalizedPlan;
    }

    if (status !== "all") {
      const normalizedStatus = String(status || "").trim().toUpperCase();
      if (!RESTAURANT_PLAN_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({ success: false, message: "Invalid status filter" });
      }
      query.planStatus = normalizedStatus;
    }

    const safeSearch = asCleanString(search, 100);
    if (safeSearch) {
      const pattern = escapeRegex(safeSearch);
      query.$or = [
        { name: { $regex: pattern, $options: "i" } },
        { category: { $regex: pattern, $options: "i" } },
      ];
    }

    const restaurants = await Restaurant.find(query)
      .populate("vendor", "name email phone")
      .sort({ updatedAt: -1 })
      .limit(200);

    const rows = await Promise.all(
      restaurants.map(async (restaurant) => ({
        restaurant: restaurant.toObject(),
        subscription: await buildVendorPlanPayload(restaurant),
      }))
    );

    const summary = VENDOR_PLAN_KEYS.map((key) => ({
      ...getVendorPlanConfig(key),
      count: rows.filter((row) => row.subscription?.current?.key === key).length,
    }));

    res.json({ success: true, data: rows, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRestaurantSubscription = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    const planKey = req.body.plan || restaurant.subscriptionPlan;
    const status = req.body.status
      ? asCleanString(req.body.status, 20).toUpperCase()
      : restaurant.planStatus || "ACTIVE";

    if (!RESTAURANT_PLAN_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid plan status" });
    }

    const renewalDate =
      req.body.renewalDate === ""
        ? null
        : req.body.renewalDate !== undefined
        ? asDateOrNull(req.body.renewalDate)
        : undefined;

    const payload = await applyVendorPlan(restaurant, planKey, { status, renewalDate });
    await restaurant.populate("vendor", "name email phone");

    res.json({
      success: true,
      data: {
        restaurant: restaurant.toObject(),
        subscription: payload,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Unable to update restaurant subscription",
    });
  }
};

export const getAllMenuItems = async (req, res) => {
  try {
    const { restaurantId, search, availability, category } = req.query;
    const query = {};
    if (restaurantId && restaurantId !== "all") query.restaurant = restaurantId;
    if (availability === "live") query.isAvailable = true;
    if (availability === "paused") query.isAvailable = false;
    if (category && category !== "all") query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const items = await MenuItem.find(query)
      .populate({ path: "restaurant", select: "name vendor category isActive", populate: { path: "vendor", select: "name email" } })
      .sort({ updatedAt: -1 })
      .limit(200);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createMenuItem = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.body.restaurantId);
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    const payload = buildMenuUpdate(req.body);
    if (!payload.name || !payload.description || !payload.category || !payload.price) {
      return res.status(400).json({ success: false, message: "Name, description, category, and price are required" });
    }

    const item = await MenuItem.create({ restaurant: restaurant._id, ...payload });
    await item.populate("restaurant", "name category isActive");
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to create menu item" });
  }
};

export const updateMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Menu item not found" });

    if (req.body.restaurantId && String(req.body.restaurantId) !== String(item.restaurant)) {
      const restaurant = await Restaurant.findById(req.body.restaurantId);
      if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });
      item.restaurant = restaurant._id;
    }

    item.set(buildMenuUpdate(req.body, item));
    await item.save();
    await item.populate("restaurant", "name category isActive");
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to update menu item" });
  }
};

export const toggleMenuItemAvailability = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Menu item not found" });

    item.isAvailable = req.body.isAvailable === undefined ? !item.isAvailable : asBoolean(req.body.isAvailable, item.isAvailable);
    await item.save();
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to update availability" });
  }
};

export const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Menu item not found" });
    res.json({ success: true, message: "Menu item deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 75 } = req.query;
    const query = {};
    if (status && status !== "all") query.status = status;

    const safeLimit = Math.min(150, Math.max(1, Number(limit) || 75));
    const safePage = Math.max(1, Number(page) || 1);
    const orders = await Order.find(query)
      .populate("customer", "name email phone")
      .populate("restaurant", "name category vendor")
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .skip((safePage - 1) * safeLimit);

    let data = orders;
    if (search) {
      const q = search.toLowerCase();
      data = orders.filter((order) => {
        const pool = [
          order._id,
          order.customer?.name,
          order.customer?.email,
          order.customer?.phone,
          order.restaurant?.name,
          order.deliveryPhone,
          order.deliveryAddress,
          order.promoCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return pool.includes(q);
      });
    }

    const total = await Order.countDocuments(query);
    res.json({ success: true, data, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (order.status !== status) {
      order.status = status;
      order.statusTimeline.push({ status, changedAt: new Date() });
      await order.save();
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, message: "Order deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllPromos = async (req, res) => {
  try {
    const { type = "all", restaurantId, status = "all", search } = req.query;
    const query = {};
    if (type === "coupon") query.isGameReward = { $ne: true };
    if (type === "reward") query.isGameReward = true;
    if (restaurantId && restaurantId !== "all") query.restaurant = restaurantId;
    if (status === "active") {
      query.isActive = true;
      query.validUntil = { $gte: new Date() };
    }
    if (status === "disabled") query.isActive = false;
    if (status === "expired") query.validUntil = { $lt: new Date() };
    if (search) query.code = { $regex: search, $options: "i" };

    const promos = await populateAdminPromo(Promo.find(query).sort({ createdAt: -1 }).limit(200));
    res.json({ success: true, data: promos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPromo = async (req, res) => {
  try {
    const restaurant = await getRestaurantForPromo(req.body.restaurantId);
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    const payload = buildPromoUpdate(req.body, restaurant);
    if (!payload.code || !payload.value || !payload.validUntil) {
      return res.status(400).json({ success: false, message: "Code, value, and validUntil are required" });
    }

    const promo = await Promo.create({
      discountType: "PERCENTAGE",
      minOrderValue: 0,
      isActive: true,
      isGameReward: false,
      gameKey: "any",
      gameRewardTier: "PLAY",
      ...payload,
    });

    await promo.populate("vendor", "name email phone");
    await promo.populate("restaurant", "name category isActive");
    res.status(201).json({ success: true, data: promo });
  } catch (error) {
    const message = error.code === 11000 ? "Promo code already exists for this restaurant" : error.message;
    res.status(400).json({ success: false, message: message || "Unable to create promo" });
  }
};

export const updatePromo = async (req, res) => {
  try {
    const promo = await Promo.findById(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: "Promo not found" });

    const restaurant = req.body.restaurantId ? await getRestaurantForPromo(req.body.restaurantId) : null;
    if (req.body.restaurantId && !restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    promo.set(buildPromoUpdate(req.body, restaurant, promo));
    await promo.save();
    await promo.populate("vendor", "name email phone");
    await promo.populate("restaurant", "name category isActive");
    res.json({ success: true, data: promo });
  } catch (error) {
    const message = error.code === 11000 ? "Promo code already exists for this restaurant" : error.message;
    res.status(400).json({ success: false, message: message || "Unable to update promo" });
  }
};

export const togglePromoStatus = async (req, res) => {
  try {
    const promo = await Promo.findById(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: "Promo not found" });
    promo.isActive = req.body.isActive === undefined ? !promo.isActive : asBoolean(req.body.isActive, promo.isActive);
    await promo.save();
    res.json({ success: true, data: promo });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to update promo" });
  }
};

export const deletePromo = async (req, res) => {
  try {
    const promo = await Promo.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: "Promo not found" });
    await GameRewardClaim.deleteMany({ promo: promo._id });
    res.json({ success: true, message: "Promo deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllTiffins = async (req, res) => {
  try {
    const { status = "all", search } = req.query;
    const query = {};
    if (status === "available") query.tiffinAvailable = true;
    if (status === "disabled") query.tiffinAvailable = false;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { tiffinDescription: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    const restaurants = await Restaurant.find(query)
      .populate("vendor", "name email phone")
      .sort({ tiffinAvailable: -1, updatedAt: -1 });
    const ids = restaurants.map((restaurant) => restaurant._id);
    const counts = await TiffinSubscription.aggregate([
      { $match: { restaurant: { $in: ids }, status: { $in: ["ACTIVE", "EXPIRING_SOON"] } } },
      { $group: { _id: "$restaurant", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((item) => [String(item._id), item.count]));

    const data = restaurants.map((restaurant) => ({
      ...restaurant.toObject(),
      activeSubscriptions: countMap.get(String(restaurant._id)) || 0,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTiffinProvider = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    restaurant.set(buildTiffinUpdate(req.body, restaurant));
    await restaurant.save();
    emitTiffinUpdate(req, restaurant);

    res.json({ success: true, data: restaurant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to update tiffin provider" });
  }
};

export const getTiffinSubscriptions = async (req, res) => {
  try {
    const { status = "all", restaurantId, search } = req.query;
    const query = {};
    if (status !== "all" && TIFFIN_SUBSCRIPTION_STATUSES.includes(status)) query.status = status;
    if (restaurantId && restaurantId !== "all") query.restaurant = restaurantId;

    let subscriptions = await TiffinSubscription.find(query)
      .populate("customer", "name email phone")
      .populate("vendor", "name email phone")
      .populate("restaurant", "name category")
      .sort({ updatedAt: -1 })
      .limit(200);

    if (search) {
      const q = search.toLowerCase();
      subscriptions = subscriptions.filter((subscription) =>
        [subscription.customer?.name, subscription.customer?.email, subscription.restaurant?.name, subscription.planName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTiffinSubscription = async (req, res) => {
  try {
    const [customer, restaurant] = await Promise.all([
      User.findById(req.body.customerId),
      Restaurant.findById(req.body.restaurantId),
    ]);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    const subscription = await TiffinSubscription.create({
      customer: customer._id,
      vendor: restaurant.vendor,
      restaurant: restaurant._id,
      planName: asCleanString(req.body.planName || "Tiffin Plan", 120),
      price: asNumber(req.body.price, restaurant.tiffinPrice || 0, { min: 0, max: 100000 }),
      status: TIFFIN_SUBSCRIPTION_STATUSES.includes(req.body.status) ? req.body.status : "ACTIVE",
      startDate: asDateOrNull(req.body.startDate) || new Date(),
      endDate: asDateOrNull(req.body.endDate),
      nextDelivery: asDateOrNull(req.body.nextDelivery),
      isVeg: asBoolean(req.body.isVeg, restaurant.tiffinMealType !== "non-veg"),
      mealType: asCleanString(req.body.mealType || restaurant.tiffinMealType || "Standard", 80),
    });

    await subscription.populate("customer", "name email phone");
    await subscription.populate("restaurant", "name category");
    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to create subscription" });
  }
};

export const updateTiffinSubscriptionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!TIFFIN_SUBSCRIPTION_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid subscription status" });
    }

    const subscription = await TiffinSubscription.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate("customer", "name email phone")
      .populate("restaurant", "name category");

    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to update subscription" });
  }
};
