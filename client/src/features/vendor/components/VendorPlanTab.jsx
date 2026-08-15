import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatCurrency, formatStatusLabel } from "../../../utils/formatters.js";
import { EmptyState, Panel, VendorButton } from "./VendorUi.jsx";

const money = (value) => formatCurrency(Number(value || 0));

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

// Quota meter colours escalate as the free-order allowance runs down.
const QUOTA_TONES = {
  HEALTHY: { bar: "bg-emerald-500", text: "text-emerald-700", ring: "border-emerald-200", label: "On track" },
  MODERATE: { bar: "bg-sky-500", text: "text-sky-700", ring: "border-sky-200", label: "Halfway" },
  WARNING: { bar: "bg-amber-500", text: "text-amber-700", ring: "border-amber-200", label: "Running low" },
  CRITICAL: { bar: "bg-orange-500", text: "text-orange-700", ring: "border-orange-200", label: "Almost finished" },
  EXHAUSTED: { bar: "bg-rose-500", text: "text-rose-700", ring: "border-rose-200", label: "Quota finished" },
  NONE: { bar: "bg-stone-300", text: "text-stone-500", ring: "border-stone-200", label: "No free orders" },
};

const BADGE_STYLES = {
  POPULAR: "bg-orange-600 text-white",
  BEST_VALUE: "bg-emerald-600 text-white",
  RECOMMENDED: "bg-sky-600 text-white",
  NEW: "bg-violet-600 text-white",
};

const STATUS_TONES = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING_PAYMENT: "border-amber-200 bg-amber-50 text-amber-700",
  PAUSED: "border-sky-200 bg-sky-50 text-sky-700",
  EXPIRED: "border-rose-200 bg-rose-50 text-rose-700",
  CANCELLED: "border-stone-200 bg-stone-100 text-stone-600",
};

/** Horizontal quota meter used on the hero card. */
const QuotaMeter = ({ used, total, percent, state }) => {
  const tone = QUOTA_TONES[state] || QUOTA_TONES.NONE;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">
          Free commission quota
        </p>
        <p className={`text-[11px] font-black uppercase tracking-widest ${tone.text}`}>
          {tone.label}
        </p>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-stone-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, percent)}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`h-full rounded-full ${tone.bar}`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-stone-600">
        <span>
          {used} / {total} orders used
        </span>
        <span className={tone.text}>{percent}%</span>
      </div>
    </div>
  );
};

const StatTile = ({ label, value, hint, tone = "" }) => (
  <Panel className="p-4 sm:p-5">
    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{label}</p>
    <p className={`mt-2 text-xl font-black sm:text-2xl ${tone || "text-stone-950"}`}>{value}</p>
    {hint ? <p className="mt-1 text-[11px] font-semibold text-stone-400">{hint}</p> : null}
  </Panel>
);

