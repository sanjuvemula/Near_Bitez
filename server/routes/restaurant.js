import express from "express";
import {
  getRestaurantDiscovery,
  getRestaurantById,
  getRestaurants,
} from "../controllers/restaurantController.js";

const router = express.Router();

router.get("/discover", getRestaurantDiscovery);
router.get("/", getRestaurants);
router.get("/:id", getRestaurantById);

export default router;




