import express from "express";
import { getVendorOverview } from "../controllers/vendor/overviewController.js";
import { getVendorProfile, upsertVendorProfile } from "../controllers/vendor/restaurantController.js";
import { createMenuItem, deleteMenuItem, getMenuItems, toggleMenuItemAvailability, updateMenuItem } from "../controllers/vendor/menuController.js";
import { getVendorOrderById, getVendorOrders, updateVendorOrderStatus } from "../controllers/vendor/orderController.js";
import { authorize, protect } from "../middleware/auth.js";
import { withOptionalImageUpload } from "../middleware/upload.js";
import { getVendorChats, vendorSendMessage } from "../controllers/chatController.js";
import { getVendorReviews } from "../controllers/reviewController.js";
import { getVendorPromos, createPromo, togglePromoStatus, deletePromo } from "../controllers/vendor/promoController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("vendor", "admin"));

// Overview
router.get("/overview", getVendorOverview);

// Restaurant profile
router.get("/restaurant", getVendorProfile);
router.put("/restaurant", withOptionalImageUpload("image"), upsertVendorProfile);

// Menu
router.get("/menu", getMenuItems);
router.post("/menu", withOptionalImageUpload("image"), createMenuItem);
router.put("/menu/:id", withOptionalImageUpload("image"), updateMenuItem);
router.patch("/menu/:id/availability", toggleMenuItemAvailability);
router.delete("/menu/:id", deleteMenuItem);

// Orders
router.get("/orders", getVendorOrders);
router.get("/orders/:id", getVendorOrderById);
router.patch("/orders/:id/status", updateVendorOrderStatus);

// Reviews
router.get("/reviews", getVendorReviews);

// Chats
router.get("/chats", getVendorChats);
router.post("/chats/:chatId/message", vendorSendMessage);

// Promos — REAL DB (replaces vendorRoutes.js dummy)
router.get("/promos", getVendorPromos);
router.post("/promos", createPromo);
router.patch("/promos/:id/status", togglePromoStatus);
router.delete("/promos/:id", deletePromo);

export default router;