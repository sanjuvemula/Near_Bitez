import mongoose from "mongoose";
import Notification, {
  NOTIFICATION_CATEGORIES,
  serializeNotification,
} from "../models/Notification.js";

/**
 * Lists the caller's notifications.
 *
 * Always scoped to `req.user._id` — a user can never read another account's
 * notifications regardless of what the client sends.
 */
export const listNotifications = async (req, res) => {
  try {
    const { filter = "all", limit = 40 } = req.query;
    const query = { user: req.user._id };

    const normalized = String(filter || "all").trim().toUpperCase();
    if (normalized === "UNREAD") {
      query.read = false;
    } else if (NOTIFICATION_CATEGORIES.includes(normalized)) {
      query.category = normalized;
    }

    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 40));

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(safeLimit),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);

    res.json({
      success: true,
      data: notifications.map(serializeNotification),
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid notification id" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });

    res.json({ success: true, data: serializeNotification(notification), unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    res.json({ success: true, unreadCount: 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid notification id" });
    }

    const result = await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ success: true, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    res.json({ success: true, unreadCount: 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
