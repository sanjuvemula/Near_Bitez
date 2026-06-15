import mongoose from "mongoose";

export const DEFAULT_BUSINESS_SETTINGS = {
  commissionPercent: 18,
  platformFee: 5,
  gstPercent: 5,
  deliveryBaseFee: 40,
  freeDeliveryAbove: 500,
  minPayoutAmount: 500,
  payoutHoldHours: 24,
  maxScheduleDays: 7,
  allowScheduledOrders: true,
  referralBonusPoints: 50,
  loyaltyPointsPerRupee: 0.1,
  maintenanceMode: false,
  customerSupportEnabled: true,
  banners: [],
  rewardRules: {
    dailyLoginCoins: 5,
    gameClaimDailyLimit: 3,
    orderCoinPercent: 10,
  },
};

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 80, default: "" },
    message: { type: String, trim: true, maxlength: 220, default: "" },
    route: { type: String, trim: true, maxlength: 120, default: "/" },
    active: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
  },
  { _id: false }
);

const businessSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global",
      unique: true,
      immutable: true,
      index: true,
    },
    commissionPercent: { type: Number, default: 18, min: 0, max: 80 },
    platformFee: { type: Number, default: 5, min: 0, max: 500 },
    gstPercent: { type: Number, default: 5, min: 0, max: 28 },
    deliveryBaseFee: { type: Number, default: 40, min: 0, max: 1000 },
    freeDeliveryAbove: { type: Number, default: 500, min: 0, max: 100000 },
    minPayoutAmount: { type: Number, default: 500, min: 0, max: 100000 },
    payoutHoldHours: { type: Number, default: 24, min: 0, max: 720 },
    maxScheduleDays: { type: Number, default: 7, min: 1, max: 30 },
    allowScheduledOrders: { type: Boolean, default: true },
    referralBonusPoints: { type: Number, default: 50, min: 0, max: 100000 },
    loyaltyPointsPerRupee: { type: Number, default: 0.1, min: 0, max: 10 },
    maintenanceMode: { type: Boolean, default: false },
    customerSupportEnabled: { type: Boolean, default: true },
    banners: { type: [bannerSchema], default: [] },
    rewardRules: {
      dailyLoginCoins: { type: Number, default: 5, min: 0, max: 10000 },
      gameClaimDailyLimit: { type: Number, default: 3, min: 0, max: 100 },
      orderCoinPercent: { type: Number, default: 10, min: 0, max: 100 },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const BusinessSettings = mongoose.model("BusinessSettings", businessSettingsSchema);

export const getBusinessSettings = async () => {
  const existing = await BusinessSettings.findOne({ key: "global" });
  if (existing) return existing;

  try {
    return await BusinessSettings.create({ key: "global" });
  } catch (error) {
    if (error.code === 11000) {
      return BusinessSettings.findOne({ key: "global" });
    }
    throw error;
  }
};

export default BusinessSettings;
