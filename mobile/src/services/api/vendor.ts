import { apiClient } from "@/services/apiClient";
import type { MenuItem, Order, Restaurant } from "@/types/models";
import type {
  Promo,
  TiffinSubscriber,
  VendorChat,
  VendorLogistics,
  VendorOverview,
  VendorSubscription,
  VendorWallet,
} from "@/types/vendor";

/** Mirrors server/routes/vendor.js — every route the vendor app uses. */
export const vendorApi = {
  overview: () =>
    apiClient.get<{ data: VendorOverview }>("/vendor/overview").then((r) => r.data.data),

  restaurant: () =>
    apiClient.get<{ data: Restaurant }>("/vendor/restaurant").then((r) => r.data.data),

  /**
   * Accepts FormData when an image is attached — the route runs the same
   * Cloudinary multer middleware the web app uses, so no upload logic is
   * duplicated here.
   */
  updateRestaurant: (payload: Record<string, unknown> | FormData) =>
    apiClient.put("/vendor/restaurant", payload).then((r) => r.data),

  /* ── Menu ──────────────────────────────────────────────────────────── */

  menu: () =>
    apiClient.get<{ data: MenuItem[] }>("/vendor/menu").then((r) => r.data.data),

  createMenuItem: (payload: FormData | Record<string, unknown>) =>
    apiClient.post<{ data: MenuItem }>("/vendor/menu", payload).then((r) => r.data.data),

  updateMenuItem: (id: string, payload: FormData | Record<string, unknown>) =>
    apiClient
      .put<{ data: MenuItem }>(`/vendor/menu/${id}`, payload)
      .then((r) => r.data.data),

  toggleAvailability: (id: string, isAvailable: boolean) =>
    apiClient
      .patch<{ data: MenuItem }>(`/vendor/menu/${id}/availability`, { isAvailable })
      .then((r) => r.data.data),

  deleteMenuItem: (id: string) =>
    apiClient.delete(`/vendor/menu/${id}`).then((r) => r.data),

  /* ── Orders ────────────────────────────────────────────────────────── */

  orders: () =>
    apiClient.get<{ data: Order[] }>("/vendor/orders").then((r) => r.data.data),

  orderById: (id: string) =>
    apiClient.get<{ data: Order }>(`/vendor/orders/${id}`).then((r) => r.data.data),

  updateOrderStatus: (id: string, status: string) =>
    apiClient
      .patch<{ data: Order }>(`/vendor/orders/${id}/status`, { status })
      .then((r) => r.data.data),

  /* ── Subscription (the restaurant's own plan) ──────────────────────── */

  subscription: () =>
    apiClient
      .get<{ data: VendorSubscription }>("/vendor/my-subscription")
      .then((r) => r.data.data),

  subscriptionPlans: () =>
    apiClient.get("/vendor/my-subscription/plans").then((r) => r.data),

  subscribe: (planId: string) =>
    apiClient.post("/vendor/my-subscription/subscribe", { planId }).then((r) => r.data),

  subscriptionHistory: () =>
    apiClient.get("/vendor/my-subscription/history").then((r) => r.data),

  commissionSummary: () =>
    apiClient.get("/vendor/my-subscription/commission").then((r) => r.data),

  /* ── Finance ───────────────────────────────────────────────────────── */

  wallet: () =>
    apiClient.get<{ data: VendorWallet }>("/vendor/wallet").then((r) => r.data.data),

  requestPayout: (amount: number) =>
    apiClient.post("/vendor/wallet/payout", { amount }).then((r) => r.data),

  /* ── Delivery ──────────────────────────────────────────────────────── */

  logistics: () =>
    apiClient.get<{ data: VendorLogistics }>("/vendor/logistics").then((r) => r.data.data),

  updateLogistics: (payload: Partial<VendorLogistics>) =>
    apiClient.put("/vendor/logistics", payload).then((r) => r.data),

  /* ── Growth ────────────────────────────────────────────────────────── */

  promos: () =>
    apiClient.get<{ data: Promo[] }>("/vendor/promos").then((r) => r.data.data),

  createPromo: (payload: Record<string, unknown>) =>
    apiClient.post("/vendor/promos", payload).then((r) => r.data),

  togglePromo: (id: string, isActive: boolean) =>
    apiClient.patch(`/vendor/promos/${id}/status`, { isActive }).then((r) => r.data),

  deletePromo: (id: string) =>
    apiClient.delete(`/vendor/promos/${id}`).then((r) => r.data),

  /* ── Messages ──────────────────────────────────────────────────────── */

  chats: () =>
    apiClient.get<{ data: VendorChat[] }>("/vendor/chats").then((r) => r.data.data),

  sendMessage: (chatId: string, message: string) =>
    apiClient
      .post<{ data: VendorChat }>(`/vendor/chats/${chatId}/message`, { message })
      .then((r) => r.data.data),

  /* ── Tiffin subscribers ────────────────────────────────────────────── */

  tiffinSubscribers: () =>
    apiClient
      .get<{ data: TiffinSubscriber[] }>("/vendor/subscriptions")
      .then((r) => r.data.data),

  updateSubscriberStatus: (id: string, status: string) =>
    apiClient.patch(`/vendor/subscriptions/${id}/status`, { status }).then((r) => r.data),

  reviews: () => apiClient.get("/vendor/reviews").then((r) => r.data),
};
