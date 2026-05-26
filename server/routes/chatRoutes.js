import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  getOrCreateChat,
  customerSendMessage,
  getVendorChats,
  vendorSendMessage,
  getOrCreateSupportChat,
  supportSendMessage,
  getAdminChats,
  adminSendMessage,
  markChatRead,
} from "../controllers/chatController.js";

const router = express.Router();

router.use(protect);

// ── Restaurant chat (customer ↔ vendor) ───────────────────────────────────────
router.get("/restaurant/:restaurantId", authorize("customer", "admin"), getOrCreateChat);
router.post("/:chatId/message", authorize("customer", "admin"), customerSendMessage);

// ── Vendor: get + send ────────────────────────────────────────────────────────
router.get("/vendor/all", authorize("vendor", "admin"), getVendorChats);
router.post("/vendor/:chatId/message", authorize("vendor", "admin"), vendorSendMessage);

// ── Support chat (customer or vendor ↔ admin) ─────────────────────────────────
router.get("/support", authorize("customer", "vendor"), getOrCreateSupportChat);
router.post("/support/:chatId/message", authorize("customer", "vendor"), supportSendMessage);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get("/admin/all", authorize("admin"), getAdminChats);
router.post("/admin/:chatId/message", authorize("admin"), adminSendMessage);

// ── Mark read ─────────────────────────────────────────────────────────────────
router.patch("/:chatId/read", markChatRead);

export default router;




