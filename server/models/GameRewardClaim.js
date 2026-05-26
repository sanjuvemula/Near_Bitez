import mongoose from "mongoose";

const gameRewardClaimSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    promo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promo",
      required: true,
      index: true,
    },
    gameKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    rewardTier: {
      type: String,
      enum: ["PLAY", "TOP"],
      required: true,
    },
    areaKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 90,
    },
    areaLabel: {
      type: String,
      trim: true,
      default: "Nearby",
      maxlength: 90,
    },
    scoreAtClaim: {
      type: Number,
      default: 0,
      min: 0,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    claimedAt: {
      type: Date,
      default: Date.now,
    },
    redeemedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

gameRewardClaimSchema.index({ customer: 1, promo: 1 }, { unique: true });
gameRewardClaimSchema.index({ customer: 1, promo: 1, redeemedAt: 1 });

export default mongoose.model("GameRewardClaim", gameRewardClaimSchema);
