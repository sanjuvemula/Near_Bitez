import Promo from "../../models/Promo.js";
import Restaurant from "../../models/Restaurant.js";
import { getVendorRestaurant } from "./shared.js";

// ─── Helper: get vendor's restaurant ─────────────────────────────────────────
const parseBoolean = (value) =>
  value === true || value === "true" || value === "1" || value === 1;

// ─── GET /vendor/promos ───────────────────────────────────────────────────────
export const getVendorPromos = async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    const promos = await Promo.find({ restaurant: restaurant._id }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: promos });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /vendor/promos ──────────────────────────────────────────────────────
export const createPromo = async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    const {
      code,
      discountType,
      value,
      minOrderValue,
      maxDiscount,
      validUntil,
      usageLimit,
      isGameReward,
      gameKey,
      gameRewardTier,
      gameMinScore,
      gameHoldMinutes,
    } = req.body;

    if (!code || !value || !validUntil) {
      return res.status(400).json({ success: false, message: "code, value, and validUntil are required" });
    }

    // Check duplicate code for this restaurant
    const existing = await Promo.findOne({ restaurant: restaurant._id, code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Promo code already exists for this restaurant" });
    }

    const promo = await Promo.create({
      vendor: restaurant.vendor || req.user._id,
      restaurant: restaurant._id,
      code: code.toUpperCase().trim(),
      discountType: discountType || "PERCENTAGE",
      value: Number(value),
      minOrderValue: Number(minOrderValue) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      validUntil: new Date(validUntil),
      usageLimit: usageLimit ? Number(usageLimit) : null,
      isActive: true,
      isGameReward: parseBoolean(isGameReward),
      gameKey: parseBoolean(isGameReward) ? String(gameKey || "any").trim() : "any",
      gameRewardTier: String(gameRewardTier || "PLAY").toUpperCase() === "TOP" ? "TOP" : "PLAY",
      gameMinScore: Number(gameMinScore) || 40,
      gameHoldMinutes: Math.max(1, Number(gameHoldMinutes) || 30),
    });

    return res.status(201).json({ success: true, data: promo });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Promo code already exists" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PATCH /vendor/promos/:id/status ─────────────────────────────────────────
export const togglePromoStatus = async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    const promo = await Promo.findOneAndUpdate(
      { _id: req.params.id, restaurant: restaurant._id },
      { isActive: req.body.isActive },
      { new: true }
    );

    if (!promo) {
      return res.status(404).json({ success: false, message: "Promo not found" });
    }

    return res.status(200).json({ success: true, data: promo });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE /vendor/promos/:id ────────────────────────────────────────────────
export const deletePromo = async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    const promo = await Promo.findOneAndDelete({ _id: req.params.id, restaurant: restaurant._id });
    if (!promo) {
      return res.status(404).json({ success: false, message: "Promo not found" });
    }

    return res.status(200).json({ success: true, message: "Promo deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUBLIC: GET /restaurants/:id/promos ─────────────────────────────────────
// Called from restaurant menu page to show active promos to customers
export const getRestaurantPromos = async (req, res) => {
  try {
    const now = new Date();
    const promos = await Promo.find({
      restaurant: req.params.restaurantId,
      isActive: true,
      isGameReward: { $ne: true },
      validUntil: { $gte: now },
    }).select("code discountType value minOrderValue maxDiscount validUntil usageLimit usedCount");

    return res.status(200).json({ success: true, data: promos });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUBLIC: GET /promos/featured ────────────────────────────────────────────
// Home page — show promos from active restaurants
export const getFeaturedPromos = async (req, res) => {
  try {
    const now = new Date();
    const promos = await Promo.find({
      isActive: true,
      isGameReward: { $ne: true },
      validUntil: { $gte: now },
    })
      .populate("restaurant", "name imageUrl category rating isActive")
      .sort({ createdAt: -1 })
      .limit(12);

    // Only promos from active restaurants
    const filtered = promos.filter((p) => p.restaurant?.isActive);

    return res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── VALIDATE: POST /promos/validate ─────────────────────────────────────────
// Cart page — customer applies a promo code, validate it
export const validatePromoCode = async (req, res) => {
  try {
    const { code, restaurantId, orderTotal } = req.body;

    if (!code || !restaurantId || !orderTotal) {
      return res.status(400).json({ success: false, message: "code, restaurantId, and orderTotal required" });
    }

    const now = new Date();
    const promo = await Promo.findOne({
      restaurant: restaurantId,
      code: code.toUpperCase().trim(),
      isActive: true,
      validUntil: { $gte: now },
    });

    if (!promo) {
      return res.status(404).json({ success: false, message: "Invalid or expired promo code" });
    }

    if (promo.isGameReward) {
      return res.status(403).json({ success: false, message: "Claim this reward from the games page before checkout" });
    }

    if (Number(orderTotal) < promo.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum order of ₹${promo.minOrderValue} required for this code`,
      });
    }

    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({ success: false, message: "Promo code usage limit reached" });
    }

    // Calculate discount
    let discount = 0;
    if (promo.discountType === "PERCENTAGE") {
      discount = (Number(orderTotal) * promo.value) / 100;
      if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
    } else {
      discount = promo.value;
    }
    discount = Math.min(discount, Number(orderTotal));

    return res.status(200).json({
      success: true,
      data: {
        promoId: promo._id,
        code: promo.code,
        discountType: promo.discountType,
        value: promo.value,
        discount: Math.round(discount),
        finalTotal: Math.round(Number(orderTotal) - discount),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
