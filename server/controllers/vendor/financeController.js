import Order from "../../models/Order.js";
import PayoutRequest from "../../models/PayoutRequest.js";
import TiffinSubscription, { TIFFIN_SUBSCRIPTION_STATUSES } from "../../models/TiffinSubscription.js";
import { getBusinessSettings } from "../../models/BusinessSettings.js";
import { getVendorNetAmount } from "../../services/pricingService.js";
import {
  getVendorRestaurant,
  parseBoolean,
  toNumber,
} from "./shared.js";

const LIVE_SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "EXPIRING_SOON"];

const safeAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const getVendorRevenueBase = (order) =>
  Math.max(
    0,
    safeAmount(order.itemTotal) -
      safeAmount(order.promoDiscount) -
      safeAmount(order.loyaltyDiscount)
  );

const serializePayout = (payout) => ({
  _id: payout._id,
  type: "DEBIT",
  amount: payout.amount,
  description: `Payout ${String(payout.status || "").toLowerCase()}`,
  date: payout.createdAt,
  status: payout.status,
  note: payout.note || "",
});

export const getVendorWallet = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(200).json({
      success: true,
      data: { balance: 0, totalEarnings: 0, pendingSettlement: 0, history: [] },
    });
  }

  const settings = await getBusinessSettings();
  const holdMs = safeAmount(settings.payoutHoldHours) * 60 * 60 * 1000;
  const releaseBefore = new Date(Date.now() - holdMs);

  const [orders, payouts] = await Promise.all([
    Order.find({ restaurant: restaurant._id, status: "DELIVERED" })
      .sort({ updatedAt: -1 })
      .limit(300)
      .lean(),
    PayoutRequest.find({ restaurant: restaurant._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  ]);

  const credits = orders.map((order) => {
    const gross = getVendorRevenueBase(order);
    const amount = getVendorNetAmount(gross, settings.commissionPercent);
    const settledAt = order.updatedAt || order.createdAt;
    return {
      _id: order._id,
      type: "CREDIT",
      amount,
      description: `Order #${String(order._id).slice(-6)} settlement`,
      date: settledAt,
      orderId: order._id,
      pending: settledAt > releaseBefore,
    };
  });

  const totalEarnings = credits.reduce((sum, item) => sum + item.amount, 0);
  const pendingSettlement = credits
    .filter((item) => item.pending)
    .reduce((sum, item) => sum + item.amount, 0);
  const releasedEarnings = totalEarnings - pendingSettlement;
  const reservedPayouts = payouts
    .filter((payout) => ["REQUESTED", "APPROVED", "PAID"].includes(payout.status))
    .reduce((sum, payout) => sum + safeAmount(payout.amount), 0);
  const balance = Math.max(0, releasedEarnings - reservedPayouts);

  const history = [...credits.slice(0, 20), ...payouts.map(serializePayout)]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 40);

  res.status(200).json({
    success: true,
    data: {
      balance,
      totalEarnings,
      pendingSettlement,
      minPayoutAmount: settings.minPayoutAmount,
      payoutHoldHours: settings.payoutHoldHours,
      commissionPercent: settings.commissionPercent,
      history,
    },
  });
};

export const requestVendorPayout = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: "Restaurant not found" });
  }

  const amount = safeAmount(req.body.amount);
  const settings = await getBusinessSettings();

  if (amount < safeAmount(settings.minPayoutAmount)) {
    return res.status(400).json({
      success: false,
      message: `Minimum payout amount is Rs ${settings.minPayoutAmount}`,
    });
  }

  const walletReq = { ...req, user: req.user };
  let walletPayload = null;
  const fakeRes = {
    status: () => fakeRes,
    json: (payload) => {
      walletPayload = payload;
      return payload;
    },
  };
  await getVendorWallet(walletReq, fakeRes);
  const balance = walletPayload?.data?.balance || 0;

  if (amount > balance) {
    return res.status(400).json({ success: false, message: "Requested amount exceeds available balance" });
  }

  const payout = await PayoutRequest.create({
    vendor: restaurant.vendor || req.user._id,
    restaurant: restaurant._id,
    amount,
    status: "REQUESTED",
    note: String(req.body.note || "").trim().slice(0, 240),
  });

  res.status(201).json({
    success: true,
    message: "Payout requested",
    data: payout,
  });
};

