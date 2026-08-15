import mongoose from "mongoose";

// Categories power the notification panel filters (All / Unread / Subscription /
// Payments / Orders).
export const NOTIFICATION_CATEGORIES = [
  "SUBSCRIPTION",
  "PAYMENT",
  "ORDER",
  "SYSTEM",
  "PROMO",
];

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null,
      index: true,
    },
    category: {
      type: String,
      enum: NOTIFICATION_CATEGORIES,
      default: "SYSTEM",
      index: true,
    },
    // Fine-grained event key, e.g. SUBSCRIPTION_ACTIVATED, QUOTA_80.
    // Kept free-form so new events do not require a schema migration.
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    message: {
      type: String,
      trim: true,
      default: "",
      maxlength: 400,
    },
    icon: { type: String, trim: true, default: "🔔", maxlength: 8 },
    // Optional call to action rendered as a button in the panel.
    actionLabel: { type: String, trim: true, default: "", maxlength: 40 },
    actionRoute: { type: String, trim: true, default: "", maxlength: 160 },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Guards against duplicate delivery for once-per-cycle events.
    // No field-level `index: true` here — the unique partial index declared
    // below owns the `dedupeKey_1` name. Declaring both makes Mongo reject the
    // unique one as a name conflict, silently dropping the dedupe guarantee.
    dedupeKey: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, category: 1, createdAt: -1 });
// Sparse unique index: only documents that set a dedupeKey are constrained.
notificationSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $gt: "" } } }
);

export const serializeNotification = (notification) => {
  if (!notification) return null;
  const source =
    typeof notification.toObject === "function" ? notification.toObject() : notification;

  return {
    _id: source._id,
    category: source.category,
    type: source.type,
    title: source.title,
    message: source.message || "",
    icon: source.icon || "🔔",
    actionLabel: source.actionLabel || "",
    actionRoute: source.actionRoute || "",
    read: Boolean(source.read),
    readAt: source.readAt || null,
    meta: source.meta || {},
    createdAt: source.createdAt,
  };
};

export default mongoose.model("Notification", notificationSchema);
