import express from "express";
import {
  createOrder,
  getMyOrderById,
  getMyOrders,
  reorder,
  getLoyaltyInfo,
  validatePromo,
  getSmartCombos,
  getActivePromos,
} from "../controllers/orderController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

// Public — active promos for flash banner (no auth needed)
router.get("/active-promos", getActivePromos);

// Protected routes
router.use(protect);
router.use(authorize("customer", "admin"));

router.get("/",                  getMyOrders);
router.post("/",                 createOrder);
router.get("/loyalty",           getLoyaltyInfo);
router.post("/validate-promo",   validatePromo);
router.get("/combo",             getSmartCombos);
router.get("/:id",               getMyOrderById);
router.post("/:id/reorder",      reorder);

export default router;



