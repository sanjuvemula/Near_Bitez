import express from "express";
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../controllers/cartController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.use(authorize("customer", "admin"));

router.get("/", getCart);
router.post("/items", addCartItem);
router.patch("/items/:menuItemId", updateCartItem);
router.delete("/items/:menuItemId", removeCartItem);
router.delete("/", clearCart);

export default router;
