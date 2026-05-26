import Review from "../models/Review.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import { getVendorRestaurant } from "./vendor/shared.js";

// ─── Customer — submit review after delivery ──────────────────────────────────
export const createReview = async (req, res) => {
  try {
    const { orderId, rating, comment, tags = [] } = req.body;

    if (!orderId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Order ID and rating are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Check order belongs to customer and is delivered
    const order = await Order.findOne({
      _id: orderId,
      customer: req.user._id,
      status: "DELIVERED",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not yet delivered",
      });
    }

    // Check if review already exists
    const existing = await Review.findOne({ order: orderId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this order",
      });
    }

    const validTags = [
      "Fast delivery",
      "Great taste",
      "Good value",
      "Fresh food",
      "Friendly",
      "Large portion",
    ];
    const filteredTags = (tags || []).filter((t) => validTags.includes(t));

    const review = await Review.create({
      customer: req.user._id,
      restaurant: order.restaurant,
      order: orderId,
      rating: Number(rating),
      comment: comment?.trim() || "",
      tags: filteredTags,
    });

    // Recalculate restaurant average rating
    const allReviews = await Review.find({
      restaurant: order.restaurant,
      isVisible: true,
    });
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Restaurant.findByIdAndUpdate(order.restaurant, {
      rating: Math.round(avgRating * 10) / 10,
    });

    // Populate customer for response
    await review.populate("customer", "name");

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "You have already reviewed this order" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Customer — check if order already reviewed ───────────────────────────────
export const checkReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      order: req.params.orderId,
      customer: req.user._id,
    });
    res.json({ success: true, reviewed: Boolean(review), data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Public — get reviews for a restaurant ────────────────────────────────────
export const getRestaurantReviews = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const [reviews, total] = await Promise.all([
      Review.find({ restaurant: restaurantId, isVisible: true })
        .populate("customer", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Review.countDocuments({ restaurant: restaurantId, isVisible: true }),
    ]);

    // Rating breakdown
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const allRatings = await Review.find({
      restaurant: restaurantId,
      isVisible: true,
    }).select("rating");
    allRatings.forEach((r) => breakdown[r.rating]++);

    const avg =
      allRatings.length > 0
        ? allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length
        : 0;

    res.json({
      success: true,
      data: {
        reviews,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        avgRating: Math.round(avg * 10) / 10,
        breakdown,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Vendor — get all reviews for their restaurant ────────────────────────────
export const getVendorReviews = async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req);
    if (!restaurant) return res.json({ success: true, data: [] });

    const reviews = await Review.find({ restaurant: restaurant._id })
      .populate("customer", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin — get all reviews ──────────────────────────────────────────────────
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate("customer", "name email")
      .populate("restaurant", "name")
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};







