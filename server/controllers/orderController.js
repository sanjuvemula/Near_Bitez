import Cart from "../models/Cart.js";
import MenuItem from "../models/MenuItem.js";
import Order from "../models/Order.js";
import Promo from "../models/Promo.js";
import GameRewardClaim from "../models/GameRewardClaim.js";
import Restaurant from "../models/Restaurant.js";
import User from "../models/User.js";
import { getBusinessSettings } from "../models/BusinessSettings.js";
import { calculateOrderTotals } from "../services/pricingService.js";
import {
  buildOrderMonetizationSnapshot,
  getVendorRevenueBase,
} from "../services/vendorPlanService.js";

const serializeOrder = (order) => ({
  _id: order._id,
  customer: order.customer,
  restaurant: order.restaurant,
  items: order.items,
  totalItems: order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
  itemTotal: order.itemTotal,
  deliveryFee: order.deliveryFee,
  platformFee: order.platformFee,
  gst: order.gst,
  promoDiscount: order.promoDiscount || 0,
  loyaltyDiscount: order.loyaltyDiscount || 0,
  grandTotal: order.grandTotal,
  vendorPlan: order.vendorPlan,
  vendorPlanName: order.vendorPlanName,
  vendorPlanMonthlyFee: order.vendorPlanMonthlyFee,
  commissionBase: order.commissionBase,
  commissionPercent: order.commissionPercent,
  commissionAmount: order.commissionAmount,
  vendorNetAmount: order.vendorNetAmount,
  freeOrderApplied: Boolean(order.freeOrderApplied),
  freeOrderSequence: order.freeOrderSequence || null,
  freeOrdersRemainingAfter: order.freeOrdersRemainingAfter || 0,
  promoCode: order.promoCode || null,
  pointsRedeemed: order.pointsRedeemed || 0,
  deliveryAddress: order.deliveryAddress,
  deliveryInstructions: order.deliveryInstructions,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  status: order.status,
  scratchUsed: Boolean(order.scratchUsed),
  scheduledFor: order.scheduledFor || null,
  statusTimeline:
    order.statusTimeline?.length > 0
      ? order.statusTimeline
      : [{ status: order.status, changedAt: order.updatedAt || order.createdAt }],
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

// ─── Validate Promo Code ──────────────────────────────────────────────────────
export const validatePromo = async (req, res) => {
  try {
    const { code, restaurantId, orderTotal } = req.body;
    if (!code || !restaurantId || orderTotal == null) {
      return res.status(400).json({ success: false, message: "code, restaurantId, and orderTotal are required" });
    }

    const promo = await Promo.findOne({
      code: code.toUpperCase().trim(),
      restaurant: restaurantId,
      isActive: true,
      validUntil: { $gte: new Date() },
    });

    if (!promo) {
      return res.status(404).json({ success: false, message: "Invalid or expired promo code" });
    }
    if (promo.isGameReward) {
      const claim = await GameRewardClaim.findOne({
        customer: req.user._id,
        promo: promo._id,
        redeemedAt: null,
      });

      if (!claim) {
        return res.status(403).json({ success: false, message: "Play and claim this game reward before using the code" });
      }
    }
    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({ success: false, message: "This promo code has reached its usage limit" });
    }
    if (orderTotal < promo.minOrderValue) {
      return res.status(400).json({ success: false, message: `Minimum order value of ₹${promo.minOrderValue} required for this code` });
    }

    let discount = 0;
    if (promo.discountType === "PERCENTAGE") {
      discount = Math.round((orderTotal * promo.value) / 100);
      if (promo.maxDiscount !== null) discount = Math.min(discount, promo.maxDiscount);
    } else {
      discount = Math.min(promo.value, orderTotal);
    }

    return res.status(200).json({
      success: true,
      data: { promoId: promo._id, code: promo.code, discountType: promo.discountType, value: promo.value, discount, minOrderValue: promo.minOrderValue, maxDiscount: promo.maxDiscount },
    });
  } catch {
    res.status(500).json({ success: false, message: "Could not validate promo" });
  }
};

// ─── Create Order ─────────────────────────────────────────────────────────────
export const createOrder = async (req, res) => {
  try {
    const {
      deliveryAddress,
      deliveryInstructions = "",
      promoCode,
      pointsToRedeem = 0,
      scheduledFor = null,     // NEW: ISO date string for scheduled orders
      referralCode = null,     // NEW: referral code at checkout
    } = req.body;

    const cart = await Cart.findOne({ customer: req.user._id });
    if (!cart || cart.items.length === 0 || !cart.restaurant) {
      return res.status(400).json({ success: false, message: "Your cart is empty" });
    }

    const restaurant = await Restaurant.findOne({ _id: cart.restaurant, isActive: true });
    if (!restaurant) {
      return res.status(400).json({ success: false, message: "Restaurant is unavailable" });
    }

    const itemIds = cart.items.map((item) => item.menuItem);
    const menuItems = await MenuItem.find({ _id: { $in: itemIds }, restaurant: cart.restaurant }).lean();
    const menuMap = new Map(menuItems.map((item) => [String(item._id), item]));

    const orderItems = [];
    const unavailableItems = [];

    for (const cartItem of cart.items) {
      const menuItem = menuMap.get(String(cartItem.menuItem));
      if (!menuItem || !menuItem.isAvailable) { unavailableItems.push(String(cartItem.menuItem)); continue; }
      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        quantity: cartItem.quantity,
        price: menuItem.price,
        imageUrl: menuItem.imageUrl || "",
      });
    }

    if (unavailableItems.length > 0 || orderItems.length === 0) {
      return res.status(400).json({ success: false, message: "Some cart items are no longer available" });
    }

    const settings = await getBusinessSettings();
    const totals = await calculateOrderTotals(orderItems, restaurant);
    const finalAddress = deliveryAddress?.trim() || req.user.address || "";
    if (!finalAddress) {
      return res.status(400).json({ success: false, message: "Delivery address is required" });
    }

    // ── Scheduled order validation ─────────────────────────────────────────────
    let scheduledDate = null;
    if (scheduledFor) {
      if (!settings.allowScheduledOrders) {
        return res.status(400).json({ success: false, message: "Scheduled orders are currently disabled" });
      }

      scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid scheduled time" });
      }
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ success: false, message: "Scheduled time must be in the future" });
      }
      const maxAhead = new Date(Date.now() + settings.maxScheduleDays * 24 * 60 * 60 * 1000);
      if (scheduledDate > maxAhead) {
        return res.status(400).json({ success: false, message: `Cannot schedule more than ${settings.maxScheduleDays} days ahead` });
      }
    }

    // ── Promo Code Validation ──────────────────────────────────────────────────
    let promoDiscount = 0;
    let appliedPromo = null;

    if (promoCode) {
      const promo = await Promo.findOne({
        code: promoCode.toUpperCase().trim(),
        restaurant: cart.restaurant,
        isActive: true,
        validUntil: { $gte: new Date() },
      });
      if (promo && (promo.usageLimit === null || promo.usedCount < promo.usageLimit)) {
        if (promo.isGameReward) {
          const claim = await GameRewardClaim.findOne({
            customer: req.user._id,
            promo: promo._id,
            redeemedAt: null,
          });

          if (!claim) {
            return res.status(403).json({ success: false, message: "Play and claim this game reward before using the code" });
          }
        }

        if (totals.itemTotal >= promo.minOrderValue) {
          if (promo.discountType === "PERCENTAGE") {
            promoDiscount = Math.round((totals.itemTotal * promo.value) / 100);
            if (promo.maxDiscount !== null) promoDiscount = Math.min(promoDiscount, promo.maxDiscount);
          } else {
            promoDiscount = Math.min(promo.value, totals.itemTotal);
          }
          appliedPromo = promo;
        }
      }
    }

    // ── Referral Code Bonus ────────────────────────────────────────────────────
    let referralBonusApplied = false;
    if (referralCode) {
      try {
        const referrer = await User.findOne({ referralCode: referralCode.toUpperCase().trim() });
        if (referrer && String(referrer._id) !== String(req.user._id)) {
          // Check if customer hasn't used referral before
          const customer = await User.findById(req.user._id);
          if (!customer.referralUsed) {
            const referralBonus = Number(settings.referralBonusPoints || 0);
            referrer.loyaltyPoints = (referrer.loyaltyPoints || 0) + referralBonus;
            referrer.totalPointsEarned = (referrer.totalPointsEarned || 0) + referralBonus;
            await referrer.save();
            customer.loyaltyPoints = (customer.loyaltyPoints || 0) + referralBonus;
            customer.totalPointsEarned = (customer.totalPointsEarned || 0) + referralBonus;
            customer.referralUsed = true;
            await customer.save();
            referralBonusApplied = true;
          }
        }
      } catch (_) { /* silent fail */ }
    }

    // ── Loyalty Points Redemption ──────────────────────────────────────────────
    let loyaltyDiscount = 0;
    let actualPointsRedeemed = 0;
    const customer = await User.findById(req.user._id);

    if (pointsToRedeem > 0 && customer) {
      const safePoints = Math.min(pointsToRedeem, customer.loyaltyPoints);
      const maxLoyaltyDiscount = Math.floor(safePoints / 10);
      loyaltyDiscount = Math.min(maxLoyaltyDiscount, totals.grandTotal - promoDiscount - 1);
      if (loyaltyDiscount > 0) actualPointsRedeemed = loyaltyDiscount * 10;
    }

    const finalGrandTotal = Math.max(1, totals.grandTotal - promoDiscount - loyaltyDiscount);
    const monetizationSnapshot = await buildOrderMonetizationSnapshot(
      restaurant,
      getVendorRevenueBase({
        itemTotal: totals.itemTotal,
        promoDiscount,
        loyaltyDiscount,
      })
    );

    // ── Create Order Document ──────────────────────────────────────────────────
    const order = await Order.create({
      customer: req.user._id,
      restaurant: restaurant._id,
      items: orderItems,
      deliveryAddress: finalAddress,
      deliveryInstructions: deliveryInstructions.trim(),
      paymentMethod: "COD",
      // Scheduled orders start as SCHEDULED, instant ones as PLACED
      status: scheduledDate ? "SCHEDULED" : "PLACED",
      statusTimeline: [{ status: scheduledDate ? "SCHEDULED" : "PLACED", changedAt: new Date() }],
      itemTotal: totals.itemTotal,
      deliveryFee: totals.deliveryFee,
      platformFee: totals.platformFee,
      gst: totals.gst,
      promoDiscount,
      loyaltyDiscount,
      grandTotal: finalGrandTotal,
      promoCode: appliedPromo ? appliedPromo.code : null,
      pointsRedeemed: actualPointsRedeemed,
      scheduledFor: scheduledDate,
      ...monetizationSnapshot,
    });

    // ── Apply Promo Usage Count ────────────────────────────────────────────────
    if (appliedPromo) {
      await Promo.findByIdAndUpdate(appliedPromo._id, { $inc: { usedCount: 1 } });
      if (appliedPromo.isGameReward) {
        await GameRewardClaim.findOneAndUpdate(
          { customer: req.user._id, promo: appliedPromo._id, redeemedAt: null },
          { redeemedAt: new Date(), order: order._id }
        );
      }
    }

    // ── Redeem Loyalty Points ──────────────────────────────────────────────────
    if (actualPointsRedeemed > 0 && customer) {
      try { await customer.redeemPoints(actualPointsRedeemed, order._id); } catch (_) {}
    }

    // ── Award New Loyalty Points (only for instant orders) ─────────────────────
    if (!scheduledDate) {
      try {
        if (customer && customer.role === "customer") {
          await customer.awardOrderPoints(finalGrandTotal, order._id, settings.loyaltyPointsPerRupee);
        }
      } catch (_) {}
    }

    // ── Clear Cart ─────────────────────────────────────────────────────────────
    cart.items = [];
    cart.restaurant = null;
    await cart.save();

    // ── Emit Socket Notification ───────────────────────────────────────────────
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(`customer_${req.user._id}`).emit("notification", {
          type: "ORDER_PLACED",
          title: scheduledDate ? "Order Scheduled! ⏰" : "Order Placed! 🎉",
          message: scheduledDate
            ? `Your order from ${restaurant.name} is scheduled for ${new Date(scheduledDate).toLocaleString("en-IN")}.`
            : `Your order from ${restaurant.name} has been placed successfully.`,
          orderId: order._id,
          createdAt: new Date(),
        });

        // Also notify vendor
        io.to(`vendor_${restaurant.vendor}`).emit("new_order", {
          orderId: order._id,
          restaurantName: restaurant.name,
          itemCount: orderItems.length,
          grandTotal: finalGrandTotal,
          scheduled: !!scheduledDate,
          scheduledFor: scheduledDate,
        });
        io.to(`vendor_${restaurant.vendor}`).emit("notification", {
          type: "ORDER_PLACED",
          title: scheduledDate ? "New Scheduled Order ⏰" : "New Order! 🎉",
          message: `${orderItems.length} items · ₹${finalGrandTotal}`,
          orderId: order._id,
          createdAt: new Date(),
        });
      }
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: scheduledDate ? "Order scheduled successfully" : "Order placed successfully",
      data: serializeOrder(order),
      referralBonusApplied,
    });
  } catch (error) {
    console.error("createOrder error:", error);
    res.status(500).json({ success: false, message: "Unable to place order" });
  }
};

