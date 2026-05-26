import { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { Panel, EmptyState, VendorButton } from "./VendorUi.jsx";
import { GAME_OPTIONS } from "../../games/gameCatalog.js";

// ── Stat card for top strip ───────────────────────────────────────────────────
const StatPill = ({ label, value, accent }) => (
  <div className={`flex flex-col items-center justify-center rounded-2xl px-6 py-4 border ${accent}`}>
    <p className="text-2xl font-black tracking-tight">{value}</p>
    <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-60">{label}</p>
  </div>
);

const initialPromoForm = {
  code: "",
  discountType: "PERCENTAGE",
  value: "",
  minOrderValue: "",
  maxDiscount: "",
  validUntil: "",
  usageLimit: "",
  isGameReward: false,
  gameKey: "any",
  gameRewardTier: "PLAY",
  gameMinScore: "60",
  gameHoldMinutes: "30",
};

// ── Individual promo card ─────────────────────────────────────────────────────
const PromoCard = ({ promo, onToggle, onDelete, pending }) => {
  const expired = new Date(promo.validUntil) < new Date();
  const daysLeft = Math.max(0, Math.ceil((new Date(promo.validUntil) - new Date()) / 86400000));

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
        !promo.isActive || expired
          ? "border-zinc-200 bg-zinc-50 opacity-60"
          : "border-orange-200 bg-white shadow-[0_8px_32px_-8px_rgba(234,88,12,0.15)]"
      }`}
    >
      {/* Top accent bar */}
      <div className={`h-1.5 w-full ${promo.isActive && !expired ? "bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400" : "bg-zinc-300"}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`rounded-xl px-3 py-1.5 border ${promo.isActive && !expired ? "bg-orange-50 border-orange-200" : "bg-zinc-100 border-zinc-200"}`}>
              <span className={`text-lg font-black tracking-widest ${promo.isActive && !expired ? "text-orange-600" : "text-zinc-400"}`}>
                {promo.code}
              </span>
            </div>
            {expired ? (
              <span className="text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-500 px-2 py-1 rounded-lg">Expired</span>
            ) : promo.isActive ? (
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Live
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-400 px-2 py-1 rounded-lg">Paused</span>
            )}
            {promo.isGameReward ? (
              <span className="text-[10px] font-black uppercase tracking-widest bg-violet-100 text-violet-600 px-2 py-1 rounded-lg">
                Game
              </span>
            ) : null}
          </div>

          <button
            onClick={() => onDelete?.(promo._id)}
            className="text-zinc-300 hover:text-red-400 transition-colors text-lg leading-none"
            title="Delete promo"
          >×</button>
        </div>

        {/* Discount value */}
        <p className={`text-3xl font-black mb-1 ${promo.isActive && !expired ? "text-zinc-900" : "text-zinc-400"}`}>
          {promo.discountType === "PERCENTAGE" ? `${promo.value}% OFF` : `₹${promo.value} OFF`}
        </p>
        <p className="text-xs font-semibold text-zinc-400 mb-4">
          on orders above ₹{promo.minOrderValue}
          {promo.maxDiscount ? ` · max ₹${promo.maxDiscount} off` : ""}
          {promo.usageLimit ? ` · ${promo.usedCount}/${promo.usageLimit} used` : ""}
        </p>

        {promo.isGameReward ? (
          <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-500">
              {promo.gameRewardTier === "TOP" ? "Area top reward" : "Score reward"}
            </p>
            <p className="mt-1 text-xs font-bold text-violet-700">
              {promo.gameKey === "any" ? "Any game" : promo.gameKey} · min score {promo.gameMinScore || 0}
              {promo.gameRewardTier === "TOP" ? ` · hold ${promo.gameHoldMinutes || 1} min` : ""}
            </p>
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {expired ? "Expired" : `${daysLeft}d left`} · {new Date(promo.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          {!expired && (
            <Motion.button
              whileTap={{ scale: 0.95 }}
              disabled={pending === promo._id}
              onClick={() => onToggle(promo._id, !promo.isActive)}
              className={`text-xs font-black px-4 py-1.5 rounded-xl border transition-colors ${
                promo.isActive
                  ? "border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                  : "border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
              } disabled:opacity-40`}
            >
              {pending === promo._id ? "..." : promo.isActive ? "Pause" : "Resume"}
            </Motion.button>
          )}
        </div>
      </div>
    </Motion.div>
  );
};

// ── Input component (light theme) ────────────────────────────────────────────
const LightInput = ({ label, hint, ...props }) => (
  <label className="block">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      {hint && <span className="text-[10px] text-zinc-400">{hint}</span>}
    </div>
    <input
      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-orange-400 focus:ring-3 focus:ring-orange-100 placeholder:text-zinc-300"
      {...props}
    />
  </label>
);

const LightSelect = ({ label, children, ...props }) => (
  <label className="block">
    <span className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
    <select
      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-orange-400 focus:ring-3 focus:ring-orange-100 cursor-pointer appearance-none"
      {...props}
    >
      {children}
    </select>
  </label>
);

// ── Main component ────────────────────────────────────────────────────────────
const VendorMarketingTab = ({ restaurant, promos = [], createPromoCode, togglePromoStatus, deletePromo, pendingPromoId }) => {
  const [form, setForm] = useState(initialPromoForm);
  const [creating, setCreating] = useState(false);

  if (!restaurant) return (
    <EmptyState
      title="Store Not Ready"
      description="Complete your store profile to run marketing campaigns."
      tone="info"
    />
  );

  const activePromos = promos.filter(p => p.isActive && new Date(p.validUntil) >= new Date());
  const expiredPromos = promos.filter(p => !p.isActive || new Date(p.validUntil) < new Date());
  const totalSaved = promos.reduce((s, p) => s + (p.usedCount || 0), 0);
  const gamePromos = promos.filter(p => p.isGameReward);

  const handleCreate = async () => {
    if (!form.code.trim()) return alert("Enter a promo code");
    if (!form.value) return alert("Enter a discount value");
    if (!form.validUntil) return alert("Set an expiry date");
    setCreating(true);
    const success = await createPromoCode(form);
    setCreating(false);
    if (success) {
      setForm(initialPromoForm);
    }
  };

  const suggestions = ["WELCOME10", "FIRST50", "WEEKEND20", "DIWALI30", "SAVE100", "FEAST15"];

  return (
    <div
      className="min-h-screen rounded-3xl p-6 md:p-8"
      style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fffbf5 40%, #fef3c7 100%)" }}
    >
      {/* ── Header ── */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📢</span>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Marketing</h1>
          </div>
          <p className="text-sm font-semibold text-zinc-400">
            Create promo codes · Attract more customers · Grow revenue
          </p>
        </div>

        {/* Stats strip */}
        <div className="flex gap-3 flex-wrap">
          <StatPill label="Active" value={activePromos.length} accent="border-emerald-200 bg-emerald-50 text-emerald-700" />
          <StatPill label="Total Codes" value={promos.length} accent="border-orange-200 bg-orange-50 text-orange-700" />
          <StatPill label="Game Rewards" value={gamePromos.length} accent="border-violet-200 bg-violet-50 text-violet-700" />
          <StatPill label="Times Used" value={totalSaved} accent="border-amber-200 bg-amber-50 text-amber-700" />
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[400px,1fr]">

        {/* ── Create Promo Form ── */}
        <div className="space-y-4">
          <div
            className="rounded-2xl border border-orange-200 bg-white shadow-[0_12px_40px_-12px_rgba(234,88,12,0.18)] overflow-hidden"
          >
            {/* Form header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5">
              <h2 className="text-xl font-black text-white">New Promo Code</h2>
              <p className="text-sm text-orange-100 mt-0.5">Launch a campaign to boost your sales</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Code input + suggestions */}
              <div>
                <LightInput
                  label="Promo Code"
                  placeholder="e.g. DIWALI50"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => setForm({ ...form, code: s })}
                      className="text-[10px] font-black px-2 py-1 rounded-lg border border-orange-200 text-orange-500 bg-orange-50 hover:bg-orange-100 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <LightSelect
                  label="Type"
                  value={form.discountType}
                  onChange={e => setForm({ ...form, discountType: e.target.value })}
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FLAT">Flat (₹)</option>
                </LightSelect>
                <LightInput
                  label="Value"
                  type="number"
                  placeholder={form.discountType === "PERCENTAGE" ? "20" : "100"}
                  value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })}
                />
              </div>

              {/* Min order + Max discount */}
              <div className="grid grid-cols-2 gap-3">
                <LightInput
                  label="Min Order (₹)"
                  hint="optional"
                  type="number"
                  placeholder="299"
                  value={form.minOrderValue}
                  onChange={e => setForm({ ...form, minOrderValue: e.target.value })}
                />
                {form.discountType === "PERCENTAGE" && (
                  <LightInput
                    label="Max Discount (₹)"
                    hint="cap"
                    type="number"
                    placeholder="200"
                    value={form.maxDiscount}
                    onChange={e => setForm({ ...form, maxDiscount: e.target.value })}
                  />
                )}
              </div>

              {/* Expiry + Usage limit */}
              <div className="grid grid-cols-2 gap-3">
                <LightInput
                  label="Valid Until"
                  type="date"
                  value={form.validUntil}
                  onChange={e => setForm({ ...form, validUntil: e.target.value })}
                />
                <LightInput
                  label="Usage Limit"
                  hint="optional"
                  type="number"
                  placeholder="Unlimited"
                  value={form.usageLimit}
                  onChange={e => setForm({ ...form, usageLimit: e.target.value })}
                />
              </div>

              {/* Game reward controls */}
              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isGameReward: !form.isGameReward })}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span>
                    <span className="block text-[11px] font-black uppercase tracking-widest text-violet-600">
                      Game reward
                    </span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-violet-500">
                      Let customers unlock this code after playing customer games.
                    </span>
                  </span>
                  <span
                    className={`relative h-7 w-12 rounded-full border transition ${
                      form.isGameReward ? "border-violet-500 bg-violet-500" : "border-zinc-300 bg-white"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                        form.isGameReward ? "right-1" : "left-1"
                      }`}
                    />
                  </span>
                </button>

                {form.isGameReward ? (
                  <Motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <LightSelect
                        label="Game"
                        value={form.gameKey}
                        onChange={e => setForm({ ...form, gameKey: e.target.value })}
                      >
                        {GAME_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </LightSelect>
                      <LightSelect
                        label="Reward Type"
                        value={form.gameRewardTier}
                        onChange={e => setForm({ ...form, gameRewardTier: e.target.value })}
                      >
                        <option value="PLAY">Score reward</option>
                        <option value="TOP">Area top reward</option>
                      </LightSelect>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <LightInput
                        label="Min Score"
                        type="number"
                        placeholder="60"
                        value={form.gameMinScore}
                        onChange={e => setForm({ ...form, gameMinScore: e.target.value })}
                      />
                      <LightInput
                        label="Hold Minutes"
                        hint={form.gameRewardTier === "TOP" ? "for top reward" : "used only for top"}
                        type="number"
                        placeholder="30"
                        value={form.gameHoldMinutes}
                        onChange={e => setForm({ ...form, gameHoldMinutes: e.target.value })}
                      />
                    </div>
                  </Motion.div>
                ) : null}
              </div>

              {/* Preview */}
              {form.code && form.value && (
                <Motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-dashed border-orange-300 bg-orange-50 px-4 py-3"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Preview</p>
                  <p className="text-lg font-black text-orange-600">
                    {form.code} — {form.discountType === "PERCENTAGE" ? `${form.value}% OFF` : `₹${form.value} OFF`}
                  </p>
                  {form.minOrderValue && (
                    <p className="text-xs text-orange-400 font-semibold">on orders above ₹{form.minOrderValue}</p>
                  )}
                </Motion.div>
              )}

              {/* Submit */}
              <Motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreate}
                disabled={creating || pendingPromoId === "creating"}
                className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-sm font-black text-white shadow-[0_4px_16px_-4px_rgba(234,88,12,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(234,88,12,0.6)] transition-all disabled:opacity-50"
              >
                {creating || pendingPromoId === "creating" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Launching...
                  </span>
                ) : "🚀 Launch Campaign"}
              </Motion.button>
            </div>
          </div>

          {/* Tips box */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-black text-amber-700 mb-3">💡 Tips for better results</p>
            <ul className="space-y-1.5">
              {[
                "15–20% off works best for first orders",
                "Set a min order to protect margins",
                "Weekend promos drive 2× more orders",
                "Limit usage to create urgency",
              ].map(tip => (
                <li key={tip} className="text-xs font-semibold text-amber-600 flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400">✓</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Active Campaigns ── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-zinc-900">
              Active Campaigns
              {activePromos.length > 0 && (
                <span className="ml-2 text-sm font-black text-orange-500 bg-orange-100 rounded-full px-2.5 py-0.5">
                  {activePromos.length}
                </span>
              )}
            </h2>
          </div>

          {promos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-white/60 py-16 text-center">
              <div className="text-5xl mb-4">🎁</div>
              <h3 className="text-lg font-black text-zinc-700">No campaigns yet</h3>
              <p className="text-sm font-semibold text-zinc-400 mt-1 max-w-xs">
                Create your first promo code to attract customers and boost your orders.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active */}
              {activePromos.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Live Now
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <AnimatePresence>
                      {activePromos.map(promo => (
                        <PromoCard
                          key={promo._id}
                          promo={promo}
                          onToggle={togglePromoStatus}
                          onDelete={deletePromo}
                          pending={pendingPromoId}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Paused / Expired */}
              {expiredPromos.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300 mb-3">
                    Paused / Expired
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <AnimatePresence>
                      {expiredPromos.map(promo => (
                        <PromoCard
                          key={promo._id}
                          promo={promo}
                          onToggle={togglePromoStatus}
                          onDelete={deletePromo}
                          pending={pendingPromoId}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorMarketingTab;
