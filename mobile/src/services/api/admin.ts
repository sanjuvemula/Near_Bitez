import { apiClient } from "@/services/apiClient";
import type { MenuItem } from "@/types/models";
import type {
  AdminChat,
  AdminFeedback,
  AdminOrder,
  AdminPlan,
  AdminPromo,
  AdminRestaurant,
  AdminStats,
  AdminSubscriptionState,
  AdminTiffinProvider,
  AdminTiffinSubscription,
  AdminUser,
  BusinessSettings,
  Paged,
  Payout,
  PayoutStatus,
  PlanPayload,
  RestaurantSubscriptionDetail,
  SubscriptionAction,
  SubscriptionAnalytics,
  SubscriptionRow,
  SubscriptionSummaryRow,
} from "@/types/admin";

/**
 * Every admin route the app uses.
 *
 * Mirrors server/routes/adminRoutes.js (mounted at /api/v1/admin) and
 * server/routes/subscriptionPlanRoutes.js (mounted at
 * /api/v1/admin/subscriptions). Both are `protect + authorize("admin")` on the
 * server, so authorisation is enforced there — the UI only hides what a
 * non-admin could not call anyway.
 *
 * Nothing here computes money. Commission, quota, plan pricing and payout
 * amounts are read from responses and displayed verbatim.
 */

/** Drops empty filter values so `?search=` never narrows a query to nothing. */
const params = (input: Record<string, string | number | undefined | null>) => {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
};