// ─── Get My Orders ────────────────────────────────────────────────────────────
export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ customer: req.user._id })
    .populate("restaurant", "name imageUrl category address deliveryTime rating isActive")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: orders.map(serializeOrder) });
};

// ─── Get Order By ID ──────────────────────────────────────────────────────────
export const getMyOrderById = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
    .populate("restaurant", "name imageUrl category address deliveryTime rating isActive");

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }
  res.status(200).json({ success: true, data: serializeOrder(order) });
};

// ─── Reorder ──────────────────────────────────────────────────────────────────
export const reorder = async (req, res) => {
  try {
    const pastOrder = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!pastOrder) return res.status(404).json({ success: false, message: "Order not found" });

    const restaurant = await Restaurant.findOne({ _id: pastOrder.restaurant, isActive: true });
    if (!restaurant) return res.status(400).json({ success: false, message: "This restaurant is currently unavailable" });

    const menuItemIds = pastOrder.items.map((i) => i.menuItem);
    const availableItems = await MenuItem.find({ _id: { $in: menuItemIds }, restaurant: pastOrder.restaurant, isAvailable: true }).lean();
    const availableIds = new Set(availableItems.map((m) => String(m._id)));

    const cartItems = pastOrder.items
      .filter((i) => availableIds.has(String(i.menuItem)))
      .map((i) => ({ menuItem: i.menuItem, quantity: i.quantity, price: i.price, name: i.name, imageUrl: i.imageUrl || "" }));

    const skippedCount = pastOrder.items.length - cartItems.length;

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "None of the items from this order are available anymore" });
    }

    let cart = await Cart.findOne({ customer: req.user._id });
    if (!cart) cart = new Cart({ customer: req.user._id });

    cart.restaurant = pastOrder.restaurant;
    cart.items = cartItems;
    await cart.save();

    res.status(200).json({
      success: true,
      message: skippedCount > 0
        ? `${cartItems.length} items added to cart (${skippedCount} unavailable items skipped)`
        : `${cartItems.length} items added to cart`,
      data: { cartItems, skippedCount },
    });
  } catch {
    res.status(500).json({ success: false, message: "Could not reorder" });
  }
};

