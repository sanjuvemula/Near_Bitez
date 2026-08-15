/**
 * VendorTiffinTab.jsx
 *
 * BUGS FIXED (all preserved):
 * ✅ Bug 2 — Form container is plain <div>, never a motion/Panel component
 * ✅ Bug 3 — useEffect has `if (isEditing) return` guard to block poll resets
 * ✅ Bug 4 — All tiffin fields in schema (Restaurant.js)
 * ✅ Bug 5 — form state updated from API response immediately after save
 *
 * NEW:
 * ✅ tiffinDuration field (Weekly / 10 Days / 15 Days / Monthly)
 * ✅ Preview card reflects duration dynamically
 * ✅ Full UI upgrade — richer palette, glassy cards, gradient accents
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { api } from "../../../services/api.js";
import { formatCurrency } from "../../../utils/formatters.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const MEAL_TYPES = [
  { value: "veg",     label: "🌿 Pure Veg",      bg: "from-emerald-500 to-teal-500" },
  { value: "non-veg", label: "🍗 Non-Veg",        bg: "from-rose-500 to-pink-500"   },
  { value: "both",    label: "🍽️ Veg & Non-Veg", bg: "from-amber-500 to-orange-500" },
];

const DELIVERY_TYPES = [
  { value: "delivery", label: "🛵 Delivery only"       },
  { value: "pickup",   label: "🏪 Pickup only"         },
  { value: "both",     label: "🛵🏪 Delivery & Pickup" },
];

const DURATION_OPTIONS = [
  { value: "weekly",   label: "Weekly",   days: "7 days",  color: "from-sky-500 to-indigo-500"    },
  { value: "10days",   label: "10 Days",  days: "10 days", color: "from-violet-500 to-purple-500" },
  { value: "15days",   label: "15 Days",  days: "15 days", color: "from-fuchsia-500 to-pink-500"  },
  { value: "monthly",  label: "Monthly",  days: "30 days", color: "from-orange-500 to-red-500"    },
];

const DURATION_LABELS = {
  weekly:  "Weekly plan",
  "10days": "10-day plan",
  "15days": "15-day plan",
  monthly: "Monthly plan",
};

const EMPTY_FORM = {
  tiffinAvailable:   true,
  tiffinPrice:       "",
  tiffinMealType:    "veg",
  tiffinDescription: "",
  tiffinDeliveryType:"delivery",
  tiffinMealsPerDay: 1,
  tiffinDuration:    "monthly",
  tiffinWeeklyMenu:  {
    Monday:"",Tuesday:"",Wednesday:"",Thursday:"",
    Friday:"",Saturday:"",Sunday:"",
  },
};

// ─── Input class strings (plain CSS — no wrapper component) ───────────────────
const INPUT =
  "w-full rounded-2xl border-2 border-slate-100 dark:border-slate-500/25 bg-card/80 px-4 py-3.5 " +
  "text-sm font-semibold text-slate-800 dark:text-body outline-none transition-all " +
  "placeholder:text-muted " +
  "focus:border-orange-400 focus:bg-card focus:ring-4 focus:ring-accent/15 " +
  "hover:border-accent/25 backdrop-blur-sm";

const SELECT = INPUT + " cursor-pointer appearance-none";
const LABEL  = "mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-muted";

// ─── Small helpers ────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path  className="opacity-75"  fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const SectionHeader = ({ n, label, gradient }) => (
  <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-500/25">
    <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-[11px] font-black text-white shadow-sm`}>
      {n}
    </span>
    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">{label}</span>
  </div>
);

// ─── Duration badge ───────────────────────────────────────────────────────────
const DurationBadge = ({ value }) => {
  const opt = DURATION_OPTIONS.find(d => d.value === value) || DURATION_OPTIONS[3];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${opt.color} px-3 py-1 text-[11px] font-black text-white shadow-sm`}>
      📅 {opt.label}
    </span>
  );
};

// ─── Meal badge ───────────────────────────────────────────────────────────────
const MealBadge = ({ type }) => {
  const cfg = {
    veg:      { text: "🌿 Pure Veg",       cls: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300" },
    "non-veg":{ text: "🍗 Non-Veg",        cls: "bg-rose-50 dark:bg-rose-500/10    border-rose-200 dark:border-rose-500/25    text-rose-700 dark:text-rose-300"    },
    both:     { text: "🍽️ Veg & Non-Veg", cls: "bg-amber-50 dark:bg-amber-500/10   border-amber-200 dark:border-amber-500/25   text-amber-700 dark:text-amber-300"   },
  }[type] ?? { text: "Veg", cls: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black ${cfg.cls}`}>
      {cfg.text}
    </span>
  );
};

const DeliveryBadge = ({ type }) => {
  const label = { delivery:"🛵 Delivery", pickup:"🏪 Pickup", both:"🛵 + 🏪" }[type] ?? "🛵 Delivery";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 dark:border-sky-500/25 bg-sky-50 dark:bg-sky-500/10 px-3 py-1 text-[11px] font-black text-sky-700 dark:text-sky-300">
      {label}
    </span>
  );
};

// ─── Day colour cycling ───────────────────────────────────────────────────────
const DAY_COLORS = [
  "border-rose-200 dark:border-rose-500/25    focus:border-rose-400    focus:ring-rose-100/60    bg-rose-50/30",
  "border-accent/25  focus:border-orange-400  focus:ring-accent/15  bg-accent-soft/30",
  "border-amber-200 dark:border-amber-500/25   focus:border-amber-400   focus:ring-amber-100/60   bg-amber-50/30",
  "border-lime-200 dark:border-lime-500/25    focus:border-lime-400    focus:ring-lime-100/60    bg-lime-50/30 dark:bg-lime-500/10",
  "border-teal-200 dark:border-teal-500/25    focus:border-teal-400    focus:ring-teal-100/60    bg-teal-50/30 dark:bg-teal-500/10",
  "border-sky-200 dark:border-sky-500/25     focus:border-sky-400     focus:ring-sky-100/60     bg-sky-50/30",
  "border-violet-200 dark:border-violet-500/25  focus:border-violet-400  focus:ring-violet-100/60  bg-violet-50/30 dark:bg-violet-500/10",
];

// ─── Preview Card ─────────────────────────────────────────────────────────────
const PreviewCard = ({ form, restaurant }) => {
  const hasMenu = Object.values(form.tiffinWeeklyMenu ?? {}).some(Boolean);
  const durOpt  = DURATION_OPTIONS.find(d => d.value === form.tiffinDuration) || DURATION_OPTIONS[3];

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-[0_24px_64px_-20px_rgba(234,88,12,0.22)] ring-1 ring-orange-100/50">
      {/* Banner */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-rose-50 dark:bg-none dark:bg-raised">
        {restaurant?.imageUrl ? (
          <img src={restaurant.imageUrl} alt={restaurant?.name}
            className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-8xl opacity-10">🍱</span>
          </div>
        )}
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Vendor name */}
        <div className="absolute bottom-0 inset-x-0 p-5">
          <p className="text-lg font-black text-heading drop-shadow-lg">
            {restaurant?.name ?? "Your Restaurant"}
          </p>
        </div>

        {/* Live badge */}
        <div className="absolute right-3 top-3">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black backdrop-blur-sm
            ${form.tiffinAvailable
              ? "border-emerald-200 dark:border-emerald-500/25/60 bg-emerald-500/80 text-white"
              : "border-white/20 bg-black/40 text-white/70"}`}>
            <span className={`h-2 w-2 rounded-full ${form.tiffinAvailable ? "bg-white animate-pulse" : "bg-white/50"}`} />
            {form.tiffinAvailable ? "LIVE" : "PAUSED"}
          </span>
        </div>

        {/* Duration badge top-left */}
        <div className="absolute left-3 top-3">
          <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${durOpt.color} px-3 py-1 text-[10px] font-black text-white shadow`}>
            📅 {durOpt.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Price + desc */}
        <div className="flex items-start justify-between gap-3">
          <p className="flex-1 text-sm font-medium leading-relaxed text-muted line-clamp-2">
            {form.tiffinDescription || "Your tiffin description will appear here…"}
          </p>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-black text-orange-500">
              {form.tiffinPrice ? formatCurrency(Number(form.tiffinPrice)) : "₹ —"}
            </p>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
              per {durOpt.label.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <MealBadge type={form.tiffinMealType} />
          <DeliveryBadge type={form.tiffinDeliveryType} />
          <span className="rounded-full border border-indigo-200 dark:border-indigo-500/25 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 text-[11px] font-black text-indigo-700 dark:text-indigo-300">
            {form.tiffinMealsPerDay} meal{Number(form.tiffinMealsPerDay) > 1 ? "s" : ""}/day
          </span>
          <DurationBadge value={form.tiffinDuration} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Meals/day",  value: form.tiffinMealsPerDay },
            { label: "Duration",   value: durOpt.days },
            { label: "Plan",       value: durOpt.label },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl bg-gradient-to-br from-slate-50 to-orange-50/30 border border-slate-100 dark:border-slate-500/25 p-3 dark:bg-none dark:bg-raised">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted">{label}</p>
              <p className="mt-1 text-sm font-black text-slate-800 dark:text-body">{value}</p>
            </div>
          ))}
        </div>

        {/* Weekly menu preview */}
        {hasMenu && (
          <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-orange-50/50 to-amber-50/30 p-4 dark:bg-none dark:bg-raised">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted">
              This Week's Menu
            </p>
            <div className="space-y-1.5">
              {DAYS.filter(d => form.tiffinWeeklyMenu?.[d]).map((day) => (
                <div key={day} className="flex items-start gap-3">
                  <span className="mt-0.5 w-8 shrink-0 text-[10px] font-black uppercase text-orange-400">
                    {day.slice(0, 3)}
                  </span>
                  <span className="text-xs font-semibold leading-5 text-muted dark:text-body">
                    {form.tiffinWeeklyMenu[day]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Realtime sync badge */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-500/25 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 dark:bg-none dark:bg-raised">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
            Customers see your changes instantly — real-time sync enabled
          </p>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const VendorTiffinTab = ({ restaurant }) => {
  const [form, setForm]           = useState(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [toggling, setToggling]   = useState(false);

  // ── Sync from restaurant prop ONLY when form is closed ────────────────────
  // Dashboard polls every 5-12 s → new `restaurant` ref each time.
  // Guard prevents poll from resetting the form mid-typing.
  useEffect(() => {
    if (!restaurant) return;
    if (isEditing) return; // ← CRITICAL: never overwrite while user is editing
    setForm({
      tiffinAvailable:   restaurant.tiffinAvailable   ?? false,
      tiffinPrice:       restaurant.tiffinPrice        ?? "",
      tiffinMealType:    restaurant.tiffinMealType     ?? "veg",
      tiffinDescription: restaurant.tiffinDescription  ?? "",
      tiffinDeliveryType:restaurant.tiffinDeliveryType ?? "delivery",
      tiffinMealsPerDay: restaurant.tiffinMealsPerDay  ?? 1,
      tiffinDuration:    restaurant.tiffinDuration     ?? "monthly",
      tiffinWeeklyMenu:  restaurant.tiffinWeeklyMenu   ?? {
        Monday:"",Tuesday:"",Wednesday:"",Thursday:"",
        Friday:"",Saturday:"",Sunday:"",
      },
    });
  }, [restaurant, isEditing]);

  // ── Stable field setter — no motion component remounts ────────────────────
  const setField = useCallback((key, value) =>
    setForm(prev => ({ ...prev, [key]: value })), []);

  const setMenuDay = useCallback((day, value) =>
    setForm(prev => ({
      ...prev,
      tiffinWeeklyMenu: { ...prev.tiffinWeeklyMenu, [day]: value },
    })), []);

  // ── Build PUT payload (preserves ALL existing restaurant fields) ──────────
  const buildPayload = useCallback(() => ({
    name:        restaurant?.name        || "",
    description: restaurant?.description || "",
    address:     restaurant?.address     || "",
    category:    restaurant?.category    || "",
    cuisineType: JSON.stringify(restaurant?.cuisineType || []),
    deliveryTime:restaurant?.deliveryTime || 30,
    isVegOnly:   restaurant?.isVegOnly   ?? false,
    isActive:    restaurant?.isActive    ?? true,
    tiffinAvailable:   form.tiffinAvailable,
    tiffinPrice:       Number(form.tiffinPrice),
    tiffinMealType:    form.tiffinMealType,
    tiffinDescription: form.tiffinDescription,
    tiffinDeliveryType:form.tiffinDeliveryType,
    tiffinMealsPerDay: Number(form.tiffinMealsPerDay),
    tiffinDuration:    form.tiffinDuration,
    tiffinWeeklyMenu:  JSON.stringify(form.tiffinWeeklyMenu),
  }), [form, restaurant]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!form.tiffinPrice || Number(form.tiffinPrice) <= 0) {
      toast.error("Enter a valid price first");
      return;
    }
    setSaving(true);
    try {
      const res  = await api.put("/vendor/restaurant", buildPayload());
      const saved = res.data?.data || res.data;
      // Immediately sync form from saved response — don't wait for next poll.
      // This makes hasTiffinData true right away so preview appears instantly.
      if (saved) {
        setForm({
          tiffinAvailable:   saved.tiffinAvailable   ?? form.tiffinAvailable,
          tiffinPrice:       saved.tiffinPrice        ?? form.tiffinPrice,
          tiffinMealType:    saved.tiffinMealType     ?? form.tiffinMealType,
          tiffinDescription: saved.tiffinDescription  ?? form.tiffinDescription,
          tiffinDeliveryType:saved.tiffinDeliveryType ?? form.tiffinDeliveryType,
          tiffinMealsPerDay: saved.tiffinMealsPerDay  ?? form.tiffinMealsPerDay,
          tiffinDuration:    saved.tiffinDuration     ?? form.tiffinDuration,
          tiffinWeeklyMenu:  saved.tiffinWeeklyMenu   ?? form.tiffinWeeklyMenu,
        });
      }
      toast.success("Tiffin plan saved! Customers see it instantly 🚀");
      setIsEditing(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save — try again");
    } finally {
      setSaving(false);
    }
  }, [form, buildPayload]);

  // ── Quick availability toggle ─────────────────────────────────────────────
  const handleToggleAvailable = useCallback(async () => {
    const next = !form.tiffinAvailable;
    setField("tiffinAvailable", next);
    setToggling(true);
    try {
      await api.put("/vendor/restaurant", { ...buildPayload(), tiffinAvailable: next });
      toast.success(next ? "Tiffin is now live for customers!" : "Tiffin paused — hidden from customers");
    } catch {
      setField("tiffinAvailable", !next);
      toast.error("Failed to update tiffin visibility");
    } finally {
      setToggling(false);
    }
  }, [form, buildPayload, setField]);

  // Check both restaurant prop AND local form for immediate post-save preview
  const hasTiffinData =
    Number(restaurant?.tiffinPrice) > 0 ||
    Number(form.tiffinPrice) > 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_500px]">

      {/* ════════════════════════════════════════════════════════════════════
          LEFT — header + preview
      ════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-5">

        {/* Header card */}
        <div className="relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600 p-6 shadow-lg shadow-orange-200">
          {/* Decorative circles */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-white/10" />
          <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-black/10" />

          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur text-xl">
                  🍱
                </div>
                <h2 className="text-2xl font-black tracking-tight text-heading">
                  Tiffin Service
                </h2>
              </div>
              <p className="text-sm font-medium text-orange-100">
                {hasTiffinData
                  ? "Plan configured — edits sync to every customer instantly."
                  : "Set up a daily tiffin subscription for students & professionals."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {hasTiffinData && (
                <button
                  onClick={handleToggleAvailable}
                  disabled={toggling}
                  className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-xs font-black backdrop-blur-sm transition-all
                    ${form.tiffinAvailable
                      ? "border-white/30 bg-white/20 text-heading hover:bg-white/30"
                      : "border-white/20 bg-black/20 text-white/70 hover:bg-black/30"}`}
                >
                  {toggling
                    ? <Spinner />
                    : <span className={`h-2 w-2 rounded-full ${form.tiffinAvailable ? "bg-white animate-pulse" : "bg-white/50"}`} />}
                  {form.tiffinAvailable ? "Live — pause" : "Paused — go live"}
                </button>
              )}
              <button
                onClick={() => setIsEditing(v => !v)}
                className="flex items-center gap-2 rounded-2xl bg-card px-5 py-2.5 text-sm font-black text-accent shadow-md transition hover:bg-accent-soft active:scale-95"
              >
                {isEditing ? "✕ Close" : hasTiffinData ? "✏️ Edit Plan" : "+ Create Plan"}
              </button>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {!hasTiffinData ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-accent/25 bg-gradient-to-br from-orange-50/50 to-amber-50/30 p-16 text-center dark:bg-none dark:bg-raised">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-amber-100 text-4xl shadow-inner dark:bg-none dark:bg-raised">
              🍱
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-body">No Tiffin Plan Yet</h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
              Create a subscription plan and get steady recurring orders from students and professionals near you.
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-6 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:from-orange-600 hover:to-orange-700 active:scale-95"
            >
              Create Your First Plan →
            </button>
          </div>
        ) : (
          /* Live preview */
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted">
              Live Preview — exactly what customers see
            </p>
            <PreviewCard form={form} restaurant={restaurant} />
          </motion.div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT — Edit form
          CRITICAL: outermost animated wrapper is motion.div (entry/exit only).
          The actual form container is a plain <div> — never motion, never Panel.
          This prevents framer from remounting inputs on state change.
      ════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            key="tiffin-edit-form"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            {/* ↓ Plain div — no motion inside here */}
            <div className="sticky top-6 flex max-h-[calc(100vh-120px)] flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-500/25/80 bg-card shadow-[0_32px_80px_-20px_rgba(15,23,42,0.18)]">

              {/* Form header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-500/25 bg-gradient-to-r from-slate-50 to-orange-50/40 px-6 py-4 dark:bg-none dark:bg-raised">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-lg shadow">
                    🗓️
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">Configure Tiffin</h2>
                    <p className="text-[10px] font-bold text-muted">All changes go live on save</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-500/25 bg-card text-muted transition hover:border-rose-200 dark:border-rose-500/25 hover:bg-rose-50 dark:bg-rose-500/10 hover:text-rose-500"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable form body */}
              <div
                className="flex-1 overflow-y-auto px-6 py-6 space-y-7"
                style={{ scrollbarWidth: "thin" }}
              >

                {/* ── SECTION 1: Visibility ── */}
                <div className="space-y-3">
                  <SectionHeader n="1" label="Visibility" gradient="from-orange-500 to-amber-500" />

                  <label className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 p-4 transition-all
                    ${form.tiffinAvailable
                      ? "border-emerald-200 dark:border-emerald-500/25 bg-gradient-to-r from-emerald-50 to-teal-50"
                      : "border-slate-100 dark:border-slate-500/25 bg-slate-50/50 hover:border-accent/25"} dark:bg-none dark:bg-raised`}>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-body">Show on customer app</p>
                      <p className="mt-0.5 text-xs font-medium text-muted">
                        When off, your tiffin plan is hidden from all customers
                      </p>
                    </div>
                    <div
                      className={`relative flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-colors
                        ${form.tiffinAvailable
                          ? "border-emerald-400 bg-emerald-500"
                          : "border-slate-200 dark:border-slate-500/25 bg-slate-200"}`}
                    >
                      <motion.div
                        layout
                        transition={{ type: "spring", stiffness: 600, damping: 35 }}
                        className={`absolute h-5 w-5 rounded-full bg-card shadow ${form.tiffinAvailable ? "right-1" : "left-1"}`}
                      />
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.tiffinAvailable}
                        onChange={e => setField("tiffinAvailable", e.target.checked)}
                      />
                    </div>
                  </label>
                </div>

                {/* ── SECTION 2: Plan Details ── */}
                <div className="space-y-4">
                  <SectionHeader n="2" label="Plan Details" gradient="from-orange-500 to-rose-500" />

                  {/* Price */}
                  <div>
                    <label className={LABEL}>Price (₹)</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-orange-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 1999"
                        className={INPUT + " pl-9"}
                        value={form.tiffinPrice}
                        onChange={e => setField("tiffinPrice", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Duration — NEW FIELD */}
                  <div>
                    <label className={LABEL}>Plan Duration</label>
                    <div className="grid grid-cols-2 gap-2">
                      {DURATION_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setField("tiffinDuration", opt.value)}
                          className={`relative overflow-hidden rounded-2xl border-2 p-3 text-left transition-all
                            ${form.tiffinDuration === opt.value
                              ? "border-transparent shadow-md"
                              : "border-slate-100 dark:border-slate-500/25 bg-slate-50/50 hover:border-accent/25"}`}
                          style={form.tiffinDuration === opt.value ? {} : {}}
                        >
                          {form.tiffinDuration === opt.value && (
                            <div className={`absolute inset-0 bg-gradient-to-br ${opt.color} opacity-10`} />
                          )}
                          <div className={`relative inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${opt.color} px-2 py-0.5 text-[10px] font-black text-white mb-1.5`}>
                            📅 {opt.label}
                          </div>
                          <p className="relative text-[11px] font-bold text-muted">{opt.days}</p>
                          {form.tiffinDuration === opt.value && (
                            <span className="absolute right-2 top-2 text-xs">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meals/day + Delivery type */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Meals per day</label>
                      <select
                        className={SELECT}
                        value={form.tiffinMealsPerDay}
                        onChange={e => setField("tiffinMealsPerDay", Number(e.target.value))}
                      >
                        <option value={1}>1 meal / day</option>
                        <option value={2}>2 meals / day</option>
                        <option value={3}>3 meals / day</option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Delivery type</label>
                      <select
                        className={SELECT}
                        value={form.tiffinDeliveryType}
                        onChange={e => setField("tiffinDeliveryType", e.target.value)}
                      >
                        {DELIVERY_TYPES.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Meal type */}
                  <div>
                    <label className={LABEL}>Meal type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {MEAL_TYPES.map(o => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setField("tiffinMealType", o.value)}
                          className={`relative overflow-hidden rounded-2xl border-2 px-3 py-3 text-[11px] font-black transition-all
                            ${form.tiffinMealType === o.value
                              ? "border-transparent shadow-md"
                              : "border-slate-100 dark:border-slate-500/25 bg-slate-50/50 text-muted dark:text-body hover:border-accent/25"}`}
                        >
                          {form.tiffinMealType === o.value && (
                            <div className={`absolute inset-0 bg-gradient-to-br ${o.bg} opacity-10`} />
                          )}
                          <span className="relative">{o.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className={LABEL}>Description (shown to customers)</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Fresh North Indian home-style meals — dal, sabzi, roti & rice, made with love daily"
                      className={
                        "w-full resize-none rounded-2xl border-2 border-slate-100 dark:border-slate-500/25 bg-card/80 px-4 py-3.5 " +
                        "text-sm font-semibold text-slate-800 dark:text-body outline-none transition-all placeholder:text-muted " +
                        "focus:border-orange-400 focus:bg-card focus:ring-4 focus:ring-accent/15 hover:border-accent/25"
                      }
                      value={form.tiffinDescription}
                      onChange={e => setField("tiffinDescription", e.target.value)}
                    />
                  </div>
                </div>

                {/* ── SECTION 3: Weekly Menu ── */}
                <div className="space-y-4">
                  <SectionHeader n="3" label="Weekly Menu" gradient="from-violet-500 to-purple-500" />
                  <p className="text-xs font-medium leading-relaxed text-muted">
                    Customers see this on their tiffin card. Leave blank for flexible / surprise days.
                  </p>

                  <div className="space-y-2.5">
                    {DAYS.map((day, i) => (
                      <div key={day} className="flex items-center gap-3">
                        <span className="w-8 shrink-0 text-[10px] font-black uppercase text-muted">
                          {day.slice(0, 3)}
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. Dal Makhani, Rice, Roti"
                          className={
                            "flex-1 rounded-2xl border-2 px-4 py-2.5 text-sm font-semibold " +
                            "text-slate-800 dark:text-body outline-none transition-all placeholder:text-muted focus:ring-4 " +
                            DAY_COLORS[i % DAY_COLORS.length]
                          }
                          value={form.tiffinWeeklyMenu?.[day] || ""}
                          onChange={e => setMenuDay(day, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Sticky save footer */}
              <div className="border-t border-slate-100 dark:border-slate-500/25 bg-gradient-to-r from-slate-50 to-orange-50/40 px-6 py-4 dark:bg-none dark:bg-raised">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex w-full items-center justify-center gap-2.5 rounded-2xl py-3.5 text-sm font-black text-heading shadow-lg transition-all
                    ${saving
                      ? "cursor-not-allowed bg-slate-300 shadow-none"
                      : "bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 shadow-orange-200 hover:shadow-xl hover:shadow-orange-200/50 active:scale-[0.98]"}`}
                >
                  {saving
                    ? <><Spinner /> Saving & syncing to customers…</>
                    : <>Save & Go Live 🚀</>}
                </button>
                <p className="mt-2.5 text-center text-[10px] font-bold text-muted">
                  Saves to your profile · Customers see changes instantly via real-time sync
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorTiffinTab;