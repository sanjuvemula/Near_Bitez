import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["EARNED", "SPENT", "BONUS", "REFUND"],
      required: true,
    },
    source: {
      type: String,
      enum: ["ORDER", "GAME", "MISSION", "REFERRAL", "ADMIN", "MARKETPLACE"],
      default: "GAME",
      index: true,
    },
    coins: {
      type: Number,
      required: true,
    },
    xp: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 180,
      default: "",
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("WalletTransaction", walletTransactionSchema);
