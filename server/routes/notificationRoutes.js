import express from "express";
import { protect } from "../middleware/auth.js";
import {
  clearNotifications,
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notificationController.js";

const router = express.Router();

// Every route is scoped to the authenticated user inside the controller.
router.use(protect);

router.get("/", listNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.delete("/clear", clearNotifications);
router.delete("/:id", deleteNotification);

export default router;
