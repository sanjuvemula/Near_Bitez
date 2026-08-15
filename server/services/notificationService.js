import Notification, { serializeNotification } from "../models/Notification.js";

// Services run outside the request cycle (cron jobs, order hooks), so the
// Socket.IO instance is registered once at boot instead of read from `req`.
let ioRef = null;

export const registerNotificationSocket = (io) => {
  ioRef = io;
};

export const getNotificationSocket = () => ioRef;

const asText = (value, maxLength) => String(value ?? "").trim().slice(0, maxLength);

/**
 * Persists a notification and pushes it to the recipient in real time.
 *
 * `dedupeKey` makes the write idempotent: milestone and expiry notices pass a
 * key scoped to the billing cycle so repeated triggers deliver only once.
 * Returns null when the notification was suppressed as a duplicate.
 */
export const createNotification = async ({
  user,
  restaurant = null,
  category = "SYSTEM",
  type,
  title,
  message = "",
  icon = "🔔",
  actionLabel = "",
  actionRoute = "",
  meta = {},
  dedupeKey = "",
} = {}) => {
  if (!user || !type || !title) return null;

  let notification;
  try {
    notification = await Notification.create({
      user,
      restaurant,
      category,
      type: asText(type, 60),
      title: asText(title, 140),
      message: asText(message, 400),
      icon: asText(icon, 8) || "🔔",
      actionLabel: asText(actionLabel, 40),
      actionRoute: asText(actionRoute, 160),
      meta,
      dedupeKey: asText(dedupeKey, 200),
    });
  } catch (error) {
    // Duplicate dedupeKey means this event was already delivered.
    if (error?.code === 11000) return null;
    throw error;
  }

  const payload = serializeNotification(notification);

  try {
    // Reuses the `notification` socket event the client already listens on, so
    // existing toast/bell handling picks these up with no client changes.
    ioRef?.to(`vendor_${user}`).emit("notification", {
      ...payload,
      id: String(notification._id),
    });
  } catch (error) {
    console.error("Notification socket emit failed:", error.message);
  }

  return notification;
};

/** Fire-and-forget wrapper: notification failures must never break a request. */
export const safeNotify = async (payload) => {
  try {
    return await createNotification(payload);
  } catch (error) {
    console.error("Notification failed:", error.message);
    return null;
  }
};

export const getUnreadCount = (userId) =>
  Notification.countDocuments({ user: userId, read: false });
