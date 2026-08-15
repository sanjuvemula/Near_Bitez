import Order, { ORDER_STATUSES } from "../../models/Order.js";
import { releaseOrderQuota } from "../../services/subscriptionService.js";
import {
  buildFallbackStatusTimeline,
  getVendorRestaurant,
  serializeOrder,
} from "./shared.js";

const ALLOWED_TRANSITIONS = {
  SCHEDULED: ["PLACED", "ACCEPTED", "REJECTED"],
  PLACED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["PREPARING", "REJECTED"],
  PREPARING: ["READY"],
  READY: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  REJECTED: [],
};

export const getVendorOrders = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(404).json({
      success: false,
      message: "Restaurant not found",
    });
  }

  const filters = { restaurant: restaurant._id };
  if (req.query.status && ORDER_STATUSES.includes(req.query.status)) {
    filters.status = req.query.status;
  }

  const orders = await Order.find(filters)
    .populate("customer", "name email phone")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: orders.map(serializeOrder),
  });
};

export const getVendorOrderById = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(404).json({
      success: false,
      message: "Restaurant not found",
    });
  }

  const order = await Order.findOne({
    _id: req.params.id,
    restaurant: restaurant._id,
  }).populate("customer", "name email phone");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  res.status(200).json({
    success: true,
    data: serializeOrder(order),
  });
};

export const updateVendorOrderStatus = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(404).json({
      success: false,
      message: "Restaurant not found",
    });
  }

  const nextStatus = req.body.status;
  if (!ORDER_STATUSES.includes(nextStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status",
    });
  }

  const order = await Order.findOne({
    _id: req.params.id,
    restaurant: restaurant._id,
  }).populate("customer", "name email phone");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  if (!ALLOWED_TRANSITIONS[order.status]?.includes(nextStatus)) {
    return res.status(400).json({
      success: false,
      message: `Cannot move order from ${order.status} to ${nextStatus}`,
    });
  }

  const existingTimeline =
    order.statusTimeline?.length > 0
      ? [...order.statusTimeline]
      : buildFallbackStatusTimeline(order);
  const lastEvent = existingTimeline[existingTimeline.length - 1];

  if (lastEvent?.status !== nextStatus) {
    existingTimeline.push({ status: nextStatus, changedAt: new Date() });
  }

  const wasRejected = nextStatus === "REJECTED" && order.status !== "REJECTED";

  order.status = nextStatus;
  order.statusTimeline = existingTimeline;
  await order.save();

  // A rejected order is not commissionable, so give its free-order slot back to
  // the current billing cycle.
  if (wasRejected) {
    try {
      await releaseOrderQuota(order);
    } catch (error) {
      console.error("Free order quota release failed:", error.message);
    }
  }

  const io = req.app.get("io");
  if (io && order.customer?._id) {
    const payload = {
      orderId: order._id,
      status: nextStatus,
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      updatedAt: order.updatedAt,
    };

    io.to(`customer_${order.customer._id}`).emit("order_status_update", payload);
    if (nextStatus === "OUT_FOR_DELIVERY") {
      io.to(`customer_${order.customer._id}`).emit("order:out_for_delivery", payload);
    }
  }

  res.status(200).json({
    success: true,
    message: "Order status updated",
    data: serializeOrder(order),
  });
};
