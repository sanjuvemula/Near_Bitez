/**
 * TiffinCard.jsx
 *
 * NEW vs previous version:
 * ✅ tiffinDuration badge (Weekly / 10-day / 15-day / Monthly)
 * ✅ Duration shown in stats grid replacing hardcoded "Monthly"
 * ✅ Full UI upgrade — gradient header, richer badges, smoother layout
 */

import { motion as Motion } from "framer-motion";
import { Link } from "react-router-dom";
import { formatCurrency } from "../../utils/formatters.js";

// ─── Maps ─────────────────────────────────────────────────────────────────────
const mealTypeMap = {
  veg: {
    label: "Pure Veg",
    dot: "bg-emerald-500",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
    emoji: "🌿",
  },
  "non-veg": {
    label: "Non-Veg",
    dot: "bg-rose-500",
    cls: "border-rose-200 bg-rose-50 text-rose-700",
    emoji: "🍗",
  },
  both: {
    label: "Veg & Non-Veg",
    dot: "bg-amber-500",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
    emoji: "🍽️",
  },
};

const deliveryMap = {
  delivery: { label: "Delivery",          icon: "🛵" },
  pickup:   { label: "Pickup",            icon: "🏪" },
  both:     { label: "Delivery & Pickup", icon: "🛵" },
};

const durationMap = {
  weekly:  { label: "Weekly plan",   days: "7 days",  gradient: "from-sky-500 to-indigo-500"    },
  "10days":{ label: "10-day plan",   days: "10 days", gradient: "from-violet-500 to-purple-500" },
  "15days":{ label: "15-day plan",   days: "15 days", gradient: "from-fuchsia-500 to-pink-500"  },
  monthly: { label: "Monthly plan",  days: "30 days", gradient: "from-orange-500 to-rose-500"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getMealsLabel = (n) => {
  const c = Number(n || 1);
  return `${c} meal${c === 1 ? "" : "s"}/day`;
};

const MealBadge = ({ type }) => {
  const cfg = mealTypeMap[type] || mealTypeMap.veg;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${cfg.cls}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.emoji} {cfg.label}
    </span>
  );
};

const DeliveryBadge = ({ type }) => {
  const cfg = deliveryMap[type] || deliveryMap.delivery;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-700">
      {cfg.icon} {cfg.label}
    </span>
  );
};

const DurationBadge = ({ duration }) => {
  const cfg = durationMap[duration] || durationMap.monthly;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${cfg.gradient} px-2.5 py-1 text-[10px] font-black text-white shadow-sm`}>
      📅 {cfg.label}
    </span>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────
const TiffinCard = ({ tiffin, index = 0, subscribed = false, onSubscribe }) => {
  const price       = Number(tiffin.price || 0);
  const mealsLabel  = getMealsLabel(tiffin.mealsPerDay);
  const durCfg      = durationMap[tiffin.duration] || durationMap.monthly;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.055, ease: "easeOut" }}
      className="group"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:shadow-[0_16px_48px_-12px_rgba(234,88,12,0.2)] hover:-translate-y-0.5">

        {/* ── Image / banner ── */}
        <div className="relative h-44 overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50">
          {tiffin.imageUrl ? (
            <img
              src={tiffin.imageUrl}
              alt={tiffin.vendorName}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50">
              <span className="text-6xl font-black text-orange-200 select-none">
                {tiffin.vendorName?.charAt(0) || "T"}
              </span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

          {/* Vendor name */}
          <div className="absolute bottom-0 inset-x-0 p-4">
            <p className="truncate text-base font-black text-white drop-shadow-lg">
              {tiffin.vendorName}
            </p>
            {tiffin.address && typeof tiffin.address === "string" && (
              <p className="text-[10px] font-semibold text-white/60 truncate mt-0.5">
                📍 {tiffin.address}
              </p>
            )}
          </div>

          {/* Rating badge */}
          {tiffin.rating ? (
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-xl bg-white/95 backdrop-blur px-2.5 py-1 shadow">
              <span className="text-amber-400 text-[11px]">★</span>
              <span className="text-[11px] font-black text-slate-900">
                {Number(tiffin.rating).toFixed(1)}
              </span>
            </div>
          ) : null}

          {/* Duration badge — top left */}
          <div className="absolute left-3 top-3">
            <DurationBadge duration={tiffin.duration} />
          </div>
        </div>

        {/* ── Card body ── */}
        <div className="flex flex-1 flex-col p-4 gap-3">

          {/* Description + price */}
          <div className="flex items-start justify-between gap-3">
            <p className="flex-1 text-sm font-medium leading-relaxed text-slate-500 line-clamp-2">
              {tiffin.description || "Home-style meals from this provider."}
            </p>
            <div className="shrink-0 text-right">
              <p className="text-xl font-black text-orange-500">
                {price > 0 ? formatCurrency(price) : "On request"}
              </p>
              {price > 0 && (
                <p className="text-[10px] font-bold text-slate-400">
                  per {durCfg.days}
                </p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            <MealBadge type={tiffin.mealType} />
            <DeliveryBadge type={tiffin.deliveryType} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-orange-50/30 border border-slate-100 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Meals</p>
              <p className="mt-0.5 text-sm font-black text-slate-900">{mealsLabel}</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-orange-50/30 border border-slate-100 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Duration</p>
              <p className="mt-0.5 text-sm font-black text-slate-900">{durCfg.days}</p>
            </div>
          </div>

          {/* Cuisine tags */}
          {tiffin.cuisineType?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tiffin.cuisineType.slice(0, 3).map(c => (
                <span
                  key={c}
                  className="rounded-full bg-orange-50 border border-orange-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-orange-600"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* CTA buttons */}
          <div className="mt-auto flex gap-2 pt-1">
            <button
              disabled={subscribed}
              onClick={() => onSubscribe?.(tiffin)}
              className={`flex-1 rounded-2xl py-3 text-sm font-black transition-all
                ${subscribed
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-600 cursor-default"
                  : "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-200 hover:shadow-lg hover:shadow-orange-200/60 active:scale-[0.97]"}`}
            >
              {subscribed ? "✓ Subscribed" : "Subscribe"}
            </button>
            <Link
              to={`/restaurant/${tiffin._id}`}
              className="flex-1 flex items-center justify-center rounded-2xl border-2 border-orange-200 bg-white px-4 py-3 text-sm font-black text-orange-600 no-underline transition hover:bg-orange-50 hover:border-orange-300 active:scale-[0.97]"
            >
              View →
            </Link>
          </div>
        </div>
      </div>
    </Motion.div>
  );
};

export default TiffinCard;