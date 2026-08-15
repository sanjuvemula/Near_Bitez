import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { api } from "../../services/api.js";
import { formatCurrency, formatStatusLabel } from "../../utils/formatters.js";
import {
  Btn,
  CheckboxField,
  EmptyRow,
  Panel,
  Pill,
  SearchInput,
  SelectInput,
  TableShell,
  TextArea,
  TextInput,
  Toolbar,
  displayDate,
  getData,
  statusColor,
} from "./AdminUi.jsx";

const BADGES = ["", "POPULAR", "BEST_VALUE", "RECOMMENDED", "NEW"];

const SUB_VIEWS = [
  { id: "plans", label: "Plans" },
  { id: "restaurants", label: "Restaurants" },
  { id: "analytics", label: "Analytics" },
];

const emptyPlanForm = {
  name: "",
  price: "",
  freeOrderQuota: "",
  commissionRate: "",
  description: "",
  features: "",
  badge: "",
  isActive: true,
  isFallback: false,
  displayOrder: "0",
  billingCycleDays: "30",
};

const money = (value) => formatCurrency(Number(value || 0));

const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const quotaBarColor = (percent) => {
  if (percent >= 100) return "bg-red-500";
  if (percent >= 90) return "bg-orange-500";
  if (percent >= 80) return "bg-amber-500";
  if (percent >= 50) return "bg-sky-500";
  return "bg-emerald-500";
};

