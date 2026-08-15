import mongoose from "mongoose";

export const PLAN_BADGES = ["", "POPULAR", "BEST_VALUE", "RECOMMENDED", "NEW"];

export const slugifyPlanName = (value = "") =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
      maxlength: 60,
    },
    // Stable machine key derived from the name. Used by order snapshots and
    // legacy vendor plan callers that still work with string plan keys.
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      maxlength: 40,
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Plan price cannot be negative"],
      max: 1000000,
    },
    freeOrderQuota: {
      type: Number,
      required: true,
      min: [0, "Free order quota cannot be negative"],
      max: 1000000,
    },
    commissionRate: {
      type: Number,
      required: true,
      min: [0, "Commission cannot be below 0%"],
      max: [100, "Commission cannot exceed 100%"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    features: {
      type: [{ type: String, trim: true, maxlength: 120 }],
      default: [],
    },
    badge: {
      type: String,
      enum: PLAN_BADGES,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // The plan restaurants fall back to when a subscription expires or none is
    // assigned. Exactly one plan should carry this flag.
    isFallback: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Soft delete. Plans with subscription history are archived, never removed,
    // so historical snapshots keep resolving.
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    billingCycleDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 366,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

subscriptionPlanSchema.index({ isArchived: 1, isActive: 1, displayOrder: 1 });

export const serializePlan = (plan) => {
  if (!plan) return null;
  const source = typeof plan.toObject === "function" ? plan.toObject() : plan;

  return {
    _id: source._id,
    name: source.name,
    slug: source.slug,
    price: source.price,
    freeOrderQuota: source.freeOrderQuota,
    commissionRate: source.commissionRate,
    description: source.description || "",
    features: source.features || [],
    badge: source.badge || "",
    isActive: Boolean(source.isActive),
    isFallback: Boolean(source.isFallback),
    isArchived: Boolean(source.isArchived),
    displayOrder: source.displayOrder || 0,
    billingCycleDays: source.billingCycleDays || 30,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

export default mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
