import type { OrderStatus } from "@/types/models";

/**
 * Which action a vendor may take from each status.
 *
 * Mirrors STATUS_ACTIONS in client/src/features/vendor/vendorShared.js so the
 * mobile app can never send a transition the web app wouldn't allow.
 */
export const NEXT_ACTIONS: Record<OrderStatus, { label: string; status: OrderStatus }[]> = {
  SCHEDULED: [{ label: "Accept", status: "ACCEPTED" }],
  PLACED: [
    { label: "Accept", status: "ACCEPTED" },
    { label: "Reject", status: "REJECTED" },
  ],
  ACCEPTED: [{ label: "Start preparing", status: "PREPARING" }],
  PREPARING: [{ label: "Mark ready", status: "READY" }],
  READY: [{ label: "Out for delivery", status: "OUT_FOR_DELIVERY" }],
  OUT_FOR_DELIVERY: [{ label: "Mark delivered", status: "DELIVERED" }],
  DELIVERED: [],
  REJECTED: [],
};

/** Statuses that still need the kitchen's attention. */
export const LIVE_STATUSES: OrderStatus[] = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
];

/** Column order for the live workspace. */
export const LIVE_SECTIONS: { key: OrderStatus; title: string }[] = [
  { key: "PLACED", title: "New" },
  { key: "ACCEPTED", title: "Accepted" },
  { key: "PREPARING", title: "Preparing" },
  { key: "READY", title: "Ready" },
  { key: "OUT_FOR_DELIVERY", title: "Out for delivery" },
];

export const isDestructive = (status: OrderStatus) => status === "REJECTED";
