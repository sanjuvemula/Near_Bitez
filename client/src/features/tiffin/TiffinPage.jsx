/**
 * TiffinPage.jsx
 *
 * NEW (vs previous version):
 * ✅ Socket.io wiring — emits join_tiffin on mount, leave_tiffin on unmount
 * ✅ Listens for tiffin_updated event — updates list in real-time
 *    • If vendor's tiffinAvailable === false → remove from list
 *    • If vendor already in list → update in place
 *    • If new vendor → prepend to top
 * ✅ UI upgrade — richer palette, smoother skeleton, duration filter
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { api } from "../../services/api.js";
import TiffinCard from "./TiffinCard.jsx";

// ─── Socket URL — adjust to match your server ────────────────────────────────
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://near-bitez.onrender.com";

// ─── Filter pill ──────────────────────────────────────────────────────────────
const FilterPill = ({ label, active, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.96 }}
    onClick={onClick}
    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition-all
      ${active
        ? "border-orange-500 bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-200"
        : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-600"}`}
  >
    {label}
  </motion.button>
);

// ─── Skeleton card ────────────────────────────────────────────────────────────
const SkeletonCard = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay }}
    className="overflow-hidden rounded-3xl border border-slate-100 bg-white"
  >
    <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-50 animate-pulse" />
    <div className="p-4 space-y-3">
      <div className="h-4 w-2/3 rounded-full bg-slate-100 animate-pulse" />
      <div className="h-3 w-full rounded-full bg-slate-100 animate-pulse" />
      <div className="h-3 w-4/5 rounded-full bg-slate-100 animate-pulse" />
      <div className="h-10 w-full rounded-full bg-slate-100 animate-pulse mt-4" />
    </div>
  </motion.div>
);

// ─── Stats bar ────────────────────────────────────────────────────────────────
const StatsBar = ({ count }) => {
  const items = [
    { icon: "🏪", val: count,  label: "Providers"  },
    { icon: "🛵", val: "Free", label: "Delivery"   },
    { icon: "🔓", val: "None", label: "Lock-in"    },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {items.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm"
        >
          <div className="text-xl mb-0.5">{s.icon}</div>
          <div className="text-base font-black text-slate-800">{s.val}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            {s.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ─── Live update toast ────────────────────────────────────────────────────────
const LiveToast = ({ msg }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.9 }}
    animate={{ opacity: 1, y: 0,  scale: 1   }}
    exit={{ opacity: 0, y: -20, scale: 0.9 }}
    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl pointer-events-none"
  >
    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
    {msg}
  </motion.div>
);

// ══════════════════════════════════════════════════════════════════════════════
// FILTERS
// ══════════════════════════════════════════════════════════════════════════════
const FILTERS = [
  { key: "all",     label: "All"          },
  { key: "veg",     label: "🌿 Pure Veg"  },
  { key: "non-veg", label: "🍗 Non-Veg"   },
  { key: "both",    label: "🍽️ Mixed"    },
  { key: "delivery",label: "🛵 Delivery"  },
  { key: "pickup",  label: "🏪 Pickup"    },
  { key: "weekly",  label: "📅 Weekly"    },
  { key: "monthly", label: "📅 Monthly"   },
];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
const TiffinPage = () => {
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [tiffins, setTiffins]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [filter, setFilter]             = useState("all");
  const [subscribedIds, setSubscribedIds] = useState([]);
  const [toast, setToast]               = useState(null);
  const [liveToast, setLiveToast]       = useState(null);

  // ── Fetch tiffin providers ────────────────────────────────────────────────
  const fetchTiffins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await api.get("/tiffins");
      const data = res.data?.data || [];
      setTiffins(data);
    } catch {
      setError("Could not load tiffin providers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Mount: fetch + connect socket ─────────────────────────────────────────
  useEffect(() => {
    fetchTiffins();

    // Connect socket and join the tiffin room
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_tiffin");
    });

    // Real-time tiffin updates from vendors
    socket.on("tiffin_updated", (updatedTiffin) => {
      setTiffins(prev => {
        // If vendor turned off tiffinAvailable, remove from list
        if (!updatedTiffin?.tiffinAvailable) {
          return prev.filter(t => String(t._id) !== String(updatedTiffin._id));
        }
        // If vendor already in list, update in place
        const idx = prev.findIndex(t => String(t._id) === String(updatedTiffin._id));
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = updatedTiffin;
          return next;
        }
        // New vendor — prepend to top
        return [updatedTiffin, ...prev];
      });

      // Show live update indicator
      const name = updatedTiffin?.vendorName || "A vendor";
      setLiveToast(`🔄 ${name} just updated their plan`);
      setTimeout(() => setLiveToast(null), 3000);
    });

    // Cleanup: leave room + disconnect
    return () => {
      socket.emit("leave_tiffin");
      socket.disconnect();
    };
  }, [fetchTiffins]);

  const handleSubscribe = (tiffin) => {
    setSubscribedIds(prev => [...prev, tiffin._id]);
    setToast(`🎉 Subscribed to ${tiffin.vendorName}!`);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Apply filters ─────────────────────────────────────────────────────────
  const filtered = tiffins.filter(t => {
    if (filter === "all")      return true;
    if (filter === "delivery") return t.deliveryType === "delivery" || t.deliveryType === "both";
    if (filter === "pickup")   return t.deliveryType === "pickup"   || t.deliveryType === "both";
    if (filter === "weekly")   return t.duration === "weekly";
    if (filter === "monthly")  return t.duration === "monthly";
    return t.mealType === filter;
  });

  return (
    <div
      className="mx-auto max-w-2xl"
      style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
        .nb-no-scrollbar::-webkit-scrollbar { display: none; }
        .nb-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ── Subscribe toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0,  scale: 1   }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl pointer-events-none whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Live update toast ── */}
      <AnimatePresence>
        {liveToast && <LiveToast msg={liveToast} />}
      </AnimatePresence>

      {/* ── Hero banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl mb-5 p-6"
        style={{
          background: "linear-gradient(135deg, #1c1917 0%, #431407 50%, #1c1917 100%)",
        }}
      >
        {/* Decorative glows */}
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 h-32 w-32 rounded-full bg-rose-500/10 blur-xl pointer-events-none" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/80 backdrop-blur transition hover:bg-white/20"
        >
          ← Back
        </button>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            {/* Label pill */}
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/15 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-300">
                Daily Tiffin
              </span>
            </div>

            <h1 className="text-2xl font-black leading-tight tracking-tight text-white mb-2">
              Fresh Home Meals,<br />Delivered Daily
            </h1>
            <p className="text-xs font-semibold text-white/50">
              Subscribe to a plan · Cancel anytime · Real-time availability
            </p>
          </div>
          <span className="text-6xl shrink-0 opacity-90">🍱</span>
        </div>
      </motion.div>

      {/* ── Stats bar ── */}
      {!loading && !error && <StatsBar count={tiffins.length} />}

      {/* ── Filters ── */}
      <div
        className="nb-no-scrollbar flex gap-2 overflow-x-auto pb-1 mb-5"
      >
        {FILTERS.map(f => (
          <FilterPill
            key={f.key}
            label={f.label}
            active={filter === f.key}
            onClick={() => setFilter(f.key)}
          />
        ))}
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} delay={i * 0.07} />)}
        </div>
      )}

      {/* ── Error state ── */}
      {!loading && error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-3xl border border-rose-100 bg-rose-50 p-12 text-center"
        >
          <span className="text-4xl">😕</span>
          <p className="mt-4 text-base font-black text-slate-800">Something went wrong</p>
          <p className="mt-1 text-sm text-slate-500 mb-5">{error}</p>
          <button
            onClick={fetchTiffins}
            className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2.5 text-sm font-black text-white shadow-md"
          >
            Try again
          </button>
        </motion.div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/40 p-12 text-center"
        >
          <span className="text-5xl">🥡</span>
          <p className="mt-4 text-lg font-black text-slate-800">
            {tiffins.length === 0
              ? "No tiffin providers yet"
              : "No providers match this filter"}
          </p>
          <p className="mt-1 text-sm text-slate-500 mb-5">
            {tiffins.length === 0
              ? "Vendors can enable tiffin service from their dashboard"
              : "Try a different filter above"}
          </p>
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2.5 text-sm font-black text-white shadow-md"
            >
              Show all
            </button>
          )}
        </motion.div>
      )}

      {/* ── Tiffin grid ── */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {filtered.length} provider{filtered.length !== 1 ? "s" : ""} available
            </p>
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-700">Live updates on</span>
            </div>
          </div>

          <div
            className="mb-8"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}
          >
            {filtered.map((tiffin, i) => (
              <TiffinCard
                key={tiffin._id}
                tiffin={tiffin}
                index={i}
                subscribed={subscribedIds.includes(tiffin._id)}
                onSubscribe={handleSubscribe}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Why tiffin section ── */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl overflow-hidden mb-8"
          style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7,#fff7ed)" }}
        >
          <div className="border border-amber-200/60 rounded-3xl p-5">
            <p className="text-sm font-black text-amber-800 mb-4">🌟 Why choose a Tiffin plan?</p>
            <div className="space-y-3">
              {[
                { icon: "💰", text: "Save up to 40% vs ordering individually every day" },
                { icon: "🥗", text: "Fresh, home-style meals — no preservatives"        },
                { icon: "📅", text: "Flexible plans — pause or cancel anytime"           },
                { icon: "🛵", text: "Free daily delivery right to your door"             },
              ].map(item => (
                <div key={item.icon} className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <p className="text-sm font-semibold text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TiffinPage;