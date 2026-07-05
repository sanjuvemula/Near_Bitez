import { useState } from "react";
import { formatCurrency, formatStatusLabel } from "../../../utils/formatters.js";
import { EmptyState, Panel, VendorButton } from "./VendorUi.jsx";

const PLAN_ACCENTS = {
  GROWTH: "border-orange-200 bg-orange-50 text-orange-700",
  PREMIUM: "border-sky-200 bg-sky-50 text-sky-700",
  PRO: "border-stone-800 bg-stone-950 text-white",
};

const money = (value) => formatCurrency(Number(value || 0));

const VendorPlanTab = ({ restaurant, vendorPlan, updateVendorPlan, onRefresh, refreshing }) => {
  const [savingPlan, setSavingPlan] = useState("");

  if (!restaurant) {
    return <EmptyState title="Store Not Ready" description="Complete your store profile first." tone="info" />;
  }

  const current = vendorPlan?.current || {};
  const usage = vendorPlan?.usage || {};
  const options = vendorPlan?.options || [];

  const handlePlan = async (planKey) => {
    if (planKey === current.key) return;
    setSavingPlan(planKey);
    await updateVendorPlan(planKey);
    setSavingPlan("");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Panel tone="urgent" className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-orange-600">Current plan</p>
              <h2 className="mt-2 text-3xl font-black text-stone-950">{current.name || "Growth Plan"}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-black text-orange-700">
                  {current.commissionPercent || 0}% commission
                </span>
                <span className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-black text-stone-800">
                  {money(current.monthlyFee)} / month
                </span>
                <span className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-black text-stone-500">
                  {formatStatusLabel(current.status || "ACTIVE")}
                </span>
              </div>
            </div>
            <VendorButton tone="secondary" onClick={onRefresh} loading={refreshing}>
              Refresh
            </VendorButton>
          </div>
        </Panel>

        <Panel tone="positive" className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Free orders</p>
              <p className="mt-2 text-4xl font-black text-stone-950">{usage.remainingFreeOrders ?? 20}</p>
              <p className="text-sm font-bold text-stone-500">
                {usage.freeOrdersUsed || 0}/{usage.freeOrdersTotal || 20} used
              </p>
            </div>
            <div className="h-20 w-20 rounded-full border-[10px] border-emerald-200 bg-white" />
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${usage.usagePercent || 0}%` }} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">This month</p>
          <p className="mt-2 text-2xl font-black text-stone-950">{usage.orderCount || 0} orders</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">Commission base</p>
          <p className="mt-2 text-2xl font-black text-stone-950">{money(usage.commissionBase)}</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">Commission paid</p>
          <p className="mt-2 text-2xl font-black text-stone-950">{money(usage.commissionCollected)}</p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {options.map((plan) => {
          const active = current.key === plan.key;
          return (
            <Panel key={plan.key} interactive className="flex flex-col p-5">
              <div className={`mb-5 rounded-2xl border px-4 py-3 ${PLAN_ACCENTS[plan.key] || PLAN_ACCENTS.GROWTH}`}>
                <p className="text-xl font-black">{plan.name}</p>
                <p className="mt-1 text-sm font-bold opacity-80">
                  {money(plan.monthlyFee)} + {plan.commissionPercent}% commission
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-[10px] font-black uppercase text-stone-400">Projected</p>
                  <p className="mt-1 text-base font-black text-stone-950">{money(plan.projectedMonthlyCost)}</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-[10px] font-black uppercase text-stone-400">Savings</p>
                  <p className="mt-1 text-base font-black text-emerald-600">{money(plan.estimatedSavingsVsAggregator)}</p>
                </div>
              </div>
              <ul className="my-5 space-y-2 text-sm font-bold text-stone-600">
                {(plan.features || []).slice(0, 4).map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-orange-600">+</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <VendorButton
                tone={active ? "secondary" : plan.key === "PRO" ? "primary" : "info"}
                loading={savingPlan === plan.key}
                onClick={() => handlePlan(plan.key)}
                className="mt-auto w-full"
                disabled={active}
              >
                {active ? "Current" : current.key === "PRO" ? "Downgrade" : "Switch plan"}
              </VendorButton>
            </Panel>
          );
        })}
      </div>
    </div>
  );
};

export default VendorPlanTab;
