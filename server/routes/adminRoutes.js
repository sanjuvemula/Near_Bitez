import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  getStats,
  getAllUsers,
  deleteUser,
  updateUserRole,
  getAllRestaurants,
  toggleRestaurantStatus,
  deleteRestaurant,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
} from "../controllers/adminController.js";

const router = express.Router();

// All admin routes require login + admin role
router.use(protect, authorize("admin"));

// Stats
router.get("/stats", getStats);

// Users
router.get("/users", getAllUsers);
router.patch("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);

// Restaurants
router.get("/restaurants", getAllRestaurants);
router.patch("/restaurants/:id/toggle", toggleRestaurantStatus);
router.delete("/restaurants/:id", deleteRestaurant);

// Orders
router.get("/orders", getAllOrders);
router.patch("/orders/:id/status", updateOrderStatus);
router.delete("/orders/:id", deleteOrder);

export default router;