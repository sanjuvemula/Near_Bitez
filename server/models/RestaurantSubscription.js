import mongoose from "mongoose";

export const SUBSCRIPTION_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "CANCELLED",
  "EXPIRED",
  "PENDING_PAYMENT",
  // Closed out because the restaurant moved to a different plan. Kept in
  // history so past terms stay auditable.
  "SUPERSEDED",
];

export const SUBSCRIPTION_PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
  "WAIVED",
  "REFUNDED",
];

// Milestone keys are recorded per billing cycle so a restaurant is notified at
// most once per threshold per cycle.
export const QUOTA_MILESTONES = [
  { key: "QUOTA_50", percent: 50 },
  { key: "QUOTA_80", percent: 80 },
  { key: "QUOTA_90", percent: 90 },
  { key: "QUOTA_100", percent: 100 },
];

// Frozen copy of the plan taken at assignment time. Plan edits must never
// rewrite the terms a restaurant already agreed to for the running cycle.
const planSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    slug: { type: String, trim: true, default: "" },
    price: { type: Number, default: 0, min: 0 },
    freeOrderQuota: { type: Number, default: 0, min: 0 },
    commissionRate: { type: Number, default: 0, min: 0, max: 100 },
    badge: { type: String, default: "" },
    billingCycleDays: { type: Number, default: 30, min: 1 },
    features: { type: [String], default: [] },
  },
  { _id: false }
);

const cycleHistorySchema = new mongoose.Schema(
  {
    cycleId: { type: String, required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    freeOrderQuota: { type: Number, default: 0, min: 0 },
    bonusFreeOrders: { type: Number, default: 0, min: 0 },
    usedFreeOrders: { type: Number, default: 0, min: 0 },
    commissionableOrders: { type: Number, default: 0, min: 0 },
    commissionCharged: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const paymentHistorySchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: SUBSCRIPTION_PAYMENT_STATUSES, default: "PENDING" },
    provider: { type: String, trim: true, default: "MANUAL" },
    reference: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, maxlength: 240, default: "" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const restaurantSubscriptionSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
    },
    planSnapshot: {
      type: planSnapshotSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "ACTIVE",
      index: true,
    },
    // Only one subscription per restaurant is the live one. History rows keep
    // isCurrent false so past terms remain queryable.
    isCurrent: {
      type: Boolean,
      default: true,
      index: true,
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },

    // ── Billing cycle (quota resets on rollover) ────────────────────────────
    cycleId: { type: String, default: "" },
    cycleStart: { type: Date, default: Date.now },
    cycleEnd: { type: Date, default: null },

    // ── Quota ───────────────────────────────────────────────────────────────
    freeOrderQuota: { type: Number, default: 0, min: 0 },
    bonusFreeOrders: { type: Number, default: 0, min: 0 },
    usedFreeOrders: { type: Number, default: 0, min: 0 },

    // ── Commission ──────────────────────────────────────────────────────────
    commissionRate: { type: Number, default: 0, min: 0, max: 100 },
    // Admin-applied override that wins over the plan rate while set.
    commissionRateOverride: { type: Number, default: null, min: 0, max: 100 },

    // ── Payment ─────────────────────────────────────────────────────────────
    paymentStatus: {
      type: String,
      enum: SUBSCRIPTION_PAYMENT_STATUSES,
      default: "PENDING",
      index: true,
    },
    paymentProvider: { type: String, trim: true, default: "MANUAL" },
    paymentReference: { type: String, trim: true, default: "" },
    lastPaymentAt: { type: Date, default: null },
    paymentHistory: { type: [paymentHistorySchema], default: [] },
    autoRenew: { type: Boolean, default: true },

    // ── Cycle bookkeeping ───────────────────────────────────────────────────
    milestonesNotified: { type: [String], default: [] },
    expiryNoticesSent: { type: [String], default: [] },
    cycleHistory: { type: [cycleHistorySchema], default: [] },

    // ── Lifecycle metadata ──────────────────────────────────────────────────
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    source: {
      type: String,
      enum: ["ADMIN", "VENDOR", "SYSTEM"],
      default: "SYSTEM",
    },
    cancelledAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

restaurantSubscriptionSchema.index({ restaurant: 1, isCurrent: 1 });
restaurantSubscriptionSchema.index({ restaurant: 1, createdAt: -1 });
restaurantSubscriptionSchema.index({ status: 1, endDate: 1 });

restaurantSubscriptionSchema.virtual("totalFreeOrders").get(function getTotalFreeOrders() {
  return Math.max(0, (this.freeOrderQuota || 0) + (this.bonusFreeOrders || 0));
});

restaurantSubscriptionSchema.virtual("remainingFreeOrders").get(function getRemaining() {
  const total = Math.max(0, (this.freeOrderQuota || 0) + (this.bonusFreeOrders || 0));
  return Math.max(0, total - (this.usedFreeOrders || 0));
});

restaurantSubscriptionSchema.set("toObject", { virtuals: true });
restaurantSubscriptionSchema.set("toJSON", { virtuals: true });

export default mongoose.model("RestaurantSubscription", restaurantSubscriptionSchema);
