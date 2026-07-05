import mongoose from "mongoose";

export const ORDER_STATUSES = [
  "SCHEDULED",
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED",
];

const orderStatusEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    imageUrl: { type: String, default: "" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      validate: [(items) => items.length > 0, "Order must have at least one item"],
    },

    // ── Pricing breakdown ──────────────────────────────────────────────────────
    itemTotal:    { type: Number, required: true, min: 0 },
    deliveryFee:  { type: Number, required: true, min: 0 },
    platformFee:  { type: Number, required: true, min: 0 },
    gst:          { type: Number, required: true, min: 0 },

    // ── Discounts ──────────────────────────────────────────────────────────────
    promoCode:      { type: String, default: null, trim: true },
    promoDiscount:  { type: Number, default: 0, min: 0 },
    pointsRedeemed: { type: Number, default: 0, min: 0 },
    loyaltyDiscount:{ type: Number, default: 0, min: 0 },

    grandTotal: { type: Number, required: true, min: 0 },

    // Vendor monetization snapshot captured when the order is placed.
    vendorPlan: {
      type: String,
      enum: ["STARTER", "GROWTH", "PREMIUM", "PRO"],
      default: "GROWTH",
    },
    vendorPlanName: {
      type: String,
      default: "Growth Plan",
      trim: true,
    },
    vendorPlanMonthlyFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionBase: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    commissionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    vendorNetAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    freeOrderApplied: {
      type: Boolean,
      default: false,
    },
    freeOrderSequence: {
      type: Number,
      default: null,
      min: 1,
    },
    freeOrdersRemainingAfter: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Delivery ───────────────────────────────────────────────────────────────
    deliveryAddress: {
      type: String,
      required: [true, "Delivery address is required"],
      trim: true,
    },
    deliveryInstructions: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Status ─────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "PLACED",
      index: true,
    },
    statusTimeline: {
      type: [orderStatusEventSchema],
      default: () => [{ status: "PLACED", changedAt: new Date() }],
    },
    scratchUsed: {
      type: Boolean,
      default: false,
    },

    // ── Payment ────────────────────────────────────────────────────────────────
    paymentMethod: {
      type: String,
      enum: ["COD"],
      default: "COD",
    },
    scheduledFor: {
      type: Date,
      default: null },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);

