import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";

const NotificationContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api/v1", "") || "https://near-bitez.onrender.com";
const TOAST_DURATION = 5000;

// ─── Notification Types Config ────────────────────────────────────────────────
const NOTIF_CONFIG = {
  ORDER_PLACED:       { icon: "🎉", color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", accent: "#059669", label: "Order Placed" },
  ORDER_UPDATE:       { icon: "📦", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", accent: "#2563eb", label: "Order Update" },
  PREPARING:          { icon: "👨‍🍳", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", accent: "#d97706", label: "Being Prepared" },
  OUT_FOR_DELIVERY:   { icon: "🚴", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe", accent: "#7c3aed", label: "On the Way!" },
  DELIVERED:          { icon: "🎊", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", accent: "#c2410c", label: "Delivered!" },
  REJECTED:           { icon: "😞", color: "#ef4444", bg: "#fff5f5", border: "#fecaca", accent: "#dc2626", label: "Order Rejected" },
  CHAT:               { icon: "💬", color: "#06b6d4", bg: "#ecfeff", border: "#a5f3fc", accent: "#0891b2", label: "New Message" },
  PROMO:              { icon: "🎁", color: "#ec4899", bg: "#fdf2f8", border: "#fbcfe8", accent: "#db2777", label: "Special Offer" },
  XP_GAIN:            { icon: "⚡", color: "#fbbf24", bg: "#fffbeb", border: "#fde68a", accent: "#d97706", label: "XP Earned" },
  ACHIEVEMENT:        { icon: "🏆", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", accent: "#d97706", label: "Achievement!" },
  SOCIAL:             { icon: "🧑‍🤝‍🧑", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe", accent: "#7c3aed", label: "Food Connect" },
  default:            { icon: "🔔", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", accent: "#c2410c", label: "Notification" },
};

const getConfig = (type) => NOTIF_CONFIG[type] || NOTIF_CONFIG.default;

const getStatusTitle = (status) => ({
  ACCEPTED: "Order Accepted ✅", PREPARING: "Being Prepared 👨‍🍳", READY: "Ready for Pickup 📦",
  OUT_FOR_DELIVERY: "On the Way! 🚴", DELIVERED: "Delivered! 🎊", REJECTED: "Order Rejected ❌",
}[status] || "Order Update");

// ─── Unique Toast Component ────────────────────────────────────────────────────
const UniqueToast = ({ toast, onDismiss }) => {
  const cfg = getConfig(toast.type);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);

  useEffect(() => {
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
      setProgress(pct);
      if (pct <= 0) { clearInterval(timerRef.current); onDismiss(toast.id); }
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [onDismiss, toast.id]);

  return (
    <motion.div
      layout
      initial={{ x: 120, opacity: 0, scale: 0.85 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 120, opacity: 0, scale: 0.85 }}
      transition={{ type: "spring", damping: 20, stiffness: 280 }}
      style={{
        position: "relative",
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: 18,
        padding: "0",
        minWidth: 300, maxWidth: 360,
        boxShadow: `0 8px 28px rgba(0,0,0,0.1), 0 0 0 1px ${cfg.border}`,
        overflow: "hidden",
        cursor: "pointer",
      }}
      onClick={() => onDismiss(toast.id)}
    >
      {/* Progress bar at top */}
      <div style={{ height: 3, background: `${cfg.color}25`, overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05, ease: "linear" }}
          style={{ height: "100%", background: cfg.color, borderRadius: 100 }}
        />
      </div>

      <div style={{ padding: "12px 14px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Icon with animated ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              width: 42, height: 42, borderRadius: "50%",
              background: `${cfg.color}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
              border: `2px solid ${cfg.color}30`,
            }}
          >
            {cfg.icon}
          </motion.div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: cfg.accent }}>{cfg.label}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: `${cfg.color}80`, fontSize: 16, lineHeight: 1, padding: 0, marginLeft: 8 }}
            >×</button>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1c1c1c", margin: "0 0 2px", lineHeight: 1.3 }}>{toast.title}</p>
          <p style={{ fontSize: 11.5, color: "#6b7280", margin: 0, lineHeight: 1.4 }}>{toast.message}</p>
        </div>
      </div>

      {/* Special pulse for high-priority */}
      {(toast.type === "DELIVERED" || toast.type === "XP_GAIN" || toast.type === "ACHIEVEMENT") && (
        <motion.div
          animate={{ opacity: [0, 0.15, 0] }}
          transition={{ duration: 1, repeat: 2 }}
          style={{ position: "absolute", inset: 0, background: cfg.color, borderRadius: 18, pointerEvents: "none" }}
        />
      )}
    </motion.div>
  );
};

// ─── Achievement Unlock Popup ─────────────────────────────────────────────────
const AchievementUnlock = ({ achievement, onDone }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5, y: 50 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.8, y: -30 }}
    transition={{ type: "spring", damping: 16, stiffness: 200 }}
    onAnimationComplete={() => setTimeout(onDone, 2500)}
    style={{
      position: "fixed", top: "50%", left: "50%", zIndex: 10001,
      transform: "translate(-50%, -50%)",
      background: "linear-gradient(135deg,#1c1c1c,#2d1a00)",
      borderRadius: 28, padding: "32px 40px",
      textAlign: "center",
      boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)",
      border: "1.5px solid rgba(234,88,12,0.4)",
      maxWidth: 300, width: "90%",
      pointerEvents: "none",
    }}
  >
    <motion.div animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.3, 1] }} transition={{ duration: 0.6 }}
      style={{ fontSize: 52, marginBottom: 12, display: "block" }}>
      {achievement.icon}
    </motion.div>
    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#ea580c", marginBottom: 6 }}>Achievement Unlocked!</p>
    <p style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 4, letterSpacing: "-0.02em" }}>{achievement.name}</p>
    <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>{achievement.desc}</p>
    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5, repeat: 3 }}
      style={{ marginTop: 14, display: "inline-block", background: "rgba(234,88,12,0.2)", border: "1px solid rgba(234,88,12,0.4)", borderRadius: 100, padding: "6px 16px", fontSize: 12, fontWeight: 800, color: "#f97316" }}>
      +{achievement.xp} XP 🔥
    </motion.div>

    {/* Particle burst */}
    {[...Array(8)].map((_, i) => (
      <motion.div key={i}
        initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        animate={{ opacity: 0, x: Math.cos(i * 45 * Math.PI / 180) * 60, y: Math.sin(i * 45 * Math.PI / 180) * 60, scale: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        style={{ position: "absolute", top: "50%", left: "50%", width: 8, height: 8, borderRadius: "50%", background: ["#ea580c","#fbbf24","#f97316","#10b981","#3b82f6","#8b5cf6","#ec4899","#14b8a6"][i], pointerEvents: "none" }}
      />
    ))}
  </motion.div>
);

// ─── Notification Bell with unique animation ───────────────────────────────────
export const NotificationBell = ({ unreadCount, onClick }) => (
  <div style={{ position: "relative" }}>
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={unreadCount > 0 ? { rotate: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
      transition={{ duration: 0.6, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 4 }}
      onClick={onClick}
      style={{
        width: 40, height: 40, borderRadius: 12,
        border: unreadCount > 0 ? "1.5px solid #fed7aa" : "1.5px solid #f0ede8",
        background: unreadCount > 0 ? "#fff7ed" : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", position: "relative",
        color: unreadCount > 0 ? "#ea580c" : "#888",
      }}
      aria-label="Notifications"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: "absolute", top: -5, right: -5,
            background: "#ea580c", color: "#fff",
            fontSize: 9, fontWeight: 800,
            minWidth: 18, height: 18, borderRadius: 100,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px", border: "2px solid #fff",
          }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </motion.span>
      )}
    </motion.button>
  </div>
);

// ─── Notification Panel ────────────────────────────────────────────────────────
export const NotificationPanel = ({ notifications, onClear, onMarkRead }) => {
  const grouped = notifications.reduce((acc, n) => {
    const key = n.read ? "earlier" : "new";
    acc[key] = acc[key] || [];
    acc[key].push(n);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ type: "spring", damping: 22, stiffness: 300 }}
      style={{
        position: "absolute", top: "calc(100% + 10px)", right: 0,
        width: 360, maxHeight: "80vh",
        background: "#fff",
        border: "1.5px solid #f0ede8",
        borderRadius: 22,
        boxShadow: "0 20px 60px rgba(0,0,0,0.14), 0 4px 16px rgba(234,88,12,0.08)",
        zIndex: 200, overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #f5f2ee", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 900, color: "#1c1c1c", margin: 0 }}>Notifications</p>
          <p style={{ fontSize: 11, color: "#b0a898", margin: 0, fontWeight: 600 }}>{notifications.length} total</p>
        </div>
        {notifications.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onMarkRead} style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8 }}>Mark all read</button>
            <button onClick={onClear} style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8 }}>Clear all</button>
          </div>
        )}
      </div>

      {/* Notification list */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }} style={{ fontSize: 44, marginBottom: 12 }}>🔔</motion.div>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#1c1c1c", marginBottom: 4 }}>All caught up!</p>
            <p style={{ fontSize: 12, color: "#b0a898" }}>Notifications will appear here</p>
          </div>
        ) : (
          <>
            {grouped.new && grouped.new.length > 0 && (
              <div>
                <div style={{ padding: "8px 18px 4px", fontSize: 10, fontWeight: 800, color: "#ea580c", letterSpacing: "0.12em", textTransform: "uppercase" }}>New</div>
                {grouped.new.map(n => <NotifItem key={n.id} notif={n} />)}
              </div>
            )}
            {grouped.earlier && grouped.earlier.length > 0 && (
              <div>
                <div style={{ padding: "8px 18px 4px", fontSize: 10, fontWeight: 800, color: "#b0a898", letterSpacing: "0.12em", textTransform: "uppercase" }}>Earlier</div>
                {grouped.earlier.map(n => <NotifItem key={n.id} notif={n} />)}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

const NotifItem = ({ notif }) => {
  const cfg = getConfig(notif.type);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 18px", borderBottom: "1px solid #faf9f7", background: notif.read ? "transparent" : `${cfg.color}06`, transition: "background 0.15s", cursor: "default" }}
      onMouseEnter={e => e.currentTarget.style.background = "#faf9f7"}
      onMouseLeave={e => e.currentTarget.style.background = notif.read ? "transparent" : `${cfg.color}06`}
    >
      <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${cfg.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, border: `1.5px solid ${cfg.color}20` }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: notif.read ? 600 : 800, color: "#1c1c1c", margin: 0, lineHeight: 1.3 }}>{notif.title}</p>
          {!notif.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, flexShrink: 0, marginTop: 4 }} />}
        </div>
        <p style={{ fontSize: 11.5, color: "#6b7280", margin: "2px 0 3px", lineHeight: 1.4 }}>{notif.message}</p>
        <p style={{ fontSize: 10, color: "#c8c0b4", fontWeight: 600 }}>{formatTimeAgo(notif.createdAt)}</p>
      </div>
    </div>
  );
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [achievement, setAchievement] = useState(null);
  const socketRef = useRef(null);
  const toastTimers = useRef({});

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (toastTimers.current[id]) { clearTimeout(toastTimers.current[id]); delete toastTimers.current[id]; }
  }, []);

  const showToast = useCallback((notif) => {
    setToasts(prev => [notif, ...prev].slice(0, 4));
    toastTimers.current[notif.id] = setTimeout(() => dismissToast(notif.id), TOAST_DURATION + 500);
  }, [dismissToast]);

  const addNotification = useCallback((notif) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const entry = { ...notif, id, read: false, createdAt: notif.createdAt || new Date() };
    setNotifications(prev => [entry, ...prev].slice(0, 60));
    setUnreadCount(c => c + 1);
    showToast(entry);

    // Achievement check
    if (notif.type === "ACHIEVEMENT") {
      setAchievement(notif.achievement);
    }
  }, [showToast]);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"], withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", { userId: user._id, role: user.role });
    });

    socket.on("notification", addNotification);

    socket.on("order_status_update", (payload) => {
      const type = payload.status || "ORDER_UPDATE";
      addNotification({
        type: NOTIF_CONFIG[type] ? type : "ORDER_UPDATE",
        title: getStatusTitle(payload.status),
        message: payload.message || `Order is now: ${payload.status}`,
        orderId: payload.orderId,
        createdAt: new Date(),
      });
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [addNotification, isAuthenticated, user?._id, user?.role]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => { setNotifications([]); setUnreadCount(0); }, []);

  const pushNotification = useCallback((payload) => { addNotification(payload); }, [addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, clearAll, pushNotification, toasts }}>
      {children}

      {/* Toast Container */}
      <div style={{ position: "fixed", bottom: 24, right: 20, zIndex: 9999, display: "flex", flexDirection: "column-reverse", gap: 10, pointerEvents: "none", maxWidth: 380 }}>
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <div key={toast.id} style={{ pointerEvents: "all" }}>
              <UniqueToast toast={toast} onDismiss={dismissToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Achievement Unlock Overlay */}
      <AnimatePresence>
        {achievement && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 10000, backdropFilter: "blur(4px)" }} />
            <AchievementUnlock achievement={achievement} onDone={() => setAchievement(null)} />
          </>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};

// ─── Utils ────────────────────────────────────────────────────────────────────
function formatTimeAgo(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};

export default NotificationContext;
