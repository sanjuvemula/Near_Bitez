import { apiClient } from "@/services/apiClient";
import type {
  Cart,
  DiscoveryFeed,
  MenuItem,
  Order,
  Restaurant,
} from "@/types/models";

/** Mirrors server/routes/restaurant.js and searchRoutes.js */
export const restaurantApi = {
  /** Home feed: restaurants, categories, popular dishes and collections. */
  discover: (params?: { lat?: number; lng?: number; search?: string }) =>
    apiClient
      .get<{ data: DiscoveryFeed }>("/restaurants/discover", { params })
      .then((r) => r.data.data),

  list: (params?: Record<string, unknown>) =>
    apiClient
      .get<{ data: Restaurant[] }>("/restaurants", { params })
      .then((r) => r.data.data),

  /** Detail response is the restaurant object with `menu` merged in. */
  byId: (id: string) =>
    apiClient
      .get<{ data: Restaurant & { menu: MenuItem[] } }>(`/restaurants/${id}`)
      .then((r) => r.data.data),

  search: (query: string) =>
    apiClient
      .get<{ data: { restaurants?: Restaurant[]; dishes?: MenuItem[] } }>("/search", {
        params: { q: query },
      })
      .then((r) => r.data.data),
};

/**
 * Mirrors server/routes/cart.js.
 *
 * Every mutation returns the rebuilt cart including server-computed totals, so
 * the app never recalculates pricing locally.
 */
export const cartApi = {
  get: () => apiClient.get<{ data: Cart }>("/cart").then((r) => r.data.data),

  addItem: (menuItemId: string, quantity = 1, replaceCart = false) =>
    apiClient
      .post<{ data: Cart }>("/cart/items", { menuItemId, quantity, replaceCart })
      .then((r) => r.data.data),

  updateItem: (menuItemId: string, quantity: number) =>
    apiClient
      .patch<{ data: Cart }>(`/cart/items/${menuItemId}`, { quantity })
      .then((r) => r.data.data),

  removeItem: (menuItemId: string) =>
    apiClient
      .delete<{ data: Cart }>(`/cart/items/${menuItemId}`)
      .then((r) => r.data.data),

  clear: () => apiClient.delete<{ data: Cart }>("/cart").then((r) => r.data.data),
};

export interface CreateOrderPayload {
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryInstructions?: string;
  promoCode?: string | null;
  pointsToRedeem?: number;
  scheduledFor?: string | null;
  referralCode?: string | null;
}

/** Mirrors server/routes/order.js */
export const orderApi = {
  list: () => apiClient.get<{ data: Order[] }>("/orders").then((r) => r.data.data),

  byId: (id: string) =>
    apiClient.get<{ data: Order }>(`/orders/${id}`).then((r) => r.data.data),

  /**
   * The server reads the cart itself and computes every total — the body only
   * carries delivery details and discount intent.
   */
  create: (payload: CreateOrderPayload) =>
    apiClient.post<{ data: Order }>("/orders", payload).then((r) => r.data.data),
};