export const getVendorLogistics = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: "Restaurant not found" });
  }

  res.status(200).json({
    success: true,
    data: {
      location: restaurant.location || { lat: null, lng: null },
      deliveryRadiusKm: restaurant.deliveryRadiusKm,
      baseDeliveryFee: restaurant.baseDeliveryFee,
      freeDeliveryAbove: restaurant.freeDeliveryAbove,
      isSelfDelivery: restaurant.isSelfDelivery,
      extraTiers: restaurant.extraTiers || [],
    },
  });
};

export const updateVendorLogistics = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: "Restaurant not found" });
  }

  const location = req.body.location || {};
  restaurant.location = {
    lat: Number.isFinite(Number(location.lat)) ? Number(location.lat) : restaurant.location?.lat ?? null,
    lng: Number.isFinite(Number(location.lng)) ? Number(location.lng) : restaurant.location?.lng ?? null,
  };
  restaurant.deliveryRadiusKm = Math.max(1, Math.min(50, toNumber(req.body.deliveryRadiusKm ?? restaurant.deliveryRadiusKm)));
  restaurant.baseDeliveryFee = Math.max(0, Math.min(1000, toNumber(req.body.baseDeliveryFee ?? restaurant.baseDeliveryFee)));
  restaurant.freeDeliveryAbove = Math.max(0, Math.min(100000, toNumber(req.body.freeDeliveryAbove ?? restaurant.freeDeliveryAbove)));
  restaurant.isSelfDelivery = parseBoolean(req.body.isSelfDelivery, restaurant.isSelfDelivery);
  restaurant.extraTiers = Array.isArray(req.body.extraTiers)
    ? req.body.extraTiers.slice(0, 8).map((tier) => ({
        fromKm: Math.max(0, toNumber(tier.fromKm)),
        toKm: Math.max(0, toNumber(tier.toKm)),
        extraCharge: Math.max(0, toNumber(tier.extraCharge)),
      }))
    : restaurant.extraTiers || [];

  await restaurant.save();

  res.status(200).json({
    success: true,
    message: "Delivery settings updated",
    data: {
      location: restaurant.location,
      deliveryRadiusKm: restaurant.deliveryRadiusKm,
      baseDeliveryFee: restaurant.baseDeliveryFee,
      freeDeliveryAbove: restaurant.freeDeliveryAbove,
      isSelfDelivery: restaurant.isSelfDelivery,
      extraTiers: restaurant.extraTiers || [],
    },
  });
};

export const getVendorSubscriptions = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(200).json({ success: true, data: [] });
  }

  const subscriptions = await TiffinSubscription.find({
    restaurant: restaurant._id,
    status: req.query.status && TIFFIN_SUBSCRIPTION_STATUSES.includes(req.query.status)
      ? req.query.status
      : { $in: LIVE_SUBSCRIPTION_STATUSES },
  })
    .populate("customer", "name email phone")
    .sort({ updatedAt: -1 })
    .limit(100);

  res.status(200).json({ success: true, data: subscriptions });
};

export const updateVendorSubscriptionStatus = async (req, res) => {
  const restaurant = await getVendorRestaurant(req);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: "Restaurant not found" });
  }

  const { status } = req.body;
  if (!TIFFIN_SUBSCRIPTION_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid subscription status" });
  }

  const subscription = await TiffinSubscription.findOneAndUpdate(
    { _id: req.params.id, restaurant: restaurant._id },
    { status },
    { new: true, runValidators: true }
  ).populate("customer", "name email phone");

  if (!subscription) {
    return res.status(404).json({ success: false, message: "Subscription not found" });
  }

  res.status(200).json({ success: true, data: subscription });
};
