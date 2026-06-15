import { getBusinessSettings } from "../models/BusinessSettings.js";

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const positiveNumber = (value, fallback = 0) => Math.max(0, safeNumber(value, fallback));

export const calculateOrderTotals = async (items = [], restaurant = null) => {
  const settings = await getBusinessSettings();
  const itemTotal = items.reduce(
    (total, item) =>
      total + positiveNumber(item.price) * Math.max(1, Math.round(positiveNumber(item.quantity, 1))),
    0
  );

  const freeDeliveryAbove = positiveNumber(
    restaurant?.freeDeliveryAbove ?? settings.freeDeliveryAbove,
    500
  );
  const deliveryBaseFee = positiveNumber(
    restaurant?.baseDeliveryFee ?? settings.deliveryBaseFee,
    40
  );
  const platformFeeBase = positiveNumber(settings.platformFee, 5);
  const gstPercent = positiveNumber(settings.gstPercent, 5);

  const deliveryFee =
    itemTotal === 0 || itemTotal >= freeDeliveryAbove
      ? 0
      : Math.round(deliveryBaseFee);
  const platformFee = itemTotal > 0 ? Math.round(platformFeeBase) : 0;
  const gst = Math.round((itemTotal * gstPercent) / 100);
  const grandTotal = itemTotal + deliveryFee + platformFee + gst;

  return {
    itemTotal,
    deliveryFee,
    platformFee,
    gst,
    grandTotal,
    freeDeliveryAbove,
    deliveryBaseFee,
    gstPercent,
  };
};

export const getVendorNetAmount = (amount, commissionPercent = 0) => {
  const gross = positiveNumber(amount);
  const commission = Math.round((gross * positiveNumber(commissionPercent)) / 100);
  return Math.max(0, gross - commission);
};
