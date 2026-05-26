import express from "express";
import {
  createReview,
  checkReview,
  getRestaurantReviews,
  getVendorReviews,
  getAllReviews,
} from "../controllers/reviewController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

// Customer routes
router.post(
  "/",
  protect,
  authorize("customer"),
  createReview
);
router.get(
  "/check/:orderId",
  protect,
  authorize("customer"),
  checkReview
);

// Public — restaurant reviews
router.get("/restaurant/:restaurantId", getRestaurantReviews);

// Vendor
router.get(
  "/vendor",
  protect,
  authorize("vendor"),
  getVendorReviews
);

// Admin
router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  getAllReviews
);

export default router;





