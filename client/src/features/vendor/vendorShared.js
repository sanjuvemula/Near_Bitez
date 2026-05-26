export const ORDER_STAGES = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export const LIVE_ORDER_STATUSES = ORDER_STAGES.filter(
  (status) => status !== "DELIVERED"
);

export const ORDER_FILTERS = [
  { id: "ALL", label: "All orders" },
  { id: "PLACED", label: "New" },
  { id: "ACCEPTED", label: "Accepted" },
  { id: "PREPARING", label: "Preparing" },
  { id: "READY", label: "Ready" },
  { id: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { id: "DELIVERED", label: "Completed" },
  { id: "REJECTED", label: "Rejected" },
];

export const STATUS_ACTIONS = {
  PLACED: [
    { status: "ACCEPTED", label: "Accept order", variant: "primary" },
    { status: "REJECTED", label: "Reject order", variant: "danger" },
  ],
  ACCEPTED: [
    { status: "PREPARING", label: "Start preparing", variant: "primary" },
    { status: "REJECTED", label: "Reject order", variant: "danger" },
  ],
  PREPARING: [{ status: "READY", label: "Mark ready", variant: "primary" }],
  READY: [
    {
      status: "OUT_FOR_DELIVERY",
      label: "Hand to rider",
      variant: "primary",
    },
  ],
  OUT_FOR_DELIVERY: [
    { status: "DELIVERED", label: "Mark delivered", variant: "primary" },
  ],
  DELIVERED: [],
  REJECTED: [],
};

export const initialOverview = {
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
  statusBreakdown: {
    PLACED: 0,
    ACCEPTED: 0,
    PREPARING: 0,
    READY: 0,
    OUT_FOR_DELIVERY: 0,
    DELIVERED: 0,
    REJECTED: 0,
  },
  salesTrend: [],
  menuCategories: [],
};

export const initialRestaurantForm = {
  name: "",
  description: "",
  address: "",
  category: "",
  cuisineType: "",
  deliveryTime: 30,
  isVegOnly: false,
  isActive: true,
};

export const initialMenuForm = {
  name: "",
  description: "",
  category: "",
  price: "",
  isVeg: true,
  isAvailable: true,
};

export const mapRestaurantToFormValues = (restaurant) => ({
  name: restaurant?.name || "",
  description: restaurant?.description || "",
  address: restaurant?.address || "",
  category: restaurant?.category || "",
  cuisineType: (restaurant?.cuisineType || []).join(", "),
  deliveryTime: restaurant?.deliveryTime || 30,
  isVegOnly: Boolean(restaurant?.isVegOnly),
  isActive: restaurant?.isActive ?? true,
});

export const mapMenuItemToFormValues = (item) => ({
  name: item?.name || "",
  description: item?.description || "",
  category: item?.category || "",
  price: item?.price || "",
  isVeg: item?.isVeg ?? true,
  isAvailable: item?.isAvailable ?? true,
});

export const panelClassName =
  "rounded-[32px] border border-white/80 bg-white/95 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.45)]";

export const inputClassName =
  "w-full rounded-[20px] border border-white/70 bg-white/95 px-4 py-3 text-sm font-semibold text-gray-900 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.55)] outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100";

export const textAreaClassName =
  "min-h-[132px] w-full rounded-[22px] border border-white/70 bg-white/95 px-4 py-3 text-sm font-semibold text-gray-900 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.55)] outline-none transition placeholder:text-gray-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100";

export const selectClassName =
  "w-full rounded-[20px] border border-white/70 bg-white/95 px-4 py-3 text-sm font-semibold text-gray-900 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.55)] outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100";

export const getStatusClassName = (status) => {
  const styles = {
    PLACED: "bg-rose-100 text-rose-700",
    ACCEPTED: "bg-amber-100 text-amber-700",
    PREPARING: "bg-orange-100 text-orange-700",
    READY: "bg-emerald-100 text-emerald-700",
    OUT_FOR_DELIVERY: "bg-sky-100 text-sky-700",
    DELIVERED: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-red-100 text-red-700",
  };

  return styles[status] || "bg-slate-100 text-slate-700";
};

export const validateImageFile = (file) => {
  if (!file) {
    return "";
  }

  // Allowed basic web image formats (added avif and standard basic images)
  const allowedTypes = [
    "image/jpeg", 
    "image/jpg", 
    "image/png", 
    "image/webp", 
    "image/avif",
    "image/heic"
  ];

  if (!allowedTypes.includes(file.type)) {
    // Ye error tumhe exactly batayega ki tum konsa galat format upload kar rahe the
    return `Format not supported (${file.type || 'unknown'}). Please use JPG, PNG, or WEBP.`;
  }

  // 5MB limit
  if (file.size > 5 * 1024 * 1024) {
    return "Image size must be less than 5MB.";
  }

  return "";
};
export const formatRelativeTime = (value) => {
  const diffInMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60000)
  );

  if (diffInMinutes < 1) {
    return "Just now";
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`;
  }

  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hr ago`;
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatSyncLabel = (value) => {
  if (!value) {
    return "Waiting for first sync";
  }

  const diffInSeconds = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 1000)
  );

  if (diffInSeconds < 5) {
    return "Just synced";
  }

  if (diffInSeconds < 60) {
    return `Synced ${diffInSeconds}s ago`;
  }

  const diffInMinutes = Math.round(diffInSeconds / 60);
  return `Synced ${diffInMinutes}m ago`;
};