const QuotaBar = ({ used, total, percent }) => (
  <div className="min-w-[120px]">
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full ${quotaBarColor(percent)}`}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
    <p className="mt-1 text-xs text-gray-500">
      {used}/{total} used
    </p>
  </div>
);

const StatCard = ({ label, value, hint, accent = "text-gray-900" }) => (
  <Panel>
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
  </Panel>
);

// ─── Plan form ───────────────────────────────────────────────────────────────

const PlanFormPanel = ({ form, setForm, editingId, onSubmit, onCancel, saving }) => (
  <Panel>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-bold text-gray-800">
        {editingId ? "Edit plan" : "Create a new plan"}
      </h3>
      {editingId ? (
        <Btn variant="ghost" small onClick={onCancel}>
          Cancel edit
        </Btn>
      ) : null}
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <TextInput
        label="Plan name *"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
        placeholder="Growth"
      />
      <TextInput
        label="Monthly price (Rs) *"
        type="number"
        min="0"
        value={form.price}
        onChange={(event) => setForm({ ...form, price: event.target.value })}
        placeholder="799"
      />
      <TextInput
        label="Free order quota *"
        type="number"
        min="0"
        value={form.freeOrderQuota}
        onChange={(event) => setForm({ ...form, freeOrderQuota: event.target.value })}
        placeholder="150"
      />
      <TextInput
        label="Commission after quota (%) *"
        type="number"
        min="0"
        max="100"
        step="0.5"
        value={form.commissionRate}
        onChange={(event) => setForm({ ...form, commissionRate: event.target.value })}
        placeholder="6"
      />
      <SelectInput
        label="Badge"
        value={form.badge}
        onChange={(event) => setForm({ ...form, badge: event.target.value })}
      >
        {BADGES.map((badge) => (
          <option key={badge || "none"} value={badge}>
            {badge ? formatStatusLabel(badge) : "No badge"}
          </option>
        ))}
      </SelectInput>
      <TextInput
        label="Display order"
        type="number"
        value={form.displayOrder}
        onChange={(event) => setForm({ ...form, displayOrder: event.target.value })}
      />
      <TextInput
        label="Billing cycle (days)"
        type="number"
        min="1"
        max="366"
        value={form.billingCycleDays}
        onChange={(event) => setForm({ ...form, billingCycleDays: event.target.value })}
      />
      <TextArea
        label="Description"
        className="sm:col-span-2"
        value={form.description}
        onChange={(event) => setForm({ ...form, description: event.target.value })}
        placeholder="For restaurants with steady repeat orders."
      />
      <TextArea
        label="Features (one per line)"
        className="sm:col-span-2 lg:col-span-3"
        value={form.features}
        onChange={(event) => setForm({ ...form, features: event.target.value })}
        placeholder={"150 orders at 0% commission\n6% commission after quota"}
      />
    </div>

    <div className="mt-3 flex flex-wrap items-center gap-3">
      <CheckboxField
        label="Active"
        checked={form.isActive}
        onChange={(value) => setForm({ ...form, isActive: value })}
      />
      <CheckboxField
        label="Use as expiry fallback plan"
        checked={form.isFallback}
        onChange={(value) => setForm({ ...form, isFallback: value })}
      />
      <Btn variant="primary" onClick={onSubmit} disabled={saving}>
        {saving ? "Saving..." : editingId ? "Save changes" : "Create plan"}
      </Btn>
    </div>

    <p className="mt-2 text-xs text-gray-400">
      The fallback plan is what restaurants drop to when a subscription expires. Exactly one plan
      can hold it.
    </p>
  </Panel>
);

// ─── Plans view ──────────────────────────────────────────────────────────────

const PlansView = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyPlanForm);
  const [editingId, setEditingId] = useState("");

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/subscriptions/plans");
      setPlans(getData(response, []));
    } catch (error) {
      toast.error(error?.message || "Unable to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const resetForm = () => {
    setForm(emptyPlanForm);
    setEditingId("");
  };

  const startEdit = (plan) => {
    setEditingId(plan._id);
    setForm({
      name: plan.name,
      price: String(plan.price),
      freeOrderQuota: String(plan.freeOrderQuota),
      commissionRate: String(plan.commissionRate),
      description: plan.description || "",
      features: (plan.features || []).join("\n"),
      badge: plan.badge || "",
      isActive: plan.isActive,
      isFallback: plan.isFallback,
      displayOrder: String(plan.displayOrder || 0),
      billingCycleDays: String(plan.billingCycleDays || 30),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Client-side checks mirror the server rules for immediate feedback; the
  // server validates again and is the authority.
  const validate = () => {
    if (!form.name.trim()) return "Plan name is required";
    if (Number(form.price) < 0 || !Number.isFinite(Number(form.price))) return "Price cannot be negative";
    if (Number(form.freeOrderQuota) < 0 || !Number.isFinite(Number(form.freeOrderQuota)))
      return "Free order quota cannot be negative";
    const rate = Number(form.commissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return "Commission must be between 0 and 100";
    if (!form.description.trim() && !form.features.trim())
      return "Add a description or at least one feature";
    return "";
  };

  const submit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        freeOrderQuota: Number(form.freeOrderQuota),
        commissionRate: Number(form.commissionRate),
        description: form.description.trim(),
        features: form.features.split("\n").map((item) => item.trim()).filter(Boolean),
        badge: form.badge,
        isActive: form.isActive,
        isFallback: form.isFallback,
        displayOrder: Number(form.displayOrder) || 0,
        billingCycleDays: Number(form.billingCycleDays) || 30,
      };

      if (editingId) {
        await api.put(`/admin/subscriptions/plans/${editingId}`, payload);
        toast.success("Plan updated");
      } else {
        await api.post("/admin/subscriptions/plans", payload);
        toast.success("Plan created");
      }

      resetForm();
      loadPlans();
    } catch (error) {
      toast.error(error?.message || "Unable to save plan");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (plan) => {
    try {
      const response = await api.patch(`/admin/subscriptions/plans/${plan._id}/status`, {
        isActive: !plan.isActive,
      });
      toast.success(response.message || "Plan status updated");
      loadPlans();
    } catch (error) {
      toast.error(error?.message || "Unable to change status");
    }
  };

  const duplicate = async (plan) => {
    try {
      await api.post(`/admin/subscriptions/plans/${plan._id}/duplicate`);
      toast.success(`${plan.name} duplicated as an inactive draft`);
      loadPlans();
    } catch (error) {
      toast.error(error?.message || "Unable to duplicate plan");
    }
  };

  const remove = async (plan) => {
    const warning =
      plan.restaurantCount > 0
        ? `${plan.name} has ${plan.restaurantCount} restaurant(s) subscribed. It will be archived, not deleted, so their history stays intact. Continue?`
        : `Delete ${plan.name}? This cannot be undone.`;

    if (!window.confirm(warning)) return;

    try {
      const response = await api.delete(`/admin/subscriptions/plans/${plan._id}`);
      toast.success(response.message || "Plan removed");
      if (editingId === plan._id) resetForm();
      loadPlans();
    } catch (error) {
      toast.error(error?.message || "Unable to delete plan");
    }
  };

  return (
    <div className="space-y-4">
      <PlanFormPanel
        form={form}
        setForm={setForm}
        editingId={editingId}
        onSubmit={submit}
        onCancel={resetForm}
        saving={saving}
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-56 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Panel className="py-12 text-center">
          <p className="text-sm font-semibold text-gray-700">No subscription plans yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Create your first plan above to start offering subscriptions.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Panel key={plan._id} className={plan.isArchived ? "opacity-60" : ""}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xl font-bold text-gray-900">
                    {plan.price > 0 ? money(plan.price) : "Free"}
                    {plan.price > 0 ? (
                      <span className="text-xs font-semibold text-gray-400"> /mo</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Pill
                    label={plan.isArchived ? "Archived" : plan.isActive ? "Active" : "Inactive"}
                    color={statusColor(plan.isArchived ? "EXPIRED" : plan.isActive ? "ACTIVE" : "PAUSED")}
                  />
                  {plan.isFallback ? (
                    <Pill label="Fallback" color="bg-sky-50 text-sky-700 border border-sky-100" />
                  ) : null}
                  {plan.badge ? (
                    <Pill
                      label={formatStatusLabel(plan.badge)}
                      color="bg-violet-50 text-violet-700 border border-violet-100"
                    />
                  ) : null}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-emerald-50 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    0% orders
                  </p>
                  <p className="text-lg font-bold text-emerald-800">{plan.freeOrderQuota}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    After quota
                  </p>
                  <p className="text-lg font-bold text-gray-900">{plan.commissionRate}%</p>
                </div>
              </div>

              {plan.description ? (
                <p className="mt-3 line-clamp-2 text-xs text-gray-500">{plan.description}</p>
              ) : null}

              <dl className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Restaurants</dt>
                  <dd className="font-semibold text-gray-800">{plan.restaurantCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Active</dt>
                  <dd className="font-semibold text-gray-800">{plan.activeCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Monthly revenue</dt>
                  <dd className="font-semibold text-gray-800">{money(plan.monthlyRevenue)}</dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                <Btn small onClick={() => startEdit(plan)}>
                  Edit
                </Btn>
                <Btn small onClick={() => duplicate(plan)}>
                  Duplicate
                </Btn>
                <Btn
                  small
                  variant={plan.isActive ? "default" : "success"}
                  onClick={() => toggleStatus(plan)}
                >
                  {plan.isActive ? "Deactivate" : "Activate"}
                </Btn>
                <Btn small variant="danger" onClick={() => remove(plan)}>
                  Delete
                </Btn>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Restaurant subscription management ──────────────────────────────────────

const RestaurantDetailPanel = ({ restaurantId, plans, onChanged, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [assignPlanId, setAssignPlanId] = useState("");
  const [extendDays, setExtendDays] = useState("30");
  const [bonusAmount, setBonusAmount] = useState("10");
  const [commissionRate, setCommissionRate] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/subscriptions/restaurants/${restaurantId}`);
      const data = getData(response, null);
      setDetail(data);
      setCommissionRate(
        data?.state?.subscription?.commissionRateOverride !== null &&
          data?.state?.subscription?.commissionRateOverride !== undefined
          ? String(data.state.subscription.commissionRateOverride)
          : ""
      );
      setPaymentAmount(String(data?.state?.plan?.price || ""));
    } catch (error) {
      toast.error(error?.message || "Unable to load subscription");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (request, successMessage, confirmMessage) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    try {
      await request();
      toast.success(successMessage);
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Panel>
        <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
      </Panel>
    );
  }

  if (!detail?.state) {
    return (
      <Panel className="py-10 text-center">
        <p className="text-sm text-gray-500">No subscription data for this restaurant.</p>
        <Btn small className="mt-3" onClick={onClose}>
          Close
        </Btn>
      </Panel>
    );
  }

  const { state, restaurant, history, audit } = detail;
  const { plan, quota, cycle, expiry, usage, subscription } = state;
  const base = `/admin/subscriptions/restaurants/${restaurantId}`;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-gray-900">{restaurant.name}</h3>
            <p className="text-xs text-gray-500">{restaurant.vendor?.email || "No vendor email"}</p>
          </div>
          <Btn small onClick={onClose}>
            Close
          </Btn>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Plan</p>
            <p className="mt-1 font-bold text-gray-900">{plan.name}</p>
            <p className="text-xs text-gray-500">
              {plan.price > 0 ? `${money(plan.price)}/mo` : "Free"} · {plan.commissionRate}% after
              quota
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
            <div className="mt-1 flex flex-wrap gap-1">
              <Pill label={formatStatusLabel(subscription.status)} color={statusColor(subscription.status)} />
              <Pill
                label={formatStatusLabel(subscription.paymentStatus)}
                color={statusColor(subscription.paymentStatus)}
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dates</p>
            <p className="mt-1 text-sm text-gray-800">Start {shortDate(subscription.startDate)}</p>
            <p className="text-sm text-gray-800">
              Expiry {shortDate(expiry.expiresAt)}
              {expiry.daysUntilExpiry !== null ? ` (${expiry.daysUntilExpiry}d)` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Free order quota
            </p>
            <p className="mt-1 text-sm text-gray-800">
              {quota.used} used · {quota.remaining} left of {quota.total}
            </p>
            <QuotaBar used={quota.used} total={quota.total} percent={quota.percent} />
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">Orders this cycle</p>
            <p className="font-bold text-gray-900">{usage.orders}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Commission this cycle</p>
            <p className="font-bold text-gray-900">{money(usage.commissionCharged)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Revenue this cycle</p>
            <p className="font-bold text-gray-900">{money(usage.grossRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cycle ends</p>
            <p className="font-bold text-gray-900">{shortDate(cycle.end)}</p>
          </div>
        </div>
      </Panel>

      {/* ── Admin actions ──────────────────────────────────────────────────── */}
      <Panel>
        <h4 className="mb-3 text-sm font-bold text-gray-800">Manage subscription</h4>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <SelectInput
              label="Assign or change plan"
              value={assignPlanId}
              onChange={(event) => setAssignPlanId(event.target.value)}
            >
              <option value="">Select a plan</option>
              {plans
                .filter((item) => !item.isArchived)
                .map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} — {item.price > 0 ? money(item.price) : "Free"} /{" "}
                    {item.freeOrderQuota} free / {item.commissionRate}%
                  </option>
                ))}
            </SelectInput>
            <Btn
              variant="primary"
              small
              disabled={busy || !assignPlanId}
              onClick={() =>
                run(
                  () => api.post(`${base}/assign`, { planId: assignPlanId }),
                  "Plan assigned",
                  "Assigning a plan starts a new billing cycle and resets quota usage. Continue?"
                )
              }
            >
              Assign plan
            </Btn>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Subscription state
            </p>
            <div className="flex flex-wrap gap-2">
              <Btn
                small
                disabled={busy || subscription.status === "ACTIVE"}
                onClick={() =>
                  run(() => api.patch(`${base}/status`, { status: "ACTIVE" }), "Subscription resumed")
                }
              >
                Reactivate
              </Btn>
              <Btn
                small
                disabled={busy || subscription.status === "PAUSED"}
                onClick={() =>
                  run(
                    () => api.patch(`${base}/status`, { status: "PAUSED" }),
                    "Subscription paused",
                    "Pausing stops free-order quota from applying. Continue?"
                  )
                }
              >
                Pause
              </Btn>
              <Btn
                small
                variant="danger"
                disabled={busy}
                onClick={() =>
                  run(
                    () => api.patch(`${base}/status`, { status: "CANCELLED" }),
                    "Subscription cancelled",
                    "Cancel this subscription? The restaurant moves to the fallback plan and keeps receiving orders."
                  )
                }
              >
                Cancel
              </Btn>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <TextInput
              label="Extend by (days)"
              type="number"
              min="1"
              className="w-32"
              value={extendDays}
              onChange={(event) => setExtendDays(event.target.value)}
            />
            <Btn
              small
              disabled={busy}
              onClick={() =>
                run(
                  () => api.patch(`${base}/extend`, { days: Number(extendDays) }),
                  `Extended by ${extendDays} days`
                )
              }
            >
              Extend
            </Btn>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <TextInput
              label="Bonus free orders"
              type="number"
              className="w-32"
              value={bonusAmount}
              onChange={(event) => setBonusAmount(event.target.value)}
            />
            <Btn
              small
              variant="success"
              disabled={busy}
              onClick={() =>
                run(
                  () => api.patch(`${base}/quota`, { amount: Math.abs(Number(bonusAmount)) }),
                  "Bonus quota added"
                )
              }
            >
              Add bonus
            </Btn>
            <Btn
              small
              disabled={busy}
              onClick={() =>
                run(
                  () => api.patch(`${base}/quota`, { amount: -Math.abs(Number(bonusAmount)) }),
                  "Bonus quota removed"
                )
              }
            >
              Remove bonus
            </Btn>
            <Btn
              small
              variant="danger"
              disabled={busy}
              onClick={() =>
                run(
                  () => api.post(`${base}/quota/reset`),
                  "Quota usage reset",
                  "Reset used free orders back to zero for this cycle?"
                )
              }
            >
              Reset usage
            </Btn>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <TextInput
              label="Custom commission (%)"
              type="number"
              min="0"
              max="100"
              step="0.5"
              className="w-40"
              value={commissionRate}
              onChange={(event) => setCommissionRate(event.target.value)}
              placeholder={String(plan.planCommissionRate)}
            />
            <Btn
              small
              disabled={busy}
              onClick={() =>
                run(
                  () => api.patch(`${base}/commission`, { rate: Number(commissionRate) }),
                  "Commission override applied",
                  `Override the commission to ${commissionRate}% for this restaurant?`
                )
              }
            >
              Apply
            </Btn>
            <Btn
              small
              disabled={busy || subscription.commissionRateOverride === null}
              onClick={() =>
                run(
                  () => api.patch(`${base}/commission`, { rate: null }),
                  "Override cleared, back to plan rate"
                )
              }
            >
              Clear override
            </Btn>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <TextInput
              label="Record payment (Rs)"
              type="number"
              min="0"
              className="w-36"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
            />
            <Btn
              small
              variant="success"
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    api.post(`${base}/payment`, {
                      amount: Number(paymentAmount),
                      status: "PAID",
                      provider: "MANUAL",
                    }),
                  "Payment recorded",
                  "Record this as a received payment? Only do this for payments you have actually confirmed."
                )
              }
            >
              Mark paid
            </Btn>
            <Btn
              small
              variant="danger"
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    api.post(`${base}/payment`, {
                      amount: Number(paymentAmount),
                      status: "FAILED",
                      provider: "MANUAL",
                    }),
                  "Payment marked failed"
                )
              }
            >
              Mark failed
            </Btn>
          </div>
        </div>
      </Panel>

      {/* ── History ────────────────────────────────────────────────────────── */}
      <TableShell>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Quota</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <EmptyRow colSpan={6} label="No subscription history" />
            ) : (
              history.map((entry) => (
                <tr key={entry._id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{entry.planName}</p>
                    <p className="text-xs text-gray-400">
                      {money(entry.price)} · {entry.commissionRate}%
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Pill label={formatStatusLabel(entry.status)} color={statusColor(entry.status)} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {entry.usedFreeOrders}/{entry.freeOrderQuota + entry.bonusFreeOrders}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {shortDate(entry.startDate)} → {shortDate(entry.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <Pill
                      label={formatStatusLabel(entry.paymentStatus)}
                      color={statusColor(entry.paymentStatus)}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {entry.source}
                    {entry.assignedBy ? ` · ${entry.assignedBy}` : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>

      {/* ── Audit trail ────────────────────────────────────────────────────── */}
      <Panel>
        <h4 className="mb-3 text-sm font-bold text-gray-800">Audit log</h4>
        {audit.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No admin actions recorded yet</p>
        ) : (
          <ul className="space-y-2">
            {audit.map((entry) => (
              <li
                key={entry._id}
                className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-50 pb-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {formatStatusLabel(entry.action)}
                  </p>
                  <p className="text-xs text-gray-500">{entry.description}</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>{entry.admin}</p>
                  <p>{displayDate(entry.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

const RestaurantsView = () => {
  const [rows, setRows] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subsRes, plansRes] = await Promise.all([
        api.get("/admin/subscriptions?limit=200"),
        api.get("/admin/subscriptions/plans"),
      ]);
      setRows(getData(subsRes, []));
      setPlans(getData(plansRes, []));
    } catch (error) {
      toast.error(error?.message || "Unable to load restaurant subscriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const name = row.restaurant?.name?.toLowerCase() || "";
      const matchesSearch = !term || name.includes(term);
      const status = row.subscription?.current?.status || "";
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  if (selectedId) {
    return (
      <RestaurantDetailPanel
        restaurantId={selectedId}
        plans={plans}
        onChanged={load}
        onClose={() => setSelectedId("")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search restaurants..." />
        <SelectInput
          label=""
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-44"
        >
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING_PAYMENT">Pending payment</option>
          <option value="PAUSED">Paused</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </SelectInput>
        <Btn small onClick={load} disabled={loading}>
          Refresh
        </Btn>
      </Toolbar>

      <TableShell>
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Restaurant</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Free order quota</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Renews</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <EmptyRow colSpan={7} label="Loading subscriptions..." />
            ) : filtered.length === 0 ? (
              <EmptyRow colSpan={7} label="No restaurants match these filters" />
            ) : (
              filtered.map((row) => {
                const current = row.subscription?.current || {};
                const usage = row.subscription?.usage || {};
                return (
                  <tr key={row.restaurant._id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{row.restaurant.name}</p>
                      <p className="text-xs text-gray-400">{row.restaurant.vendor?.email || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{current.name}</p>
                      <p className="text-xs text-gray-400">
                        {current.monthlyFee > 0 ? `${money(current.monthlyFee)}/mo` : "Free"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Pill
                        label={formatStatusLabel(current.status || "ACTIVE")}
                        color={statusColor(current.status || "ACTIVE")}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <QuotaBar
                        used={usage.freeOrdersUsed || 0}
                        total={usage.freeOrdersTotal || 0}
                        percent={usage.usagePercent || 0}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      {current.commissionPercent}%
                      {current.hasCustomCommission ? (
                        <span className="ml-1 text-xs text-violet-600">custom</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {shortDate(current.renewalDate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Btn small onClick={() => setSelectedId(row.restaurant._id)}>
                        Manage
                      </Btn>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
};

// ─── Analytics view ──────────────────────────────────────────────────────────

const AnalyticsView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const query = params.toString();
      const response = await api.get(
        `/admin/subscriptions/analytics${query ? `?${query}` : ""}`
      );
      setData(getData(response, null));
    } catch (error) {
      toast.error(error?.message || "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!data) return <Panel className="py-10 text-center text-sm text-gray-500">No data</Panel>;

  const { totals, planRows, nearQuota, expiringSoon, mostPopularPlan } = data;
  const maxRevenue = Math.max(1, ...planRows.map((row) => row.monthlyRevenue + row.commissionRevenue));

  return (
    <div className="space-y-4">
      <Toolbar>
        <TextInput
          label="From"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="w-40"
        />
        <TextInput
          label="To"
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="w-40"
        />
        <Btn small onClick={load} disabled={loading}>
          Apply
        </Btn>
      </Toolbar>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active subscriptions" value={totals.activeSubscriptions} />
        <StatCard
          label="Monthly recurring revenue"
          value={money(totals.monthlyRecurringRevenue)}
          accent="text-emerald-600"
        />
        <StatCard label="Commission revenue" value={money(totals.commissionRevenue)} hint="In range" />
        <StatCard
          label="Total revenue"
          value={money(totals.totalRevenue)}
          accent="text-orange-600"
          hint="Subscriptions + commission"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Near quota (80%+)" value={totals.restaurantsNearQuota} />
        <StatCard label="Expiring in 7 days" value={totals.expiringSoon} />
        <StatCard label="Expired" value={totals.expiredSubscriptions} />
        <StatCard
          label="Most popular plan"
          value={mostPopularPlan?.name || "—"}
          hint={mostPopularPlan ? `${mostPopularPlan.count} restaurants` : ""}
        />
      </div>

      {/* Revenue by plan — simple bar chart, no extra chart library needed */}
      <Panel>
        <h4 className="mb-3 text-sm font-bold text-gray-800">Revenue by plan</h4>
        {planRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No plans yet</p>
        ) : (
          <div className="space-y-3">
            {planRows.map((row) => {
              const total = row.monthlyRevenue + row.commissionRevenue;
              return (
                <div key={row._id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-semibold text-gray-800">{row.name}</span>
                    <span className="text-gray-500">
                      {money(total)}{" "}
                      <span className="text-xs text-gray-400">
                        ({row.activeCount} active)
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="bg-orange-500"
                      style={{ width: `${(row.monthlyRevenue / maxRevenue) * 100}%` }}
                      title={`Subscriptions ${money(row.monthlyRevenue)}`}
                    />
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${(row.commissionRevenue / maxRevenue) * 100}%` }}
                      title={`Commission ${money(row.commissionRevenue)}`}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex gap-4 pt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500" /> Subscription revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Commission revenue
              </span>
            </div>
          </div>
        )}
      </Panel>

      <TableShell>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Restaurants</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Subscription revenue</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Orders</th>
            </tr>
          </thead>
          <tbody>
            {planRows.length === 0 ? (
              <EmptyRow colSpan={7} label="No plans" />
            ) : (
              planRows.map((row) => (
                <tr key={row._id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                  <td className="px-4 py-3 text-gray-700">{money(row.price)}</td>
                  <td className="px-4 py-3 text-gray-700">{row.restaurantCount}</td>
                  <td className="px-4 py-3 text-gray-700">{row.activeCount}</td>
                  <td className="px-4 py-3 text-gray-700">{money(row.monthlyRevenue)}</td>
                  <td className="px-4 py-3 text-gray-700">{money(row.commissionRevenue)}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {row.orders}
                    <span className="ml-1 text-xs text-emerald-600">({row.freeOrders} free)</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel>
          <h4 className="mb-3 text-sm font-bold text-gray-800">Restaurants near quota</h4>
          {nearQuota.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">None close to their limit</p>
          ) : (
            <ul className="space-y-2">
              {nearQuota.map((row) => (
                <li key={String(row.restaurantId)} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {row.restaurantName}
                    </p>
                    <p className="text-xs text-gray-400">{row.planName}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-gray-900">{row.percent}%</p>
                    <p className="text-xs text-gray-400">
                      {row.used}/{row.total}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <h4 className="mb-3 text-sm font-bold text-gray-800">Expiring soon</h4>
          {expiringSoon.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Nothing expiring this week</p>
          ) : (
            <ul className="space-y-2">
              {expiringSoon.map((row) => (
                <li key={String(row.restaurantId)} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {row.restaurantName}
                    </p>
                    <p className="text-xs text-gray-400">{row.planName}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-orange-600">{row.daysRemaining}d</p>
                    <p className="text-xs text-gray-400">{shortDate(row.endDate)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
};

// ─── Root ────────────────────────────────────────────────────────────────────

const AdminSubscriptionsTab = () => {
  const [view, setView] = useState("plans");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-gray-100 bg-white p-1 shadow-sm">
        {SUB_VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`flex-shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              view === item.id
                ? "bg-orange-50 text-orange-700"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {view === "plans" ? <PlansView /> : null}
      {view === "restaurants" ? <RestaurantsView /> : null}
      {view === "analytics" ? <AnalyticsView /> : null}
    </div>
  );
};

export default AdminSubscriptionsTab;
