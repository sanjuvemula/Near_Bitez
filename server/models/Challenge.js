import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 220,
      default: "",
    },
    kind: {
      type: String,
      enum: ["DAILY", "WEEKLY", "SEASONAL", "COMMUNITY"],
      default: "DAILY",
      index: true,
    },
    targetMetric: {
      type: String,
      enum: ["ORDER", "REVIEW", "REFERRAL", "GAME_SCORE", "SPEND", "DISCOVERY"],
      required: true,
    },
    targetValue: {
      type: Number,
      default: 1,
      min: 1,
    },
    reward: {
      coins: { type: Number, default: 0, min: 0 },
      xp: { type: Number, default: 0, min: 0 },
      couponCode: { type: String, trim: true, default: "" },
      freeDelivery: { type: Boolean, default: false },
    },
    startsAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    endsAt: {
      type: Date,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Challenge", challengeSchema);
