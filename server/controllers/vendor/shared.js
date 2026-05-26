import { isValidObjectId } from "mongoose";
import Restaurant from "../../models/Restaurant.js";
import { ORDER_STATUSES } from "../../models/Order.js";
import { cloudinary } from "../../middleware/upload.js";

export const LIVE_ORDER_STATUSES = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
];

export const getScopedRestaurantId = (req) => {
  const rawValue =
    req?.query?.restaurantId ||
    req?.body?.restaurantId ||
    req?.params?.restaurantId ||
    req?.headers?.["x-restaurant-id"];

  return typeof rawValue === "string" ? rawValue.trim() : "";
};

export const getVendorRestaurant = async (vendorOrReq) => {
  if (vendorOrReq?.user) {
    const req = vendorOrReq;

    if (req.user?.role === "admin") {
      const restaurantId = getScopedRestaurantId(req);

      if (restaurantId && isValidObjectId(restaurantId)) {
        return Restaurant.findById(restaurantId);
      }

      return Restaurant.findOne({}).sort({ createdAt: 1 });
    }

    return Restaurant.findOne({ vendor: req.user?._id });
  }

  return Restaurant.findOne({ vendor: vendorOrReq });
};

export const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return Boolean(value);
};

export const parseCuisineType = (value) =>
  Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

export const toTrimmedString = (value) =>
  typeof value === "string" ? value.trim() : "";

export const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export const removeCloudinaryAsset = async (publicId) => {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Unable to remove Cloudinary asset ${publicId}`);
  }
};

export const rollbackUploadedFile = async (file) => {
  if (!file?.filename) {
    return;
  }

  await removeCloudinaryAsset(file.filename);
};

export const buildFallbackStatusTimeline = (order) => [
  {
    status: order.status,
    changedAt: order.updatedAt || order.createdAt || new Date(),
  },
];

export const serializeOrder = (order) => ({
  _id: order._id,
  customer: order.customer,
  restaurant: order.restaurant,
  items: order.items,
  itemTotal: order.itemTotal,
  deliveryFee: order.deliveryFee,
  platformFee: order.platformFee,
  gst: order.gst,
  grandTotal: order.grandTotal,
  deliveryAddress: order.deliveryAddress,
  deliveryInstructions: order.deliveryInstructions,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  status: order.status,
  statusTimeline:
    order.statusTimeline?.length > 0
      ? order.statusTimeline
      : buildFallbackStatusTimeline(order),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

export const buildStatusBreakdown = (statusCounts) => {
  const statusMap = new Map(statusCounts.map((item) => [item._id, item.count]));

  return ORDER_STATUSES.reduce((accumulator, status) => {
    accumulator[status] = statusMap.get(status) || 0;
    return accumulator;
  }, {});
};

export const getVendorOverviewFallback = () => ({
  restaurant: null,
  stats: {
    totalOrders: 0,
    revenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    liveOrders: 0,
    deliveredOrders: 0,
    rejectedOrders: 0,
    activeMenuItems: 0,
    totalMenuItems: 0,
    deliveredRevenue: 0,
    averageOrderValue: 0,
    todayOrders: 0,
    todayRevenue: 0,
    newOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    outForDeliveryOrders: 0,
    acceptanceRate: 0,
    menuLiveCoverage: 0,
    oldestLiveOrderMinutes: 0,
  },
  statusBreakdown: buildStatusBreakdown([]),
  salesTrend: [],
  menuCategories: [],
});

export const validateRestaurantPayload = (payload) => {
  if (!payload.name || !payload.address || !payload.category) {
    return "Name, address, and category are required";
  }

  if (
    !Number.isFinite(payload.deliveryTime) ||
    payload.deliveryTime < 5 ||
    payload.deliveryTime > 120
  ) {
    return "Delivery time must be between 5 and 120 minutes";
  }

  return "";
};

export const buildMenuPayload = ({ body, currentItem = null, file = null }) => {
  const name =
    body.name !== undefined ? toTrimmedString(body.name) : currentItem?.name || "";
  const description =
    body.description !== undefined
      ? toTrimmedString(body.description)
      : currentItem?.description || "";
  const category =
    body.category !== undefined
      ? toTrimmedString(body.category)
      : currentItem?.category || "";
  const price =
    body.price !== undefined ? toNumber(body.price) : Number(currentItem?.price);
  const isVeg =
    body.isVeg !== undefined
      ? parseBoolean(body.isVeg, currentItem?.isVeg ?? true)
      : currentItem?.isVeg ?? true;
  const isAvailable =
    body.isAvailable !== undefined
      ? parseBoolean(body.isAvailable, currentItem?.isAvailable ?? true)
      : currentItem?.isAvailable ?? true;

  if (!name || !description || !category) {
    return {
      error: "Dish name, description, and category are required",
    };
  }

  if (!Number.isFinite(price) || price < 1) {
    return {
      error: "Price must be at least Rs 1",
    };
  }

  if (!currentItem && !file) {
    return {
      error: "Dish image is required and must be uploaded through Cloudinary",
    };
  }

  return {
    payload: {
      name,
      description,
      category,
      price,
      isVeg,
      isAvailable,
      imageUrl: file?.path || currentItem?.imageUrl || "",
      imagePublicId: file?.filename || currentItem?.imagePublicId || "",
    },
  };
};
