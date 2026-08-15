import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { notificationApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { SOCKET_EVENTS } from "@/services/socket";
import type { AppNotification } from "@/types/models";

interface NotificationContextValue {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextValue>({
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,
  refresh: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
  remove: async () => {},
  clearAll: async () => {},
});

/**
 * Notification list plus the unread badge.
 *
 * Loads from the API, then keeps itself current from the shared socket — the
 * server pushes `notification` into the user's personal room on order events,
 * so no polling is needed.
 */
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { items: next, unreadCount: unread } = await notificationApi.list();
      setItems(next);
      setUnreadCount(unread);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live push. Refetching keeps the list authoritative rather than trying to
  // reconstruct the server's notification shape from the socket payload.
  useSocketEvent(SOCKET_EVENTS.notification, () => void refresh(), Boolean(user));

  const markRead = useCallback(async (id: string) => {
    // Optimistic: the badge should drop the instant the row is tapped.
    setItems((prev) =>
      prev.map((item) => (item._id === id ? { ...item, read: true } : item))
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    try {
      const unread = await notificationApi.markRead(id);
      setUnreadCount(unread);
    } catch {
      void refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    try {
      await notificationApi.markAllRead();
    } catch {
      void refresh();
    }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((item) => item._id !== id));
    try {
      await notificationApi.remove(id);
    } finally {
      void refresh();
    }
  }, [refresh]);

  const clearAll = useCallback(async () => {
    setItems([]);
    setUnreadCount(0);
    try {
      await notificationApi.clearAll();
    } catch {
      void refresh();
    }
  }, [refresh]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      items,
      unreadCount,
      loading,
      error,
      refresh,
      markRead,
      markAllRead,
      remove,
      clearAll,
    }),
    [clearAll, error, items, loading, markAllRead, markRead, refresh, remove, unreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
