import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { vendorApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useToast } from "@/hooks/useToast";
import { SOCKET_EVENTS } from "@/services/socket";
import type { Order } from "@/types/models";
import type { VendorOverview } from "@/types/vendor";

interface VendorContextValue {
  overview: VendorOverview | null;
  orders: Order[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** Order id currently being updated, for per-card spinners. */
  pendingOrderId: string | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  updateOrderStatus: (id: string, status: string) => Promise<void>;
}

export const VendorContext = createContext<VendorContextValue>({
  overview: null,
  orders: [],
  loading: false,
  refreshing: false,
  error: null,
  pendingOrderId: null,
  refresh: async () => {},
  updateOrderStatus: async () => {},
});

/**
 * Shared vendor state: overview stats plus the order list.
 *
 * Held once at the navigator level so the dashboard, live orders and the tab
 * badge all read the same data and a single socket event refreshes everything.
 */
export const VendorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const toast = useToast();

  const [overview, setOverview] = useState<VendorOverview | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const isVendor = user?.role === "vendor" || user?.role === "admin";

  /** Guards against overlapping refreshes when several events land together. */
  const inFlight = useRef(false);

  const refresh = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!isVendor || inFlight.current) return;
      inFlight.current = true;

      if (silent) setRefreshing(true);
      else setLoading((prev) => (overview ? prev : true));

      try {
        const [nextOverview, nextOrders] = await Promise.all([
          vendorApi.overview(),
          vendorApi.orders(),
        ]);
        setOverview(nextOverview);
        setOrders(nextOrders);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load dashboard");
      } finally {
        inFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isVendor, overview]
  );

  useEffect(() => {
    if (isVendor) void refresh();
    // Only re-run when the role changes, not on every refresh identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVendor]);

  /**
   * A new order landed. The server emits `new_order` into `vendor_<userId>`,
   * which AuthContext joined at login.
   *
   * Events are de-duplicated by id because the server emits both `new_order`
   * and `notification` for the same order — without this the toast fires twice.
   */
  const seen = useRef<Set<string>>(new Set());

  const onNewOrder = useCallback(
    (payload: { _id?: string; orderId?: string } | undefined) => {
      const id = payload?.orderId ?? payload?._id;
      if (id) {
        if (seen.current.has(id)) return;
        seen.current.add(id);
        // Keep the set small; only recent ids matter.
        if (seen.current.size > 50) {
          seen.current = new Set([...seen.current].slice(-25));
        }
      }
      toast.success("New order received");
      void refresh({ silent: true });
    },
    [refresh, toast]
  );

  useSocketEvent(SOCKET_EVENTS.newOrder, onNewOrder, isVendor);

  const updateOrderStatus = useCallback(
    async (id: string, status: string) => {
      setPendingOrderId(id);
      try {
        const updated = await vendorApi.updateOrderStatus(id, status);
        // Patch locally for an instant response, then reconcile with the server
        // so stat counters stay accurate.
        setOrders((prev) =>
          prev.map((order) => (order._id === id ? { ...order, ...updated } : order))
        );
        void refresh({ silent: true });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update order");
      } finally {
        setPendingOrderId(null);
      }
    },
    [refresh, toast]
  );

  const value = useMemo<VendorContextValue>(
    () => ({
      overview,
      orders,
      loading,
      refreshing,
      error,
      pendingOrderId,
      refresh,
      updateOrderStatus,
    }),
    [error, loading, orders, overview, pendingOrderId, refresh, refreshing, updateOrderStatus]
  );

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>;
};
