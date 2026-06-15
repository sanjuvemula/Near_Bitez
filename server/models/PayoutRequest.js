import mongoose from "mongoose";

export const PAYOUT_STATUSES = ["REQUESTED", "APPROVED", "PAID", "REJECTED"];

const payoutRequestSchema = new mongoose.Schema(
  {
    vendor: {
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
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: PAYOUT_STATUSES,
      default: "REQUESTED",
      index: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 240,
      default: "",
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

payoutRequestSchema.index({ restaurant: 1, createdAt: -1 });

export default mongoose.model("PayoutRequest", payoutRequestSchema);
