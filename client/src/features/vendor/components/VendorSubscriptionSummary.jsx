import { motion } from "framer-motion";
import { formatCurrency } from "../../../utils/formatters.js";
import { Panel, VendorButton } from "./VendorUi.jsx";

const money = (value) => formatCurrency(Number(value || 0));

const TONES = {
  HEALTHY: "bg-emerald-500",
  MODERATE: "bg-sky-500",
  WARNING: "bg-amber-500",
  CRITICAL: "bg-orange-500",
  EXHAUSTED: "bg-rose-500",
  NONE: "bg-stone-300",
};

/**
 * Condensed subscription snapshot for the dashboard overview.
 *
 * Answers the four questions a restaurant cares about at a glance: what they
 * pay, how many 0% orders they get, how many are left, and what happens next.
 */
const VendorSubscriptionSummary = ({ vendorPlan, onOpenPlans }) => {
  const state = vendorPlan?.state;
  if (!state) return null;

  const { plan, quota, expiry, usage, subscription } = state;
  const barTone = TONES[quota.state] || TONES.NONE;

  const showRenewalWarning =
    expiry.expiringSoon || subscription.status === "PENDING_PAYMENT" || expiry.expired;

  return (
    <Panel tone={showRenewalWarning ? "warning" : "neutral"} className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
            Subscription &amp; earnings
          </p>
          <h3 className="mt-1 break-words text-xl font-black text-stone-950">{plan.name}</h3>
          <p className="text-sm font-bold text-stone-500">
            {plan.price > 0 ? `${money(plan.price)} / month` : "No monthly fee"} ·{" "}
            {plan.commissionRate}% after quota
          </p>
        </div>

        <VendorButton tone="secondary" onClick={onOpenPlans} className="flex-shrink-0 !px-4">
          Manage
        </VendorButton>
      </div>

      {showRenewalWarning ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
          {subscription.status === "PENDING_PAYMENT"
            ? `Payment of ${money(plan.price)} pending — your plan is not active yet.`
            : expiry.expired
            ? "Your plan has expired. Renew to restore 0% commission orders."
            : `Expires in ${expiry.daysUntilExpiry} day${
                expiry.daysUntilExpiry === 1 ? "" : "s"
              } — renew to keep your benefits.`}
        </p>
      ) : null}

      <div className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-black text-stone-800">
            {quota.remaining} of {quota.total} free orders left
          </p>
          <p className="text-xs font-black text-stone-400">{quota.percent}% used</p>
        </div>

        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, quota.percent)}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`h-full rounded-full ${barTone}`}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#eee7dc] pt-4 sm:grid-cols-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Orders</p>
          <p className="mt-1 text-base font-black text-stone-900">{usage.orders}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
            Commission
          </p>
          <p className="mt-1 text-base font-black text-stone-900">
            {money(usage.commissionCharged)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Revenue</p>
          <p className="mt-1 text-base font-black text-stone-900">{money(usage.grossRevenue)}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Saved</p>
          <p className="mt-1 text-base font-black text-emerald-600">
            {money(usage.savedThisCycle)}
          </p>
        </div>
      </div>
    </Panel>
  );
};

export default VendorSubscriptionSummary;
