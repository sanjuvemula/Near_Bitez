import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../../../services/api.js";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "subscription", label: "Subscription" },
  { id: "payment", label: "Payments" },
  { id: "order", label: "Orders" },
];

const CATEGORY_TONES = {
  SUBSCRIPTION: "bg-accent-soft text-accent-text border-accent/25",
  PAYMENT: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25",
  ORDER: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/25",
  PROMO: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/25",
  SYSTEM: "bg-sunken text-body border-line",
};

const timeAgo = (value) => {
  if (!value) return "";
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

/**
 * Notification bell for the vendor dashboard.
 *
 * Reads persisted notifications from the API and merges live socket pushes, so
 * the panel stays accurate across reloads rather than only holding
 * session-lifetime toasts.
 */
const VendorNotificationBell = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const load = useCallback(async (activeFilter) => {
    setLoading(true);
    try {
      const response = await api.get(`/notifications?filter=${activeFilter}&limit=40`);
      setNotifications(response.data || []);
      setUnreadCount(response.unreadCount || 0);
    } catch {
      // A failed poll should not disrupt the dashboard.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  // Refresh the badge periodically without opening the panel.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!open) load(filter);
    }, 60000);
    return () => clearInterval(timer);
  }, [filter, load, open]);

  // Close when clicking outside the bell.
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (id) => {
    try {
      const response = await api.patch(`/notifications/${id}/read`);
      setUnreadCount(response.unreadCount || 0);
      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, read: true } : item))
      );
    } catch {
      // Ignore — the panel refreshes on next open.
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch {
      // Ignore.
    }
  };

  const handleAction = (notification) => {
    if (!notification.read) markRead(notification._id);
    if (notification.actionRoute?.includes("tab=")) {
      const tab = notification.actionRoute.split("tab=")[1];
      onNavigate?.(tab);
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
          unreadCount > 0
            ? "border-accent/25 bg-accent-soft text-accent"
            : "border-line-strong bg-card text-muted hover:bg-accent-soft"
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-orange-600 px-1 text-[10px] font-black text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            // Anchors right on desktop; becomes a full-width sheet on mobile.
            className="fixed inset-x-3 top-20 z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[380px]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-heading">Notifications</p>
                <p className="text-[11px] font-bold text-muted">{unreadCount} unread</p>
              </div>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex-shrink-0 rounded-lg px-2 py-1 text-[11px] font-black text-accent hover:bg-accent-soft"
                >
                  Mark all read
                </button>
              ) : null}
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-black transition-colors ${
                    filter === item.id
                      ? "bg-orange-600 text-white"
                      : "text-muted hover:bg-sunken"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2].map((key) => (
                    <div key={key} className="h-16 animate-pulse rounded-xl bg-sunken" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-3xl">🔔</p>
                  <p className="mt-3 text-sm font-black text-heading">All caught up</p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    Subscription and quota updates will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`flex gap-3 border-b border-line px-4 py-3 last:border-0 ${
                      notification.read ? "" : "bg-accent-soft/40"
                    }`}
                  >
                    <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sunken text-base">
                      {notification.icon || "🔔"}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`min-w-0 text-sm leading-snug text-heading ${
                            notification.read ? "font-semibold" : "font-black"
                          }`}
                        >
                          {notification.title}
                        </p>
                        {!notification.read ? (
                          <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500" />
                        ) : null}
                      </div>

                      <p className="mt-0.5 break-words text-xs font-semibold leading-relaxed text-muted">
                        {notification.message}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                            CATEGORY_TONES[notification.category] || CATEGORY_TONES.SYSTEM
                          }`}
                        >
                          {notification.category}
                        </span>
                        <span className="text-[10px] font-bold text-muted">
                          {timeAgo(notification.createdAt)}
                        </span>

                        {notification.actionLabel ? (
                          <button
                            type="button"
                            onClick={() => handleAction(notification)}
                            className="ml-auto rounded-lg bg-stone-900 px-2.5 py-1 text-[10px] font-black text-white hover:bg-stone-700"
                          >
                            {notification.actionLabel}
                          </button>
                        ) : !notification.read ? (
                          <button
                            type="button"
                            onClick={() => markRead(notification._id)}
                            className="ml-auto text-[10px] font-black text-accent hover:underline"
                          >
                            Mark read
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default VendorNotificationBell;
