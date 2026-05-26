import MenuItem from "../../models/MenuItem.js";
import Order from "../../models/Order.js";
import {
  buildStatusBreakdown,
  getVendorOverviewFallback,
  getVendorRestaurant,
  LIVE_ORDER_STATUSES,
} from "./shared.js";

export const getVendorOverview = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(200).json({
      success: true,
      data: getVendorOverviewFallback(),
    });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const trendStart = new Date();
  trendStart.setDate(trendStart.getDate() - 6);
  trendStart.setHours(0, 0, 0, 0);

  const [
    statusCounts,
    menuCounts,
    revenueSnapshot,
    todaySnapshot,
    salesTrendRaw,
    menuCategories,
    oldestLiveOrder,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { restaurant: restaurant._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    MenuItem.aggregate([
      { $match: { restaurant: restaurant._id } },
      {
        $group: {
          _id: null,
          totalMenuItems: { $sum: 1 },
          activeMenuItems: {
            $sum: { $cond: [{ $eq: ["$isAvailable", true] }, 1, 0] },
          },
        },
      },
    ]),
    Order.aggregate([
      { $match: { restaurant: restaurant._id, status: { $ne: "REJECTED" } } },
      {
        $group: {
          _id: null,
          averageOrderValue: { $avg: "$grandTotal" },
          deliveredRevenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "DELIVERED"] }, "$grandTotal", 0],
            },
          },
        },
      },
    ]),
    Order.aggregate([
      { $match: { restaurant: restaurant._id, createdAt: { $gte: todayStart } } },
      {
        $group: {
          _id: null,
          todayOrders: { $sum: 1 },
          todayRevenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "DELIVERED"] }, "$grandTotal", 0],
            },
          },
        },
      },
    ]),
    Order.aggregate([
      { $match: { restaurant: restaurant._id, createdAt: { $gte: trendStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "DELIVERED"] }, "$grandTotal", 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    MenuItem.aggregate([
      { $match: { restaurant: restaurant._id } },
      {
        $group: {
          _id: "$category",
          itemCount: { $sum: 1 },
          availableCount: {
            $sum: { $cond: [{ $eq: ["$isAvailable", true] }, 1, 0] },
          },
        },
      },
      { $sort: { itemCount: -1, _id: 1 } },
    ]),
    Order.findOne({
      restaurant: restaurant._id,
      status: { $in: LIVE_ORDER_STATUSES },
    })
      .sort({ createdAt: 1 })
      .select("createdAt"),
  ]);

  const statusBreakdown = buildStatusBreakdown(statusCounts);
  const menuSnapshot = menuCounts[0] || {};
  const revenue = revenueSnapshot[0] || {};
  const today = todaySnapshot[0] || {};
  const totalOrders = Object.values(statusBreakdown).reduce(
    (sum, count) => sum + count,
    0
  );
  const pendingOrders = LIVE_ORDER_STATUSES.reduce(
    (sum, status) => sum + (statusBreakdown[status] || 0),
    0
  );
  const completedOrders = statusBreakdown.DELIVERED || 0;
  const rejectedOrders = statusBreakdown.REJECTED || 0;
  const activeMenuItems = menuSnapshot.activeMenuItems || 0;
  const totalMenuItems = menuSnapshot.totalMenuItems || 0;
  const trendMap = new Map(salesTrendRaw.map((item) => [item._id, item]));
  const salesTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(trendStart);
    date.setDate(trendStart.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const day = trendMap.get(key);

    return {
      date: key,
      label: date.toLocaleDateString("en-IN", { weekday: "short" }),
      orders: day?.orders || 0,
      revenue: Math.round(day?.revenue || 0),
    };
  });
  const oldestLiveOrderMinutes = oldestLiveOrder?.createdAt
    ? Math.max(
        1,
        Math.round((Date.now() - oldestLiveOrder.createdAt.getTime()) / 60000)
      )
    : 0;
  const acceptanceRate = totalOrders
    ? Math.round(((totalOrders - rejectedOrders) / totalOrders) * 100)
    : 0;
  const menuLiveCoverage = totalMenuItems
    ? Math.round((activeMenuItems / totalMenuItems) * 100)
    : 0;

  res.status(200).json({
    success: true,
    data: {
      restaurant,
      stats: {
        totalOrders,
        revenue: Math.round(revenue.deliveredRevenue || 0),
        pendingOrders,
        completedOrders,
        liveOrders: pendingOrders,
        deliveredOrders: completedOrders,
        rejectedOrders,
        activeMenuItems,
        totalMenuItems,
        deliveredRevenue: Math.round(revenue.deliveredRevenue || 0),
        averageOrderValue: Math.round(revenue.averageOrderValue || 0),
        todayOrders: today.todayOrders || 0,
        todayRevenue: Math.round(today.todayRevenue || 0),
        newOrders: statusBreakdown.PLACED || 0,
        preparingOrders: statusBreakdown.PREPARING || 0,
        readyOrders: statusBreakdown.READY || 0,
        outForDeliveryOrders: statusBreakdown.OUT_FOR_DELIVERY || 0,
        acceptanceRate,
        menuLiveCoverage,
        oldestLiveOrderMinutes,
      },
      statusBreakdown,
      salesTrend,
      menuCategories: menuCategories.map((category) => ({
        _id: category._id || "Uncategorised",
        itemCount: category.itemCount,
        availableCount: category.availableCount,
      })),
    },
  });
};
