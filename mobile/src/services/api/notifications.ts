import { apiClient } from "@/services/apiClient";
import type { AppNotification } from "@/types/models";

/**
 * Mirrors server/routes/notificationRoutes.js.
 *
 * The list endpoint returns `unreadCount` alongside `data`, so the badge comes
 * from the server rather than being counted client-side.
 */
export const notificationApi = {
  list: () =>
    apiClient
      .get<{ data: AppNotification[]; unreadCount: number }>("/notifications")
      .then((r) => ({ items: r.data.data, unreadCount: r.data.unreadCount ?? 0 })),

  markRead: (id: string) =>
    apiClient
      .patch<{ unreadCount: number }>(`/notifications/${id}/read`)
      .then((r) => r.data.unreadCount ?? 0),

  markAllRead: () =>
    apiClient.patch("/notifications/read-all").then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/notifications/${id}`).then((r) => r.data),

  clearAll: () => apiClient.delete("/notifications/clear").then((r) => r.data),
};
