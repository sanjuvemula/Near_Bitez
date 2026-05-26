import mongoose from "mongoose";

const promoSchema = new mongoose.Schema(
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
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
      default: "PERCENTAGE",
    },
    value: {
      type: Number,
      required: true,
      min: 1,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: null, // cap for percentage discounts, e.g. max ₹200 off
    },
    validUntil: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default: null, // null = unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isGameReward: {
      type: Boolean,
      default: false,
      index: true,
    },
    gameKey: {
      type: String,
      trim: true,
      default: "any",
      maxlength: 60,
    },
    gameRewardTier: {
      type: String,
      enum: ["PLAY", "TOP"],
      default: "PLAY",
    },
    gameMinScore: {
      type: Number,
      default: 40,
      min: 0,
    },
    gameHoldMinutes: {
      type: Number,
      default: 30,
      min: 1,
    },
  },
  { timestamps: true }
);

// Unique code per restaurant
promoSchema.index({ restaurant: 1, code: 1 }, { unique: true });

export default mongoose.model("Promo", promoSchema);