const PlanCard = ({ plan, isCurrent, onSelect, saving, disabled }) => {
  const badgeStyle = BADGE_STYLES[plan.badge];

  return (
    <Panel
      interactive={!isCurrent}
      tone={isCurrent ? "urgent" : "neutral"}
      className={`flex h-full flex-col p-5 ${isCurrent ? "ring-2 ring-orange-400" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-stone-950">{plan.name}</h3>
          <p className="mt-1 text-2xl font-black text-stone-950">
            {plan.price > 0 ? money(plan.price) : "Free"}
            {plan.price > 0 ? (
              <span className="text-sm font-bold text-stone-400"> /month</span>
            ) : null}
          </p>
        </div>
        {badgeStyle ? (
          <span className={`flex-shrink-0 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest ${badgeStyle}`}>
            {formatStatusLabel(plan.badge)}
          </span>
        ) : null}
      </div>

      {/* The two numbers that matter most, stated plainly. */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700">
            0% commission
          </p>
          <p className="mt-1 text-lg font-black text-emerald-800">{plan.freeOrderQuota}</p>
          <p className="text-[10px] font-bold text-emerald-600">orders / month</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-stone-500">
            After that
          </p>
          <p className="mt-1 text-lg font-black text-stone-900">{plan.commissionRate}%</p>
          <p className="text-[10px] font-bold text-stone-400">commission</p>
        </div>
      </div>

      {plan.description ? (
        <p className="mt-4 text-sm font-semibold leading-snug text-stone-500">{plan.description}</p>
      ) : null}

      <ul className="my-4 space-y-2 text-sm font-semibold text-stone-600">
        {(plan.features || []).slice(0, 5).map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="mt-0.5 flex-shrink-0 text-emerald-600">✓</span>
            <span className="min-w-0">{feature}</span>
          </li>
        ))}
      </ul>

      <VendorButton
        tone={isCurrent ? "secondary" : plan.changeType === "UPGRADE" ? "primary" : "info"}
        onClick={() => onSelect(plan)}
        loading={saving}
        disabled={isCurrent || disabled}
        className="mt-auto w-full"
      >
        {isCurrent
          ? "Current plan"
          : plan.changeType === "UPGRADE"
          ? "Upgrade"
          : "Switch to this plan"}
      </VendorButton>
    </Panel>
  );
};

const VendorPlanTab = ({
  restaurant,
  vendorPlan,
  availablePlans = [],
  subscribeToPlan,
  onRefresh,
  refreshing,
}) => {
  const [savingPlanId, setSavingPlanId] = useState("");
  const [confirmPlan, setConfirmPlan] = useState(null);

  const state = vendorPlan?.state;

  const sortedPlans = useMemo(
    () => [...availablePlans].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    [availablePlans]
  );

  if (!restaurant) {
    return (
      <EmptyState
        title="Store Not Ready"
        description="Complete your store profile before choosing a subscription plan."
        tone="info"
      />
    );
  }

  if (!state) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-2xl bg-stone-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-28 animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      </div>
    );
  }

  const { plan, quota, cycle, expiry, usage, subscription } = state;

  const handleConfirm = async () => {
    if (!confirmPlan) return;
    setSavingPlanId(confirmPlan._id);
    await subscribeToPlan(confirmPlan._id);
    setSavingPlanId("");
    setConfirmPlan(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Expiry / payment warnings ─────────────────────────────────────── */}
      {subscription.status === "PENDING_PAYMENT" ? (
        <Panel tone="warning" className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-rose-800">Payment pending</p>
              <p className="mt-1 text-sm font-semibold text-rose-700">
                Your {plan.name} activates once the payment of {money(plan.price)} is confirmed.
                Until then the default commission applies.
              </p>
            </div>
          </div>
        </Panel>
      ) : null}

      {expiry.expiringSoon && expiry.daysUntilExpiry !== null ? (
        <Panel tone="warning" className="p-4 sm:p-5">
          <p className="text-sm font-black text-rose-800">
            Your {plan.name} expires in {expiry.daysUntilExpiry} day
            {expiry.daysUntilExpiry === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-sm font-semibold text-rose-700">
            Renew now to continue receiving 0% commission orders.
          </p>
        </Panel>
      ) : null}

      {/* ── Current plan hero ──────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <Panel tone="urgent" className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-orange-600">
                Current plan
              </p>
              <h2 className="mt-2 break-words text-2xl font-black text-stone-950 sm:text-3xl">
                {plan.name}
              </h2>
              <p className="mt-1 text-lg font-black text-stone-700">
                {plan.price > 0 ? `${money(plan.price)} / month` : "No monthly fee"}
              </p>
            </div>
            <VendorButton tone="secondary" onClick={onRefresh} loading={refreshing}>
              Refresh
            </VendorButton>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`rounded-xl border px-3 py-2 text-xs font-black ${
                STATUS_TONES[subscription.status] || STATUS_TONES.CANCELLED
              }`}
            >
              {formatStatusLabel(subscription.status)}
            </span>
            <span className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-black text-stone-700">
              {plan.commissionRate}% after quota
            </span>
            {subscription.commissionRateOverride !== null ? (
              <span className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">
                Custom rate
              </span>
            ) : null}
            <span className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-black text-stone-500">
              Renews {formatDate(expiry.expiresAt)}
            </span>
          </div>

          <div className="mt-5">
            <QuotaMeter
              used={quota.used}
              total={quota.total}
              percent={quota.percent}
              state={quota.state}
            />
          </div>
        </Panel>

        {/* Remaining-orders focal card */}
        <Panel tone="positive" className="flex flex-col justify-between p-5 sm:p-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">
              Orders left at 0% commission
            </p>
            <p className="mt-2 text-5xl font-black text-stone-950 sm:text-6xl">{quota.remaining}</p>
            <p className="mt-1 text-sm font-bold text-stone-500">
              of {quota.total} this cycle
              {quota.bonus > 0 ? ` (includes ${quota.bonus} bonus)` : ""}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-emerald-200 pt-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                Cycle ends
              </p>
              <p className="mt-1 text-sm font-black text-stone-800">{formatDate(cycle.end)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                Days left
              </p>
              <p className="mt-1 text-sm font-black text-stone-800">{cycle.daysRemaining ?? "—"}</p>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── This cycle stats ───────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Orders this cycle" value={usage.orders} hint={`${usage.freeOrders} at 0%`} />
        <StatTile
          label="Commission paid"
          value={money(usage.commissionCharged)}
          hint={`${usage.commissionableOrders} chargeable orders`}
        />
        <StatTile
          label="Estimated this cycle"
          value={money(usage.estimatedCommission)}
          hint="Projected at current pace"
        />
        <StatTile
          label="Saved by your plan"
          value={money(usage.savedThisCycle)}
          hint="Commission avoided on free orders"
          tone="text-emerald-600"
        />
      </div>

      <StatTile
        label="Revenue generated this cycle"
        value={money(usage.grossRevenue)}
        hint={`Commission is charged on ${money(usage.commissionBase)} of eligible revenue`}
      />

      {/* ── Plan cards ─────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-black text-stone-950">Available plans</h3>
          <p className="text-xs font-bold text-stone-400">
            Pay monthly → get 0% commission orders → pay commission only after that
          </p>
        </div>

        {sortedPlans.length === 0 ? (
          <EmptyState
            title="No plans available"
            description="No subscription plans are published right now. Please check back shortly."
            tone="info"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedPlans.map((option) => (
              <PlanCard
                key={option._id}
                plan={option}
                isCurrent={String(option._id) === String(plan._id)}
                onSelect={setConfirmPlan}
                saving={savingPlanId === option._id}
                disabled={Boolean(savingPlanId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Comparison table: scrolls inside its own container on small screens ── */}
      {sortedPlans.length > 1 ? (
        <Panel className="p-0">
          <div className="border-b border-[#eee7dc] px-5 py-4">
            <h3 className="text-base font-black text-stone-950">Compare plans</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#eee7dc] bg-stone-50/60">
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-stone-400">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-400">
                    Monthly
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-400">
                    0% orders
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-400">
                    After quota
                  </th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-stone-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPlans.map((option) => {
                  const isCurrent = String(option._id) === String(plan._id);
                  return (
                    <tr
                      key={option._id}
                      className={`border-b border-[#f5f1ea] last:border-0 ${
                        isCurrent ? "bg-orange-50/60" : ""
                      }`}
                    >
                      <td className="px-5 py-3 font-black text-stone-900">{option.name}</td>
                      <td className="px-4 py-3 font-bold text-stone-700">
                        {option.price > 0 ? money(option.price) : "Free"}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-700">
                        {option.freeOrderQuota}
                      </td>
                      <td className="px-4 py-3 font-bold text-stone-700">
                        {option.commissionRate}%
                      </td>
                      <td className="px-5 py-3">
                        {isCurrent ? (
                          <span className="rounded-lg bg-orange-600 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                            Current
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            {option.changeType === "UPGRADE" ? "Upgrade" : "Downgrade"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {/* ── Confirmation dialog ────────────────────────────────────────────── */}
      {confirmPlan ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-t-3xl border border-[#eee7dc] bg-white p-6 shadow-2xl sm:rounded-3xl"
          >
            <h3 className="text-xl font-black text-stone-950">Switch to {confirmPlan.name}?</h3>

            <div className="mt-4 space-y-2 rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-stone-600">
              <div className="flex justify-between gap-3">
                <span>Monthly fee</span>
                <span className="font-black text-stone-900">
                  {confirmPlan.price > 0 ? money(confirmPlan.price) : "Free"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Orders at 0% commission</span>
                <span className="font-black text-emerald-700">{confirmPlan.freeOrderQuota}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Commission after quota</span>
                <span className="font-black text-stone-900">{confirmPlan.commissionRate}%</span>
              </div>
            </div>

            <p className="mt-3 text-xs font-semibold leading-relaxed text-stone-500">
              {confirmPlan.price > 0
                ? "A new billing cycle starts once your payment is confirmed. Orders already placed keep their original commission."
                : "This starts a new billing cycle immediately. Orders already placed keep their original commission."}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <VendorButton
                tone="secondary"
                className="w-full sm:flex-1"
                onClick={() => setConfirmPlan(null)}
                disabled={Boolean(savingPlanId)}
              >
                Cancel
              </VendorButton>
              <VendorButton
                tone="primary"
                className="w-full sm:flex-1"
                loading={Boolean(savingPlanId)}
                onClick={handleConfirm}
              >
                Confirm
              </VendorButton>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
};

export default VendorPlanTab;
