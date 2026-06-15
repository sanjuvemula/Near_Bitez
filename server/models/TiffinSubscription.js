import mongoose from "mongoose";

export const TIFFIN_SUBSCRIPTION_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "EXPIRING_SOON",
  "EXPIRED",
  "CANCELLED",
];

const tiffinSubscriptionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
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
    planName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Tiffin Plan",
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: TIFFIN_SUBSCRIPTION_STATUSES,
      default: "ACTIVE",
      index: true,
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    nextDelivery: { type: Date, default: null },
    isVeg: { type: Boolean, default: true },
    mealType: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "Standard",
    },
  },
  { timestamps: true }
);

tiffinSubscriptionSchema.index({ restaurant: 1, status: 1 });

export default mongoose.model("TiffinSubscription", tiffinSubscriptionSchema);
