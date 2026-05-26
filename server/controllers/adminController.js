import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js";
import Order from "../models/Order.js";

// ─── Stats Overview ───────────────────────────────────────────────────────────
export const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalVendors,
      totalRestaurants,
      activeRestaurants,
      totalOrders,
      deliveredOrders,
      pendingOrders,
      revenueResult,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "vendor" }),
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: "DELIVERED" }),
      Order.countDocuments({ status: { $nin: ["DELIVERED", "REJECTED"] } }),
      Order.aggregate([
        { $match: { status: "DELIVERED" } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    // Recent signups (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: weekAgo } });
    const newOrdersThisWeek = await Order.countDocuments({ createdAt: { $gte: weekAgo } });

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, customers: totalCustomers, vendors: totalVendors, newThisWeek: newUsersThisWeek },
        restaurants: { total: totalRestaurants, active: activeRestaurants, paused: totalRestaurants - activeRestaurants },
        orders: { total: totalOrders, delivered: deliveredOrders, pending: pendingOrders, newThisWeek: newOrdersThisWeek },
        revenue: { total: totalRevenue },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (role && role !== "all") query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(query);

    res.json({ success: true, data: users, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "admin") return res.status(403).json({ success: false, message: "Cannot delete admin" });

    // Also delete their restaurant if vendor
    if (user.role === "vendor") {
      await Restaurant.deleteOne({ vendor: user._id });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["customer", "vendor", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: "-password" }
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Restaurants ──────────────────────────────────────────────────────────────
export const getAllRestaurants = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: "i" };
    if (status === "active") query.isActive = true;
    if (status === "paused") query.isActive = false;

    const restaurants = await Restaurant.find(query)
      .populate("vendor", "name email phone")
      .sort({ createdAt: -1 });

    // Attach order counts
    const ids = restaurants.map((r) => r._id);
    const orderCounts = await Order.aggregate([
      { $match: { restaurant: { $in: ids } } },
      { $group: { _id: "$restaurant", count: { $sum: 1 }, revenue: { $sum: "$grandTotal" } } },
    ]);
    const countMap = {};
    for (const o of orderCounts) countMap[String(o._id)] = { count: o.count, revenue: o.revenue };

    const data = restaurants.map((r) => ({
      ...r.toObject(),
      orderCount: countMap[String(r._id)]?.count || 0,
      totalRevenue: countMap[String(r._id)]?.revenue || 0,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    res.json({ success: true, message: "Restaurant deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const getAllOrders = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status && status !== "all") query.status = status;

    const orders = await Order.find(query)
      .populate("customer", "name email")
      .populate("restaurant", "name category")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Order.countDocuments(query);

    // Filter by search after populate
    let data = orders;
    if (search) {
      const q = search.toLowerCase();
      data = orders.filter(
        (o) =>
          o.customer?.name?.toLowerCase().includes(q) ||
          o.restaurant?.name?.toLowerCase().includes(q) ||
          o._id.toString().includes(q)
      );
    }

    res.json({ success: true, data, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["PLACED","ACCEPTED","PREPARING","READY","OUT_FOR_DELIVERY","DELIVERED","REJECTED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.status = status;
    order.statusTimeline.push({ status, changedAt: new Date() });
    await order.save();

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