// ─── Get Loyalty Info ─────────────────────────────────────────────────────────
export const getLoyaltyInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("loyaltyPoints loyaltyTier totalPointsEarned referralCode");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
    const tierIdx = TIERS.indexOf(user.loyaltyTier);
    const nextTier = TIERS[tierIdx + 1] || null;
    const THRESHOLDS = { BRONZE: 0, SILVER: 500, GOLD: 1500, PLATINUM: 4000 };
    const nextThreshold = nextTier ? THRESHOLDS[nextTier] : null;
    const currentThreshold = THRESHOLDS[user.loyaltyTier];
    const pointsToNext = nextTier ? nextThreshold - user.loyaltyPoints : null;
    const tierProgress = nextTier
      ? Math.min(100, Math.round(((user.loyaltyPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
      : 100;

    res.status(200).json({
      success: true,
      data: {
        points: user.loyaltyPoints,
        tier: user.loyaltyTier,
        totalPointsEarned: user.totalPointsEarned,
        discountValue: Math.floor(user.loyaltyPoints / 10),
        nextTier,
        pointsToNext,
        tierProgress,
        referralCode: user.referralCode || null,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: "Could not fetch loyalty info" });
  }
};

// ─── Smart Combo Builder ──────────────────────────────────────────────────────
// GET /api/v1/orders/combo?budget=500&restaurantId=xxx
export const getSmartCombos = async (req, res) => {
  try {
    const budget = Number(req.query.budget) || 500;
    const restaurantId = req.query.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "restaurantId is required" });
    }

    const menuItems = await MenuItem.find({
      restaurant: restaurantId,
      isAvailable: true,
      price: { $lte: budget },
    }).lean();

    if (!menuItems.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Build combos: greedy — pick highest rated item that fits, then fill remaining budget
    const sorted = menuItems.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const combos = [];

    // Combo 1: Best value (max items within budget)
    let remaining = budget;
    const valueCombo = [];
    for (const item of sorted.sort((a, b) => a.price - b.price)) {
      if (remaining >= item.price) { valueCombo.push(item); remaining -= item.price; }
      if (valueCombo.length >= 3) break;
    }
    if (valueCombo.length) {
      combos.push({
        label: "🍱 Best Value Combo",
        items: valueCombo,
        total: valueCombo.reduce((s, i) => s + i.price, 0),
        savings: budget - valueCombo.reduce((s, i) => s + i.price, 0),
      });
    }

    // Combo 2: Top rated
    remaining = budget;
    const ratedCombo = [];
    for (const item of sorted) {
      if (remaining >= item.price && !ratedCombo.find(c => c._id.equals(item._id))) {
        ratedCombo.push(item); remaining -= item.price;
      }
      if (ratedCombo.length >= 3) break;
    }
    if (ratedCombo.length) {
      combos.push({
        label: "⭐ Top Rated Combo",
        items: ratedCombo,
        total: ratedCombo.reduce((s, i) => s + i.price, 0),
        savings: budget - ratedCombo.reduce((s, i) => s + i.price, 0),
      });
    }

    // Combo 3: Mix (main + side + drink style)
    const categories = [...new Set(menuItems.map(i => i.category?.toLowerCase()).filter(Boolean))];
    if (categories.length >= 2) {
      const mixCombo = [];
      let mixBudget = budget;
      for (const cat of categories.slice(0, 3)) {
        const catItems = menuItems.filter(i => i.category?.toLowerCase() === cat && i.price <= mixBudget);
        if (catItems.length) {
          const best = catItems.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
          mixCombo.push(best);
          mixBudget -= best.price;
        }
      }
      if (mixCombo.length >= 2) {
        combos.push({
          label: "🎯 Smart Mix Combo",
          items: mixCombo,
          total: mixCombo.reduce((s, i) => s + i.price, 0),
          savings: budget - mixCombo.reduce((s, i) => s + i.price, 0),
        });
      }
    }

    res.status(200).json({ success: true, data: combos });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not build combos" });
  }
};

// ─── Get Active Promos (for flash banner) ────────────────────────────────────
export const getActivePromos = async (req, res) => {
  try {
    const promos = await Promo.find({
      isActive: true,
      isGameReward: { $ne: true },
      validUntil: { $gte: new Date() },
    })
      .select("code discountType value minOrderValue maxDiscount")
      .limit(6)
      .lean();

    res.status(200).json({ success: true, data: promos });
  } catch {
    res.status(500).json({ success: false, message: "Could not fetch promos" });
  }
};
