import BusinessSettings, { getBusinessSettings } from "../models/BusinessSettings.js";
import PayoutRequest, { PAYOUT_STATUSES } from "../models/PayoutRequest.js";

const numberRules = {
  commissionPercent: { min: 0, max: 80 },
  platformFee: { min: 0, max: 500 },
  gstPercent: { min: 0, max: 28 },
  deliveryBaseFee: { min: 0, max: 1000 },
  freeDeliveryAbove: { min: 0, max: 100000 },
  minPayoutAmount: { min: 0, max: 100000 },
  payoutHoldHours: { min: 0, max: 720 },
  maxScheduleDays: { min: 1, max: 30 },
  referralBonusPoints: { min: 0, max: 100000 },
  loyaltyPointsPerRupee: { min: 0, max: 10 },
};

const booleanFields = ["allowScheduledOrders", "maintenanceMode", "customerSupportEnabled"];

const parseBoolean = (value) => value === true || value === "true" || value === "1" || value === 1;

const clampNumber = (value, { min, max }) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
};

const sanitizeBanners = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 8)
    .map((banner, index) => ({
      title: String(banner?.title || "").trim().slice(0, 80),
      message: String(banner?.message || "").trim().slice(0, 220),
      route: String(banner?.route || "/").trim().slice(0, 120) || "/",
      active: banner?.active === undefined ? true : parseBoolean(banner.active),
      priority: Number.isFinite(Number(banner?.priority)) ? Number(banner.priority) : index,
    }))
    .filter((banner) => banner.title || banner.message);
};

const sanitizeRewardRules = (value = {}) => ({
  dailyLoginCoins: clampNumber(value.dailyLoginCoins, { min: 0, max: 10000 }) ?? 5,
  gameClaimDailyLimit: clampNumber(value.gameClaimDailyLimit, { min: 0, max: 100 }) ?? 3,
  orderCoinPercent: clampNumber(value.orderCoinPercent, { min: 0, max: 100 }) ?? 10,
});

export const getAdminBusinessSettings = async (req, res) => {
  const settings = await getBusinessSettings();
  res.status(200).json({ success: true, data: settings });
};

export const updateAdminBusinessSettings = async (req, res) => {
  try {
    const settings = await getBusinessSettings();
    const updates = {};

    for (const [field, rules] of Object.entries(numberRules)) {
      if (req.body[field] !== undefined) {
        const value = clampNumber(req.body[field], rules);
        if (value === null) {
          return res.status(400).json({ success: false, message: `${field} must be a valid number` });
        }
        updates[field] = value;
      }
    }

    for (const field of booleanFields) {
      if (req.body[field] !== undefined) {
        updates[field] = parseBoolean(req.body[field]);
      }
    }

    if (req.body.banners !== undefined) {
      updates.banners = sanitizeBanners(req.body.banners);
    }

    if (req.body.rewardRules !== undefined) {
      updates.rewardRules = sanitizeRewardRules(req.body.rewardRules);
    }

    settings.set({ ...updates, updatedBy: req.user._id });
    await settings.save();

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to update business settings" });
  }
};

export const getPublicBusinessSettings = async (req, res) => {
  const settings = await getBusinessSettings();
  const activeBanners = (settings.banners || [])
    .filter((banner) => banner.active)
    .sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));

  res.status(200).json({
    success: true,
    data: {
      maintenanceMode: settings.maintenanceMode,
      customerSupportEnabled: settings.customerSupportEnabled,
      allowScheduledOrders: settings.allowScheduledOrders,
      maxScheduleDays: settings.maxScheduleDays,
      freeDeliveryAbove: settings.freeDeliveryAbove,
      deliveryBaseFee: settings.deliveryBaseFee,
      platformFee: settings.platformFee,
      gstPercent: settings.gstPercent,
      banners: activeBanners,
    },
  });
};

export const getAdminPayouts = async (req, res) => {
  const { status = "all" } = req.query;
  const query = {};
  if (status !== "all" && PAYOUT_STATUSES.includes(status)) {
    query.status = status;
  }

  const payouts = await PayoutRequest.find(query)
    .populate("vendor", "name email phone")
    .populate("restaurant", "name")
    .populate("resolvedBy", "name email")
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({ success: true, data: payouts });
};

export const updateAdminPayoutStatus = async (req, res) => {
  try {
    const { status, note = "" } = req.body;
    if (!PAYOUT_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid payout status" });
    }

    const payout = await PayoutRequest.findByIdAndUpdate(
      req.params.id,
      {
        status,
        note: String(note || "").trim().slice(0, 240),
        resolvedBy: req.user._id,
        resolvedAt: ["PAID", "REJECTED"].includes(status) ? new Date() : null,
      },
      { new: true }
    )
      .populate("vendor", "name email phone")
      .populate("restaurant", "name")
      .populate("resolvedBy", "name email");

    if (!payout) {
      return res.status(404).json({ success: false, message: "Payout request not found" });
    }

    res.status(200).json({ success: true, data: payout });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to update payout" });
  }
};

export const resetAdminBusinessSettings = async (req, res) => {
  await BusinessSettings.findOneAndDelete({ key: "global" });
  const settings = await getBusinessSettings();
  res.status(200).json({ success: true, data: settings });
};
