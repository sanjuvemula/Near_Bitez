import express from "express";
import {
  getFavoriteRestaurants,
  addFavoriteRestaurant,
  removeFavoriteRestaurant,
} from "../controllers/favoriteController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// All routes: customer only
router.use(protect);
router.use(authorize("customer", "admin"));

// GET    /api/v1/auth/favorites        — get all favorites
// PUT    /api/v1/auth/favorites/:id    — add favorite
// DELETE /api/v1/auth/favorites/:id    — remove favorite
router.get(  "/",    getFavoriteRestaurants);
router.put(  "/:restaurantId", addFavoriteRestaurant);
router.delete("/:restaurantId", removeFavoriteRestaurant);

export default router;



