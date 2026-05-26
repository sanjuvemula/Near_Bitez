export const CUSTOMER_ORDER_STEPS = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export const LIVE_ORDER_STATUSES = CUSTOMER_ORDER_STEPS.filter(
  (status) => status !== "DELIVERED"
);

export const STATUS_COPY = {
  PLACED: "Order received.",
  ACCEPTED: "Confirmed by the restaurant.",
  PREPARING: "Food is being prepared.",
  READY: "Packed and ready.",
  OUT_FOR_DELIVERY: "On the way.",
  DELIVERED: "Delivered.",
  REJECTED: "This order could not be completed.",
};

export const getCustomerStatusClassName = (status) => {
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

export const getOrderProgressIndex = (status) => {
  if (status === "REJECTED") {
    return -1;
  }

  return Math.max(CUSTOMER_ORDER_STEPS.indexOf(status), 0);
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

export const getDeliveryFeeProgress = (itemTotal) => {
  const threshold = 500;

  return {
    threshold,
    remaining: Math.max(0, threshold - Number(itemTotal || 0)),
    progress: Math.min(100, Math.round((Number(itemTotal || 0) / threshold) * 100)),
    unlocked: Number(itemTotal || 0) >= threshold,
  };
};
