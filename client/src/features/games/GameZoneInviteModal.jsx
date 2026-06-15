import { useEffect, useMemo, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { useAuth } from "../../hooks/useAuth.js";
import { SOCKET_URL } from "../../config/runtime.js";

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const CookingIllustration = () => (
  <svg viewBox="0 0 260 180" className="mx-auto h-40 w-full max-w-[260px]" aria-hidden="true">
    <style>{`
      .cook-pot { animation: cook-pot-bob 1.6s ease-in-out infinite; transform-origin: center; }
      .cook-steam { animation: cook-steam-rise 1.5s ease-in-out infinite; opacity: 0.72; }
      .cook-steam-two { animation-delay: 0.28s; }
      .cook-flame { animation: cook-flame 0.72s ease-in-out infinite alternate; transform-origin: bottom center; }
      @keyframes cook-pot-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      @keyframes cook-steam-rise { 0% { transform: translateY(12px); opacity: 0; } 45% { opacity: 0.72; } 100% { transform: translateY(-10px); opacity: 0; } }
      @keyframes cook-flame { from { transform: scaleY(0.82); } to { transform: scaleY(1.12); } }
    `}</style>
    <rect x="42" y="132" width="176" height="14" rx="7" fill="#fed7aa" />
    <g className="cook-steam" fill="none" stroke="#ea580c" strokeLinecap="round" strokeWidth="5">
      <path d="M95 67c-12-13 14-18 1-32" />
      <path className="cook-steam-two" d="M130 66c-13-12 13-19 1-34" />
      <path d="M165 67c-11-12 12-16 1-31" />
    </g>
    <g className="cook-pot">
      <path d="M70 84h120l-12 54H82L70 84Z" fill="#ffffff" stroke="#ea580c" strokeWidth="5" />
      <path d="M62 84h136" stroke="#9a3412" strokeLinecap="round" strokeWidth="8" />
      <path d="M84 78c9-15 83-15 92 0" fill="none" stroke="#ea580c" strokeLinecap="round" strokeWidth="5" />
      <circle cx="96" cy="109" r="5" fill="#fed7aa" />
      <circle cx="130" cy="112" r="5" fill="#fdba74" />
      <circle cx="164" cy="108" r="5" fill="#f97316" />
    </g>
    <g className="cook-flame">
      <path d="M108 145c-8-16 9-20 6-34 17 15 19 22 7 34Z" fill="#f97316" />
      <path d="M142 145c-7-14 8-17 5-30 15 13 17 20 6 30Z" fill="#fbbf24" />
    </g>
  </svg>
);

const GameZoneInviteModal = ({ open, order, onEnter, onTrack, onOutForDelivery }) => {
  const { user } = useAuth();
  const [mountedAt] = useState(() => Date.now());
  const etaMs = useMemo(() => {
    const created = order?.createdAt ? new Date(order.createdAt).getTime() : mountedAt;
    const minutes = Number(order?.restaurant?.deliveryTime || order?.estimatedDeliveryMinutes || 30);
    return created + minutes * 60 * 1000;
  }, [mountedAt, order]);
  const [remaining, setRemaining] = useState(() => etaMs - Date.now());

  useEffect(() => {
    if (!open) return undefined;
    const id = window.setInterval(() => setRemaining(etaMs - Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [etaMs, open]);

  useEffect(() => {
    if (!open || !user?._id) return undefined;
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"], withCredentials: true });
    socket.on("connect", () => {
      socket.emit("join", { userId: String(user._id), role: user.role || "customer" });
    });
    socket.on("order:out_for_delivery", (payload) => {
      if (!order?._id || String(payload?.orderId) === String(order._id)) {
        onOutForDelivery?.();
      }
    });
    return () => socket.disconnect();
  }, [onOutForDelivery, open, order?._id, user?._id, user?.role]);

  return (
    <AnimatePresence>
      {open ? (
        <Motion.div
          className="fixed inset-0 z-50 grid place-items-end bg-orange-950/25 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="w-full max-w-lg rounded-t-[28px] bg-[#fafaf8] p-5 shadow-2xl sm:rounded-[28px]"
          >
            <CookingIllustration />
            <p className="text-center text-[11px] font-black uppercase text-orange-600">
              Order #{String(order?._id || "").slice(-6)}
            </p>
            <h2 className="mt-2 text-center text-3xl font-black text-stone-950">
              Your food is cooking...
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-center text-sm font-semibold leading-6 text-stone-500">
              {order?.restaurant?.name || "The restaurant"} is preparing your order. Play while the kitchen works.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[18px] bg-white p-4 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
                <p className="text-[11px] font-bold uppercase text-stone-400">ETA</p>
                <p className="mt-2 text-2xl font-medium text-stone-950">{formatCountdown(remaining)}</p>
              </div>
              <div className="rounded-[18px] bg-white p-4 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
                <p className="text-[11px] font-bold uppercase text-stone-400">Delivery</p>
                <p className="mt-2 text-2xl font-medium text-stone-950">
                  {order?.restaurant?.deliveryTime || 30}m
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onEnter}
              className="mt-5 min-h-11 w-full rounded-full bg-[#ea580c] px-5 py-3 text-sm font-black text-white transition hover:bg-orange-700"
            >
              Enter Game Zone 🎮
            </button>
            <button
              type="button"
              onClick={onTrack}
              className="mt-3 min-h-11 w-full rounded-full border border-orange-200 bg-transparent px-5 py-3 text-xs font-black text-orange-700"
            >
              Track my order instead
            </button>
          </Motion.div>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default GameZoneInviteModal;
