// Add this to your existing promoRoutes.js OR create server/routes/promoRoutes.js

import express from "express";
import Promo from "../models/Promo.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// GET /api/v1/promos/active — public, returns active promos for homepage banner
router.get("/active", async (req, res) => {
  try {
    const promos = await Promo.find({
      isActive: true,
      isGameReward: { $ne: true },
      validUntil: { $gte: new Date() },
    })
      .select("code discountType value minOrderValue maxDiscount validUntil restaurant")
      .populate("restaurant", "name")
      .sort({ value: -1 })
      .limit(6)
      .lean();

    res.json({ success: true, data: promos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/promos — vendor creates promo
router.post(
  "/",
  protect,
  authorize("vendor", "admin"),
  async (req, res) => {
    try {
      const {
        code,
        discountType,
        value,
        minOrderValue,
        maxDiscount,
        validUntil,
        usageLimit,
        restaurantId,
        isGameReward,
        gameKey,
        gameRewardTier,
        gameMinScore,
        gameHoldMinutes,
      } = req.body;

      // Find vendor's restaurant
      const Restaurant = (await import("../models/Restaurant.js")).default;
      const restaurant = restaurantId
        ? await Restaurant.findById(restaurantId)
        : await Restaurant.findOne({ vendor: req.user._id });

      if (!restaurant) {
        return res.status(404).json({ success: false, message: "Restaurant not found" });
      }

      const parsedGameReward = isGameReward === true || isGameReward === "true" || isGameReward === "1";

      const promo = await Promo.create({
        vendor: req.user._id,
        restaurant: restaurant._id,
        code: String(code).toUpperCase().trim(),
        discountType: discountType || "PERCENTAGE",
        value: Number(value),
        minOrderValue: Number(minOrderValue) || 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        validUntil: new Date(validUntil),
        usageLimit: usageLimit ? Number(usageLimit) : null,
        isGameReward: parsedGameReward,
        gameKey: parsedGameReward ? String(gameKey || "any").trim() : "any",
        gameRewardTier: String(gameRewardTier || "PLAY").toUpperCase() === "TOP" ? "TOP" : "PLAY",
        gameMinScore: Number(gameMinScore) || 40,
        gameHoldMinutes: Math.max(1, Number(gameHoldMinutes) || 30),
      });

      res.status(201).json({ success: true, data: promo });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ success: false, message: "Promo code already exists for this restaurant" });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/v1/promos/vendor — vendor sees their own promos
router.get("/vendor", protect, authorize("vendor"), async (req, res) => {
  try {
    const Restaurant = (await import("../models/Restaurant.js")).default;
    const restaurant = await Restaurant.findOne({ vendor: req.user._id });
    if (!restaurant) return res.json({ success: true, data: [] });

    const promos = await Promo.find({ restaurant: restaurant._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: promos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/v1/promos/:id — vendor deletes promo
router.delete("/:id", protect, authorize("vendor", "admin"), async (req, res) => {
  try {
    await Promo.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Promo deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
