import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  createMenuItem,
  createPromo,
  createRestaurant,
  createTiffinSubscription,
  getStats,
  getAllUsers,
  deleteUser,
  updateUser,
  updateUserRole,
  getAllRestaurants,
  getRestaurantSubscriptions,
  updateRestaurant,
  updateRestaurantSubscription,
  toggleRestaurantStatus,
  deleteRestaurant,
  getAllMenuItems,
  updateMenuItem,
  toggleMenuItemAvailability,
  deleteMenuItem,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  getAllPromos,
  updatePromo,
  togglePromoStatus,
  deletePromo,
  getAllTiffins,
  updateTiffinProvider,
  getTiffinSubscriptions,
  updateTiffinSubscriptionStatus,
} from "../controllers/adminController.js";
import {
  getAdminBusinessSettings,
  getAdminPayouts,
  resetAdminBusinessSettings,
  updateAdminBusinessSettings,
  updateAdminPayoutStatus,
} from "../controllers/adminSettingsController.js";
import {
  deleteAdminFeedback,
  getAdminFeedback,
  updateAdminFeedback,
} from "../controllers/feedbackController.js";

const router = express.Router();

// All admin routes require login + admin role
router.use(protect, authorize("admin"));

// Stats
router.get("/stats", getStats);
router.get("/settings", getAdminBusinessSettings);
router.put("/settings", updateAdminBusinessSettings);
router.post("/settings/reset", resetAdminBusinessSettings);

// Payouts
router.get("/payouts", getAdminPayouts);
router.patch("/payouts/:id/status", updateAdminPayoutStatus);

// Feedback
router.get("/feedback", getAdminFeedback);
router.patch("/feedback/:id", updateAdminFeedback);
router.delete("/feedback/:id", deleteAdminFeedback);

// Users
router.get("/users", getAllUsers);
router.patch("/users/:id", updateUser);
router.patch("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);

// Restaurants
router.get("/restaurants", getAllRestaurants);
router.post("/restaurants", createRestaurant);
router.patch("/restaurants/:id", updateRestaurant);
router.patch("/restaurants/:id/toggle", toggleRestaurantStatus);
router.delete("/restaurants/:id", deleteRestaurant);

// Restaurant monetization
router.get("/subscriptions", getRestaurantSubscriptions);
router.patch("/subscriptions/:restaurantId", updateRestaurantSubscription);

// Menus
router.get("/menu", getAllMenuItems);
router.post("/menu", createMenuItem);
router.patch("/menu/:id", updateMenuItem);
router.patch("/menu/:id/availability", toggleMenuItemAvailability);
router.delete("/menu/:id", deleteMenuItem);

// Orders
router.get("/orders", getAllOrders);
router.patch("/orders/:id/status", updateOrderStatus);
router.delete("/orders/:id", deleteOrder);

// Coupons and game rewards
router.get("/promos", getAllPromos);
router.post("/promos", createPromo);
router.patch("/promos/:id", updatePromo);
router.patch("/promos/:id/status", togglePromoStatus);
router.delete("/promos/:id", deletePromo);

// Tiffin providers and subscriptions
router.get("/tiffins", getAllTiffins);
router.patch("/tiffins/:restaurantId", updateTiffinProvider);
router.get("/tiffin-subscriptions", getTiffinSubscriptions);
router.post("/tiffin-subscriptions", createTiffinSubscription);
router.patch("/tiffin-subscriptions/:id/status", updateTiffinSubscriptionStatus);

export default router;
