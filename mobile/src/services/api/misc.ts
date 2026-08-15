import { apiClient } from "@/services/apiClient";

/** Remaining backend modules, each mapped to its existing route file. */

export const tiffinApi = {
  list: () => apiClient.get("/tiffins").then((r) => r.data),
  subscribe: (payload: Record<string, unknown>) =>
    apiClient.post("/tiffins/subscribe", payload).then((r) => r.data),
};

export const chatApi = {
  list: () => apiClient.get("/chats").then((r) => r.data),
  send: (chatId: string, message: string) =>
    apiClient.post(`/chats/${chatId}/messages`, { message }).then((r) => r.data),
};

export const reviewApi = {
  forRestaurant: (restaurantId: string) =>
    apiClient.get(`/reviews/${restaurantId}`).then((r) => r.data),
  create: (payload: Record<string, unknown>) =>
    apiClient.post("/reviews", payload).then((r) => r.data),
};

export const promoApi = {
  list: () => apiClient.get("/promos").then((r) => r.data),
};

export const favoriteApi = {
  list: () => apiClient.get("/auth/favorites").then((r) => r.data),
  add: (restaurantId: string) =>
    apiClient.put(`/auth/favorites/${restaurantId}`).then((r) => r.data),
  remove: (restaurantId: string) =>
    apiClient.delete(`/auth/favorites/${restaurantId}`).then((r) => r.data),
};

/**
 * Game endpoints are wired so coins, XP and rewards keep working once those
 * screens arrive. The games themselves are explicitly out of scope for
 * Phase 1 — see docs/MIGRATION.md.
 */
// The Phase 1 `gameApi` stub lived here. Phase 6 replaced it with the typed
// module in ./games.ts, which covers the whole /games route table.

export const settingsApi = {
  get: () => apiClient.get("/settings").then((r) => r.data),
};

export const feedbackApi = {
  send: (payload: Record<string, unknown>) =>
    apiClient.post("/feedback", payload).then((r) => r.data),
};
