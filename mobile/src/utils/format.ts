import type { OrderStatus } from "@/types/models";

/** Indian Rupee, no decimals — matches how the web app renders prices. */
export const formatCurrency = (value?: number | null): string => {
  const amount = Number(value ?? 0);
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
};

export const formatRelativeTime = (iso?: string | null): string => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

export const formatDate = (iso?: string | null): string => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/** Human wording for each status, used on badges and the tracker. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  SCHEDULED: "Scheduled",
  PLACED: "Order placed",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "On the way",
  DELIVERED: "Delivered",
  REJECTED: "Cancelled",
};

export const ORDER_STATUS_TONE: Record<
  OrderStatus,
  "neutral" | "success" | "warning" | "error" | "info" | "primary"
> = {
  SCHEDULED: "info",
  PLACED: "warning",
  ACCEPTED: "info",
  PREPARING: "primary",
  READY: "primary",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  REJECTED: "error",
};

/** Orders still in motion; drives the Active vs History split. */
export const isActiveOrder = (status: OrderStatus): boolean =>
  status !== "DELIVERED" && status !== "REJECTED";

export const orderReference = (id: string): string =>
  `#${id.slice(-6).toUpperCase()}`;
