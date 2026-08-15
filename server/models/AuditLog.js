import mongoose from "mongoose";

export const AUDIT_ACTIONS = [
  "PLAN_CREATED",
  "PLAN_UPDATED",
  "PLAN_DUPLICATED",
  "PLAN_ACTIVATED",
  "PLAN_DEACTIVATED",
  "PLAN_ARCHIVED",
  "PLAN_DELETED",
  "PLAN_REORDERED",
  "SUBSCRIPTION_ASSIGNED",
  "SUBSCRIPTION_CHANGED",
  "SUBSCRIPTION_EXTENDED",
  "SUBSCRIPTION_CANCELLED",
  "SUBSCRIPTION_PAUSED",
  "SUBSCRIPTION_RESUMED",
  "SUBSCRIPTION_RENEWED",
  "SUBSCRIPTION_EXPIRED",
  "BONUS_QUOTA_ADDED",
  "BONUS_QUOTA_REMOVED",
  "QUOTA_RESET",
  "COMMISSION_OVERRIDDEN",
  "COMMISSION_OVERRIDE_CLEARED",
  "PAYMENT_RECORDED",
];

const auditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    adminEmail: { type: String, trim: true, default: "" },
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
      index: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantSubscription",
      default: null,
    },
    // Free-form before/after payloads so any field change is auditable without
    // widening the schema per action type.
    previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    description: { type: String, trim: true, maxlength: 400, default: "" },
  },
  { timestamps: true }
);

auditLogSchema.index({ restaurant: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