export const adminApi = {
  /* ── Dashboard ─────────────────────────────────────────────────────── */

  stats: () => apiClient.get<{ data: AdminStats }>("/admin/stats").then((r) => r.data.data),

  /* ── Users ─────────────────────────────────────────────────────────── */

  users: (query: { role?: string; search?: string; page?: number; limit?: number } = {}) =>
    apiClient
      .get<Paged<AdminUser>>("/admin/users", { params: params(query) })
      .then((r) => r.data),

  updateUser: (id: string, payload: Record<string, unknown>) =>
    apiClient.patch<{ data: AdminUser }>(`/admin/users/${id}`, payload).then((r) => r.data.data),

  /** Server refuses to demote a system admin or the caller's own account. */
  updateUserRole: (id: string, role: string) =>
    apiClient
      .patch<{ data: AdminUser }>(`/admin/users/${id}/role`, { role })
      .then((r) => r.data.data),

  deleteUser: (id: string) => apiClient.delete(`/admin/users/${id}`).then((r) => r.data),

  /* ── Restaurants ───────────────────────────────────────────────────── */

  restaurants: (query: { search?: string; status?: string } = {}) =>
    apiClient
      .get<{ data: AdminRestaurant[] }>("/admin/restaurants", { params: params(query) })
      .then((r) => r.data.data),

  /**
   * Not reachable from the mobile UI by choice — editing a restaurant's
   * profile is a long form that belongs on the web dashboard, and the owner
   * can already edit it themselves. Kept so this module mirrors the route
   * table completely.
   */
  updateRestaurant: (id: string, payload: Record<string, unknown>) =>
    apiClient
      .patch<{ data: AdminRestaurant }>(`/admin/restaurants/${id}`, payload)
      .then((r) => r.data.data),

  /** Flips isActive server-side; the body is ignored, so no value is sent. */
  toggleRestaurant: (id: string) =>
    apiClient
      .patch<{ data: AdminRestaurant }>(`/admin/restaurants/${id}/toggle`)
      .then((r) => r.data.data),

  /**
   * Also not reachable from the mobile UI by choice. Deleting a restaurant
   * cascades into its menu, promos and tiffin subscriptions — too destructive
   * to sit one mis-tap away on a phone. It stays available on the web
   * dashboard.
   */
  deleteRestaurant: (id: string) =>
    apiClient.delete(`/admin/restaurants/${id}`).then((r) => r.data),

  /* ── Menu ──────────────────────────────────────────────────────────── */

  menu: (query: { restaurantId?: string; search?: string; availability?: string } = {}) =>
    apiClient
      .get<{ data: MenuItem[] }>("/admin/menu", { params: params(query) })
      .then((r) => r.data.data),

  toggleMenuItem: (id: string, isAvailable: boolean) =>
    apiClient
      .patch<{ data: MenuItem }>(`/admin/menu/${id}/availability`, { isAvailable })
      .then((r) => r.data.data),

  /* ── Orders ────────────────────────────────────────────────────────── */

  orders: (query: { status?: string; search?: string; page?: number; limit?: number } = {}) =>
    apiClient
      .get<Paged<AdminOrder>>("/admin/orders", { params: params(query) })
      .then((r) => r.data),

  updateOrderStatus: (id: string, status: string) =>
    apiClient
      .patch<{ data: AdminOrder }>(`/admin/orders/${id}/status`, { status })
      .then((r) => r.data.data),

  deleteOrder: (id: string) => apiClient.delete(`/admin/orders/${id}`).then((r) => r.data),

  /* ── Monetization overview ─────────────────────────────────────────── */

  /** Per-restaurant plan rows plus a per-plan summary in the same response. */
  subscriptions: (query: { plan?: string; status?: string; search?: string } = {}) =>
    apiClient
      .get<{ data: SubscriptionRow[]; summary: SubscriptionSummaryRow[] }>("/admin/subscriptions", {
        params: params(query),
      })
      .then((r) => ({ rows: r.data.data, summary: r.data.summary })),

  /* ── Subscription plans (CRUD) ─────────────────────────────────────── */

  plans: (includeArchived = false) =>
    apiClient
      .get<{ data: AdminPlan[] }>("/admin/subscriptions/plans", {
        params: includeArchived ? { includeArchived: "true" } : undefined,
      })
      .then((r) => r.data.data),

  planById: (id: string) =>
    apiClient
      .get<{ data: AdminPlan }>(`/admin/subscriptions/plans/${id}`)
      .then((r) => r.data.data),

  createPlan: (payload: PlanPayload) =>
    apiClient
      .post<{ data: AdminPlan }>("/admin/subscriptions/plans", payload)
      .then((r) => r.data.data),

  /** PUT, not PATCH — the server validates the payload as a whole. */
  updatePlan: (id: string, payload: Partial<PlanPayload>) =>
    apiClient
      .put<{ data: AdminPlan }>(`/admin/subscriptions/plans/${id}`, payload)
      .then((r) => r.data.data),

  togglePlan: (id: string, isActive: boolean) =>
    apiClient
      .patch<{ data: AdminPlan; message?: string }>(`/admin/subscriptions/plans/${id}/status`, {
        isActive,
      })
      .then((r) => r.data),

  duplicatePlan: (id: string) =>
    apiClient
      .post<{ data: AdminPlan }>(`/admin/subscriptions/plans/${id}/duplicate`)
      .then((r) => r.data.data),

  deletePlan: (id: string) =>
    apiClient.delete(`/admin/subscriptions/plans/${id}`).then((r) => r.data),

  /* ── Per-restaurant subscription management ────────────────────────── */

  subscriptionDetail: (restaurantId: string) =>
    apiClient
      .get<{ data: RestaurantSubscriptionDetail }>(
        `/admin/subscriptions/restaurants/${restaurantId}`
      )
      .then((r) => r.data.data),

  /**
   * Each of these returns the recomputed subscription state, so callers should
   * use the response rather than patching their local copy.
   */
  assignPlan: (restaurantId: string, planId: string, notes?: string) =>
    apiClient
      .post<{ data: AdminSubscriptionState }>(
        `/admin/subscriptions/restaurants/${restaurantId}/assign`,
        { planId, notes }
      )
      .then((r) => r.data.data),

  setSubscriptionStatus: (restaurantId: string, status: SubscriptionAction) =>
    apiClient
      .patch<{ data: AdminSubscriptionState }>(
        `/admin/subscriptions/restaurants/${restaurantId}/status`,
        { status }
      )
      .then((r) => r.data.data),

  extendSubscription: (restaurantId: string, days: number) =>
    apiClient
      .patch<{ data: AdminSubscriptionState }>(
        `/admin/subscriptions/restaurants/${restaurantId}/extend`,
        { days }
      )
      .then((r) => r.data.data),

  /** Positive adds bonus free orders, negative removes them. */
  adjustQuota: (restaurantId: string, amount: number) =>
    apiClient
      .patch<{ data: AdminSubscriptionState }>(
        `/admin/subscriptions/restaurants/${restaurantId}/quota`,
        { amount }
      )
      .then((r) => r.data.data),

  resetQuota: (restaurantId: string) =>
    apiClient
      .post<{ data: AdminSubscriptionState }>(
        `/admin/subscriptions/restaurants/${restaurantId}/quota/reset`
      )
      .then((r) => r.data.data),

  overrideCommission: (restaurantId: string, rate: number) =>
    apiClient
      .patch<{ data: AdminSubscriptionState }>(
        `/admin/subscriptions/restaurants/${restaurantId}/commission`,
        { rate }
      )
      .then((r) => r.data.data),

  /* ── Subscription analytics + audit ────────────────────────────────── */

  subscriptionAnalytics: (query: { from?: string; to?: string } = {}) =>
    apiClient
      .get<{ data: SubscriptionAnalytics }>("/admin/subscriptions/analytics", {
        params: params(query),
      })
      .then((r) => r.data.data),

  /* ── Finance ───────────────────────────────────────────────────────── */

  payouts: (status: string = "all") =>
    apiClient
      .get<{ data: Payout[] }>("/admin/payouts", { params: { status } })
      .then((r) => r.data.data),

  updatePayoutStatus: (id: string, status: PayoutStatus, note?: string) =>
    apiClient
      .patch<{ data: Payout }>(`/admin/payouts/${id}/status`, { status, note })
      .then((r) => r.data.data),

  /* ── Tiffin ────────────────────────────────────────────────────────── */

  tiffinProviders: (query: { status?: string; search?: string } = {}) =>
    apiClient
      .get<{ data: AdminTiffinProvider[] }>("/admin/tiffins", { params: params(query) })
      .then((r) => r.data.data),

  updateTiffinProvider: (restaurantId: string, payload: Record<string, unknown>) =>
    apiClient
      .patch<{ data: AdminTiffinProvider }>(`/admin/tiffins/${restaurantId}`, payload)
      .then((r) => r.data.data),

  tiffinSubscriptions: (query: { status?: string; restaurantId?: string; search?: string } = {}) =>
    apiClient
      .get<{ data: AdminTiffinSubscription[] }>("/admin/tiffin-subscriptions", {
        params: params(query),
      })
      .then((r) => r.data.data),

  updateTiffinSubscriptionStatus: (id: string, status: string) =>
    apiClient
      .patch<{ data: AdminTiffinSubscription }>(`/admin/tiffin-subscriptions/${id}/status`, {
        status,
      })
      .then((r) => r.data.data),

  /* ── Settings ──────────────────────────────────────────────────────── */

  settings: () =>
    apiClient.get<{ data: BusinessSettings }>("/admin/settings").then((r) => r.data.data),

  updateSettings: (payload: Partial<BusinessSettings>) =>
    apiClient
      .put<{ data: BusinessSettings }>("/admin/settings", payload)
      .then((r) => r.data.data),

  /** Deletes the stored document so the schema defaults apply again. */
  resetSettings: () =>
    apiClient
      .post<{ data: BusinessSettings }>("/admin/settings/reset")
      .then((r) => r.data.data),

  /* ── Feedback / reported issues ────────────────────────────────────── */

  feedback: (query: { status?: string; type?: string; search?: string; limit?: number } = {}) =>
    apiClient
      .get<Paged<AdminFeedback>>("/admin/feedback", { params: params(query) })
      .then((r) => r.data),

  updateFeedback: (id: string, payload: { status?: string; priority?: string; adminNote?: string }) =>
    apiClient
      .patch<{ data: AdminFeedback }>(`/admin/feedback/${id}`, payload)
      .then((r) => r.data.data),

  /* ── Promos ────────────────────────────────────────────────────────── */

  promos: (query: { type?: string; status?: string; search?: string } = {}) =>
    apiClient
      .get<{ data: AdminPromo[] }>("/admin/promos", { params: params(query) })
      .then((r) => r.data.data),

  togglePromo: (id: string, isActive: boolean) =>
    apiClient
      .patch<{ data: AdminPromo }>(`/admin/promos/${id}/status`, { isActive })
      .then((r) => r.data.data),

  /* ── Messages ──────────────────────────────────────────────────────── */

  /** Admin sees every conversation: customer↔vendor and support threads. */
  chats: () =>
    apiClient.get<{ data: AdminChat[] }>("/chats/admin/all").then((r) => r.data.data),

  sendMessage: (chatId: string, text: string) =>
    apiClient.post(`/chats/admin/${chatId}/message`, { text }).then((r) => r.data.data),
};
