import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { SOCKET_EVENTS } from "@/services/socket";
import type { AdminStats, SubscriptionAnalytics } from "@/types/admin";

/**
 * One alert row on the dashboard.
 *
 * `route` names the screen that resolves it, so an alert is always actionable
 * rather than a number the admin has to go hunting for.
 */
export interface PlatformAlert {
  id: string;
  label: string;
  count: number;
  detail?: string;
  tone: "warning" | "error" | "info";
  route?: string;
}

interface AdminContextValue {
  stats: AdminStats | null;
  analytics: SubscriptionAnalytics | null;
  openIssues: number;
  alerts: PlatformAlert[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
}

export const AdminContext = createContext<AdminContextValue>({
  stats: null,
  analytics: null,
  openIssues: 0,
  alerts: [],
  loading: false,
  refreshing: false,
  error: null,
  refresh: async () => {},
});

/**
 * Platform-wide state shared by the admin screens.
 *
 * Held once at the navigator level: the dashboard, the tab badges and the
 * alerts list all read the same snapshot, so a single socket event refreshes
 * everything instead of each screen polling on its own.
 */
export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [openIssues, setOpenIssues] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef(false);
  const hasData = useRef(false);

  const refresh = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!isAdmin || inFlight.current) return;
      inFlight.current = true;

      if (silent) setRefreshing(true);
      else if (!hasData.current) setLoading(true);

      try {
        // Settled rather than all: subscription analytics is the heaviest query
        // here, and a failure there should not blank out the whole dashboard.
        const [statsResult, analyticsResult, feedbackResult] = await Promise.allSettled([
          adminApi.stats(),
          adminApi.subscriptionAnalytics(),
          adminApi.feedback({ status: "OPEN", limit: 1 }),
        ]);

        if (statsResult.status === "fulfilled") {
          setStats(statsResult.value);
          hasData.current = true;
          setError(null);
        } else if (!hasData.current) {
          setError(
            statsResult.reason instanceof Error
              ? statsResult.reason.message
              : "Could not load platform stats"
          );
        }

        if (analyticsResult.status === "fulfilled") setAnalytics(analyticsResult.value);
        if (feedbackResult.status === "fulfilled") setOpenIssues(feedbackResult.value.total ?? 0);
      } finally {
        inFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    if (isAdmin) void refresh();
    // Re-run on sign-in only; `refresh` is stable per role.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  /**
   * Platform activity refreshes the snapshot.
   *
   * Coalesced behind a timer because a burst of orders would otherwise trigger
   * one full stats aggregation per event.
   */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void refresh({ silent: true }), 4000);
  }, [refresh]);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  useSocketEvent(SOCKET_EVENTS.newOrder, scheduleRefresh, isAdmin);
  useSocketEvent(SOCKET_EVENTS.orderStatusUpdate, scheduleRefresh, isAdmin);
  useSocketEvent(SOCKET_EVENTS.notification, scheduleRefresh, isAdmin);

  /**
   * Alerts are derived, never stored — each one points at a number the backend
   * already computed, so nothing here can drift from the source data.
   */
  const alerts = useMemo<PlatformAlert[]>(() => {
    const rows: PlatformAlert[] = [];

    if (stats?.finance.pendingPayouts) {
      rows.push({
        id: "payouts",
        label: "Payouts waiting for approval",
        count: stats.finance.pendingPayouts,
        detail: `₹${Math.round(stats.finance.openPayoutAmount).toLocaleString("en-IN")} held`,
        tone: "warning",
        route: "AdminFinance",
      });
    }

    if (stats?.restaurants.paused) {
      rows.push({
        id: "paused",
        label: "Restaurants currently closed",
        count: stats.restaurants.paused,
        detail: "Not accepting orders",
        tone: "info",
        route: "AdminRestaurants",
      });
    }

    if (analytics?.totals.expiringSoon) {
      rows.push({
        id: "expiring",
        label: "Subscriptions expiring this week",
        count: analytics.totals.expiringSoon,
        tone: "warning",
        route: "AdminSubscriptions",
      });
    }

    if (analytics?.totals.restaurantsNearQuota) {
      rows.push({
        id: "quota",
        label: "Restaurants near their free-order limit",
        count: analytics.totals.restaurantsNearQuota,
        detail: "80% or more used",
        tone: "info",
        route: "AdminSubscriptions",
      });
    }

    if (analytics?.totals.pausedSubscriptions) {
      rows.push({
        id: "paused-subs",
        label: "Paused subscriptions",
        count: analytics.totals.pausedSubscriptions,
        tone: "warning",
        route: "AdminSubscriptions",
      });
    }

    if (openIssues) {
      rows.push({
        id: "issues",
        label: "Reported issues still open",
        count: openIssues,
        tone: "error",
        route: "AdminFeedback",
      });
    }

    return rows;
  }, [analytics, openIssues, stats]);

  const value = useMemo<AdminContextValue>(
    () => ({ stats, analytics, openIssues, alerts, loading, refreshing, error, refresh }),
    [alerts, analytics, error, loading, openIssues, refresh, refreshing, stats]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};
