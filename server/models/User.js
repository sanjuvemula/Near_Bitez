import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { getEffectiveRole } from "../utils/adminAccess.js";

// ─── Loyalty tier thresholds ──────────────────────────────────────────────────
export const LOYALTY_TIERS = {
  BRONZE:   { name: "Bronze",   minPoints: 0,    color: "#cd7f32", emoji: "🥉" },
  SILVER:   { name: "Silver",   minPoints: 500,  color: "#a8a9ad", emoji: "🥈" },
  GOLD:     { name: "Gold",     minPoints: 1500, color: "#ffd700", emoji: "🥇" },
  PLATINUM: { name: "Platinum", minPoints: 4000, color: "#e5e4e2", emoji: "💎" },
};

export const getTierFromPoints = (points = 0) => {
  if (points >= 4000) return "PLATINUM";
  if (points >= 1500) return "GOLD";
  if (points >= 500)  return "SILVER";
  return "BRONZE";
};

// Points earned per rupee spent (₹10 = 1 point)
export const POINTS_PER_RUPEE = 0.1;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["customer", "vendor", "admin"],
      required: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    favoriteRestaurants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Restaurant",
        },
      ],
      default: [],
    },
    // ─── Loyalty system ────────────────────────────────────────────────────────
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    loyaltyTier: {
      type: String,
      enum: ["BRONZE", "SILVER", "GOLD", "PLATINUM"],
      default: "BRONZE",
    },
    totalPointsEarned: {
      type: Number,
      default: 0, // lifetime total (never decremented)
    },
    nearCoins: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastActivityDate: {
      type: String,
      default: "",
      trim: true,
    },
    xpBoostUntil: {
      type: Date,
      default: null,
    },
    referralCode: { type: String, default: null, uppercase: true },
    referralUsed: { type: Boolean, default: false },
    pointsHistory: {
      type: [
        {
          type:        { type: String, enum: ["EARNED", "REDEEMED"], required: true },
          points:      { type: Number, required: true },
          description: { type: String, default: "" },
          orderId:     { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
          createdAt:   { type: Date, default: Date.now },
        },
      ],
      default: [],
      select: false, // only load when explicitly needed
    },
    badges: {
      type: [
        {
          type: { type: String, required: true, trim: true },
          name: { type: String, required: true, trim: true },
          date: { type: String, default: "" },
          pointsAwarded: { type: Number, default: 0, min: 0 },
          earnedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// ─── Auto-update tier whenever loyaltyPoints changes ─────────────────────────
userSchema.pre("save", async function () {
  // Hash password if modified
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Recalculate tier if points changed
  if (this.isModified("loyaltyPoints") || this.isNew) {
    this.loyaltyTier = getTierFromPoints(this.loyaltyPoints);
  }
});

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ─── Award points for an order ────────────────────────────────────────────────
userSchema.methods.awardOrderPoints = async function (grandTotal, orderId, pointsPerRupee = POINTS_PER_RUPEE) {
  const earned = Math.floor(grandTotal * Math.max(0, Number(pointsPerRupee) || POINTS_PER_RUPEE));
  if (earned <= 0) return 0;

  this.loyaltyPoints     += earned;
  this.totalPointsEarned += earned;
  this.pointsHistory.push({
    type:        "EARNED",
    points:      earned,
    description: `Earned for order ₹${grandTotal}`,
    orderId,
  });

  await this.save();
  return earned;
};

// ─── Redeem points (100 points = ₹10 discount) ───────────────────────────────
userSchema.methods.redeemPoints = async function (pointsToRedeem, orderId) {
  if (pointsToRedeem > this.loyaltyPoints) {
    throw new Error("Insufficient loyalty points");
  }

  this.loyaltyPoints -= pointsToRedeem;
  this.pointsHistory.push({
    type:        "REDEEMED",
    points:      pointsToRedeem,
    description: `Redeemed for discount on order`,
    orderId,
  });

  await this.save();
  return Math.floor(pointsToRedeem / 10); // discount in rupees
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    _id:                   this._id,
    name:                  this.name,
    email:                 this.email,
    role:                  getEffectiveRole(this),
    phone:                 this.phone,
    address:               this.address,
    favoriteRestaurantIds: (this.favoriteRestaurants || []).map((r) => String(r)),
    loyaltyPoints:         this.loyaltyPoints,
    loyaltyTier:           this.loyaltyTier,
    totalPointsEarned:     this.totalPointsEarned,
    badges:                this.badges || [],
    nearCoins:             this.nearCoins || 0,
    currentStreak:         this.currentStreak || 0,
    longestStreak:         this.longestStreak || 0,
    lastActivityDate:      this.lastActivityDate || "",
    xpBoostUntil:          this.xpBoostUntil,
    createdAt:             this.createdAt,
    updatedAt:             this.updatedAt,
  };
};

export default mongoose.model("User", userSchema);



























