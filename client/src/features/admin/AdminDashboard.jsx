import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../services/api.js";
import { formatCompactDate, formatCurrency, formatDateTime, formatStatusLabel } from "../../utils/formatters.js";
import AdminChat from "./AdminChat.jsx";

const ORDER_STATUSES = [
  "SCHEDULED",
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED",
];

const PAYOUT_STATUSES = ["REQUESTED", "APPROVED", "PAID", "REJECTED"];
const TIFFIN_SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "EXPIRING_SOON", "EXPIRED", "CANCELLED"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const emptyRestaurantForm = {
  vendorId: "",
  name: "",
  description: "",
  address: "",
  category: "",
  cuisineType: "",
  imageUrl: "",
  deliveryTime: "30",
  deliveryRadiusKm: "5",
  baseDeliveryFee: "40",
  freeDeliveryAbove: "500",
  isVegOnly: false,
  isActive: true,
  isSelfDelivery: true,
  tiffinAvailable: false,
  tiffinPrice: "0",
  tiffinMealType: "veg",
  tiffinDescription: "",
  tiffinDeliveryType: "delivery",
  tiffinMealsPerDay: "1",
  tiffinDuration: "monthly",
};

const emptyMenuForm = {
  restaurantId: "",
  name: "",
  description: "",
  category: "",
  price: "",
  imageUrl: "",
  isVeg: true,
  isAvailable: true,
};

const nextWeekDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

const emptyPromoForm = {
  restaurantId: "",
  code: "",
  discountType: "PERCENTAGE",
  value: "",
  minOrderValue: "0",
  maxDiscount: "",
  validUntil: nextWeekDate(),
  usageLimit: "",
  isActive: true,
  isGameReward: false,
  gameKey: "any",
  gameRewardTier: "PLAY",
  gameMinScore: "40",
  gameHoldMinutes: "30",
};

const emptyTiffinProviderForm = {
  restaurantId: "",
  tiffinAvailable: false,
  tiffinPrice: "0",
  tiffinMealType: "veg",
  tiffinDescription: "",
  tiffinDeliveryType: "delivery",
  tiffinMealsPerDay: "1",
  tiffinDuration: "monthly",
  tiffinWeeklyMenu: DAYS.reduce((menu, day) => ({ ...menu, [day]: "" }), {}),
};

const emptySubscriptionForm = {
  customerId: "",
  restaurantId: "",
  planName: "Tiffin Plan",
  price: "",
  status: "ACTIVE",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  nextDelivery: "",
  isVeg: true,
  mealType: "Standard",
};

const emptyUserForm = {
  name: "",
  role: "customer",
  phone: "",
  address: "",
  loyaltyPoints: "0",
  nearCoins: "0",
  totalPointsEarned: "0",
};

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

const getData = (response, fallback) => response?.data ?? fallback;

const displayDate = (value) => (value ? formatDateTime(value) : "N/A");

const statusColor = (status) =>
  ({
    SCHEDULED: "bg-indigo-50 text-indigo-700 border border-indigo-100",
    PLACED: "bg-blue-50 text-blue-700 border border-blue-100",
    ACCEPTED: "bg-amber-50 text-amber-700 border border-amber-100",
    PREPARING: "bg-orange-50 text-orange-700 border border-orange-100",
    READY: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    OUT_FOR_DELIVERY: "bg-sky-50 text-sky-700 border border-sky-100",
    DELIVERED: "bg-green-50 text-green-700 border border-green-100",
    REJECTED: "bg-red-50 text-red-700 border border-red-100",
    ACTIVE: "bg-green-50 text-green-700 border border-green-100",
    PAUSED: "bg-amber-50 text-amber-700 border border-amber-100",
    EXPIRING_SOON: "bg-orange-50 text-orange-700 border border-orange-100",
    EXPIRED: "bg-gray-50 text-gray-600 border border-gray-100",
    CANCELLED: "bg-red-50 text-red-700 border border-red-100",
    REQUESTED: "bg-blue-50 text-blue-700 border border-blue-100",
    APPROVED: "bg-amber-50 text-amber-700 border border-amber-100",
    PAID: "bg-green-50 text-green-700 border border-green-100",
  }[status] || "bg-gray-50 text-gray-600 border border-gray-100");

const roleColor = (role) =>
  ({
    admin: "bg-violet-50 text-violet-700 border border-violet-100",
    vendor: "bg-orange-50 text-orange-700 border border-orange-100",
    customer: "bg-blue-50 text-blue-700 border border-blue-100",
  }[role] || "bg-gray-50 text-gray-600 border border-gray-100");

const Pill = ({ label, color }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
    {label}
  </span>
);

const Btn = ({ onClick, children, variant = "default", disabled, small, type = "button", className = "" }) => {
  const base = "rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const size = small ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm";
  const styles = {
    default: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "border border-red-100 bg-red-50 text-red-600 hover:bg-red-100",
    primary: "bg-orange-600 text-white hover:bg-orange-700",
    success: "border border-green-100 bg-green-50 text-green-700 hover:bg-green-100",
    ghost: "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${size} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

const TextInput = ({ label, className = "", ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
    <input
      {...props}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200"
    />
  </label>
);

const SelectInput = ({ label, children, className = "", ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
    <select
      {...props}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200"
    >
      {children}
    </select>
  </label>
);

const TextArea = ({ label, className = "", ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
    <textarea
      {...props}
      className="min-h-[84px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200"
    />
  </label>
);

const CheckboxField = ({ label, checked, onChange }) => (
  <label className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-200"
    />
    {label}
  </label>
);

const SearchInput = ({ value, onChange, placeholder }) => (
  <input
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    className="w-60 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
  />
);

const Toolbar = ({ children }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);

const Panel = ({ children, className = "" }) => (
  <section className={`rounded-lg border border-gray-100 bg-white p-4 shadow-sm ${className}`}>{children}</section>
);

const TableShell = ({ children }) => (
  <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
    <div className="overflow-x-auto">{children}</div>
  </div>
);

const EmptyRow = ({ colSpan, label }) => (
  <tr>
    <td colSpan={colSpan} className="py-8 text-center text-sm text-gray-400">
      {label}
    </td>
  </tr>
);

const StatCard = ({ label, value, sub, accent = "bg-orange-500" }) => (
  <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
    <div className={`mb-3 h-1 w-10 rounded-full ${accent}`} />
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    {sub ? <p className="mt-0.5 text-xs text-gray-500">{sub}</p> : null}
  </div>
);

const SectionTitle = ({ title, action }) => (
  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
    <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h2>
    {action}
  </div>
);

const ProgressRow = ({ label, value, sub, percent, color = "bg-orange-500" }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="shrink-0 font-semibold text-gray-900">{value}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, percent || 0))}%` }} />
    </div>
    {sub ? <p className="text-xs text-gray-400">{sub}</p> : null}
  </div>
);

const DetailGrid = ({ children }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
);

const DetailItem = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 text-sm font-medium text-gray-800">{value || "N/A"}</p>
  </div>
);

const RestaurantOptions = ({ restaurants, includeAll = false }) => (
  <>
    {includeAll ? <option value="all">All restaurants</option> : <option value="">Choose restaurant</option>}
    {restaurants.map((restaurant) => (
      <option key={restaurant._id} value={restaurant._id}>
        {restaurant.name}
      </option>
    ))}
  </>
);

const StatsTab = ({ onNavigate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/admin/stats")
      .then((response) => setStats(getData(response, null)))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="py-8 text-center text-sm text-gray-500">Loading stats...</p>;
  if (!stats) return null;

  const daily = stats.analytics?.daily || [];
  const orderStatuses = stats.analytics?.orderStatuses || [];
  const topRestaurants = stats.analytics?.topRestaurants || [];
  const recentOrders = stats.recent?.orders || [];
  const recentUsers = stats.recent?.users || [];
  const recentPayouts = stats.recent?.payouts || [];
  const maxDailyRevenue = Math.max(1, ...daily.map((item) => Number(item.revenue || 0)));
  const maxStatusCount = Math.max(1, ...orderStatuses.map((item) => Number(item.count || 0)));
  const openOrders = stats.orders?.pending || 0;
  const totalOrders = stats.orders?.total || 0;
  const deliveredOrders = stats.orders?.delivered || 0;
  const fulfillmentRate = totalOrders ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
  const activeRestaurantRate = stats.restaurants?.total
    ? Math.round(((stats.restaurants?.active || 0) / stats.restaurants.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Panel className="border-orange-100 bg-gradient-to-r from-white via-orange-50/60 to-sky-50/70">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Live admin overview</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-950">Operations command center</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              {openOrders} open orders, {stats.finance?.pendingPayouts || 0} payout requests, and{" "}
              {stats.tiffin?.activeSubscriptions || 0} active tiffin subscriptions need steady attention.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => onNavigate("orders")} variant="primary">
              Review orders
            </Btn>
            <Btn onClick={() => onNavigate("payouts")}>Payouts</Btn>
            <Btn onClick={load}>Refresh</Btn>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total users" value={stats.users?.total || 0} sub={`+${stats.users?.newThisWeek || 0} this week`} accent="bg-sky-500" />
        <StatCard label="Restaurants" value={stats.restaurants?.total || 0} sub={`${activeRestaurantRate}% active`} accent="bg-emerald-500" />
        <StatCard label="Total orders" value={totalOrders} sub={`${fulfillmentRate}% delivered`} accent="bg-orange-500" />
        <StatCard label="Revenue" value={formatCurrency(stats.revenue?.total || 0)} sub="from delivered orders" accent="bg-violet-500" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Customers" value={stats.users?.customers || 0} accent="bg-blue-500" />
        <StatCard label="Vendors" value={stats.users?.vendors || 0} accent="bg-amber-500" />
        <StatCard label="Menu items" value={stats.menu?.total || 0} sub={`${stats.menu?.active || 0} live`} accent="bg-lime-500" />
        <StatCard label="Open payouts" value={formatCurrency(stats.finance?.openPayoutAmount || 0)} sub={`${stats.finance?.pendingPayouts || 0} pending`} accent="bg-rose-500" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open orders" value={openOrders} sub={`+${stats.orders?.newThisWeek || 0} orders this week`} accent="bg-indigo-500" />
        <StatCard label="Delivered" value={deliveredOrders} accent="bg-green-500" />
        <StatCard label="Tiffin providers" value={stats.restaurants?.tiffinProviders || 0} accent="bg-teal-500" />
        <StatCard label="Active subscriptions" value={stats.tiffin?.activeSubscriptions || 0} accent="bg-fuchsia-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Panel>
          <SectionTitle title="7-day order flow" action={<span className="text-xs text-gray-400">{stats.growth?.newOrdersThisWeek || 0} orders this week</span>} />
          <div className="flex h-56 items-end gap-2">
            {daily.map((item) => (
              <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end rounded-lg bg-gray-50 px-1.5 pb-1.5">
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-orange-600 to-sky-400"
                    style={{ height: `${Math.max(8, (Number(item.revenue || 0) / maxDailyRevenue) * 100)}%` }}
                    title={`${item.orders} orders, ${formatCurrency(item.revenue || 0)}`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-700">{formatCurrency(item.revenue || 0)}</p>
                  <p className="text-[11px] text-gray-400">{formatCompactDate(item.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Order status mix" />
          <div className="space-y-4">
            {orderStatuses.filter((item) => item.count > 0).length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No order activity yet.</p>
            ) : (
              orderStatuses
                .filter((item) => item.count > 0)
                .map((item) => (
                  <ProgressRow
                    key={item.status}
                    label={formatStatusLabel(item.status)}
                    value={item.count}
                    sub={formatCurrency(item.revenue || 0)}
                    percent={(item.count / maxStatusCount) * 100}
                    color={item.status === "DELIVERED" ? "bg-green-500" : item.status === "REJECTED" ? "bg-red-500" : "bg-orange-500"}
                  />
                ))
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <SectionTitle title="Top restaurants" action={<Btn onClick={() => onNavigate("restaurants")} small>Manage</Btn>} />
          <div className="space-y-3">
            {topRestaurants.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No delivered order revenue yet.</p>
            ) : (
              topRestaurants.map((restaurant, index) => (
                <div key={restaurant._id || restaurant.name || index} className="flex items-center justify-between gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-900">{restaurant.name || "Deleted restaurant"}</p>
                    <p className="text-xs text-gray-400">{restaurant.orders || 0} delivered orders</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(restaurant.revenue || 0)}</p>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Recent orders" action={<Btn onClick={() => onNavigate("orders")} small>Open</Btn>} />
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No recent orders.</p>
            ) : (
              recentOrders.map((order) => (
                <div key={order._id} className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-mono text-xs font-semibold text-gray-700">#{String(order._id).slice(-6)}</p>
                    <p className="mt-0.5 text-sm text-gray-500">{order.customer?.name || "Customer"} at {order.restaurant?.name || "Restaurant"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.grandTotal || 0)}</p>
                    <Pill label={formatStatusLabel(order.status)} color={statusColor(order.status)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="New users" action={<Btn onClick={() => onNavigate("users")} small>Users</Btn>} />
          <div className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No users yet.</p>
            ) : (
              recentUsers.map((item) => (
                <div key={item._id} className="flex items-center justify-between gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.email}</p>
                  </div>
                  <Pill label={item.role} color={roleColor(item.role)} />
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle title="Finance queue" action={<Btn onClick={() => onNavigate("payouts")} small>Resolve payouts</Btn>} />
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4">
            {(stats.finance?.payoutsByStatus || []).map((item) => (
              <ProgressRow
                key={item.status}
                label={formatStatusLabel(item.status)}
                value={formatCurrency(item.amount || 0)}
                sub={`${item.count || 0} requests`}
                percent={stats.finance?.openPayoutAmount ? ((item.amount || 0) / stats.finance.openPayoutAmount) * 100 : item.count ? 100 : 0}
                color={item.status === "PAID" ? "bg-green-500" : item.status === "REJECTED" ? "bg-red-500" : "bg-sky-500"}
              />
            ))}
          </div>
          <div className="divide-y divide-gray-50">
            {recentPayouts.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No open payout requests.</p>
            ) : (
              recentPayouts.map((payout) => (
                <div key={payout._id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-900">{payout.vendor?.name || "Vendor"}</p>
                    <p className="text-xs text-gray-400">{payout.restaurant?.name || "Restaurant"} - {displayDate(payout.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(payout.amount || 0)}</p>
                    <Pill label={formatStatusLabel(payout.status)} color={statusColor(payout.status)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
};

const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyUserForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/admin/users${buildQuery({ role: roleFilter, search })}`)
      .then((response) => setUsers(getData(response, [])))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [roleFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("User deleted");
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      toast.success("Role updated");
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = () => {
    setEditingId("");
    setForm(emptyUserForm);
  };

  const startEdit = (user) => {
    setEditingId(user._id);
    setForm({
      name: user.name || "",
      role: user.role || "customer",
      phone: user.phone || "",
      address: user.address || "",
      loyaltyPoints: String(user.loyaltyPoints ?? 0),
      nearCoins: String(user.nearCoins ?? 0),
      totalPointsEarned: String(user.totalPointsEarned ?? user.loyaltyPoints ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await api.patch(`/admin/users/${editingId}`, form);
      toast.success("User updated");
      resetForm();
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {editingId ? (
        <Panel>
          <SectionTitle title="Edit user" action={<Btn onClick={resetForm} small>Close</Btn>} />
          <form onSubmit={saveUser} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <TextInput label="Name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
              <SelectInput label="Role" value={form.role} onChange={(event) => updateForm("role", event.target.value)}>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
                <option value="admin">Admin</option>
              </SelectInput>
              <TextInput label="Phone" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
              <TextInput label="Loyalty points" type="number" value={form.loyaltyPoints} onChange={(event) => updateForm("loyaltyPoints", event.target.value)} />
              <TextInput label="NearCoins" type="number" value={form.nearCoins} onChange={(event) => updateForm("nearCoins", event.target.value)} />
              <TextInput label="Lifetime points" type="number" value={form.totalPointsEarned} onChange={(event) => updateForm("totalPointsEarned", event.target.value)} />
            </div>
            <TextArea label="Address" value={form.address} onChange={(event) => updateForm("address", event.target.value)} />
            <div className="flex gap-2">
              <Btn type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving..." : "Save user"}
              </Btn>
              <Btn onClick={resetForm}>Cancel</Btn>
            </div>
          </form>
        </Panel>
      ) : null}

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or email..." />
        <div className="flex gap-1">
          {["all", "customer", "vendor", "admin"].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                roleFilter === role ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
        <Btn onClick={load} small>
          Refresh
        </Btn>
        <span className="text-xs text-gray-400">{users.length} users</span>
      </Toolbar>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {["Name", "Email", "Role", "Phone", "Loyalty", "Coins", "Joined", "Actions"].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <EmptyRow colSpan={8} label="Loading..." />
            ) : users.length === 0 ? (
              <EmptyRow colSpan={8} label="No users found" />
            ) : (
              users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.loyaltyTier || "BRONZE"}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <Pill label={user.role} color={roleColor(user.role)} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user.phone || "N/A"}</td>
                  <td className="px-4 py-3 text-gray-500">{user.loyaltyPoints || 0} pts</td>
                  <td className="px-4 py-3 text-gray-500">{user.nearCoins || 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{displayDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Btn onClick={() => startEdit(user)} small>
                        Edit
                      </Btn>
                      {user.role !== "admin" ? (
                        <select
                          value={user.role}
                          onChange={(event) => handleRoleChange(user._id, event.target.value)}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-200"
                        >
                          <option value="customer">customer</option>
                          <option value="vendor">vendor</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : null}
                      {user.role !== "admin" ? (
                        <Btn onClick={() => handleDelete(user._id, user.name)} variant="danger" small>
                          Delete
                        </Btn>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
};

const RestaurantsTab = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyRestaurantForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/admin/restaurants${buildQuery({ search, status: statusFilter })}`),
      api.get("/admin/users?role=vendor&limit=100").catch(() => ({ data: [] })),
    ])
      .then(([restaurantsResponse, vendorsResponse]) => {
        setRestaurants(getData(restaurantsResponse, []));
        setVendors(getData(vendorsResponse, []));
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = () => {
    setEditingId("");
    setForm(emptyRestaurantForm);
  };

  const startEdit = (restaurant) => {
    setEditingId(restaurant._id);
    setForm({
      vendorId: restaurant.vendor?._id || restaurant.vendor || "",
      name: restaurant.name || "",
      description: restaurant.description || "",
      address: restaurant.address || "",
      category: restaurant.category || "",
      cuisineType: (restaurant.cuisineType || []).join(", "),
      imageUrl: restaurant.imageUrl || "",
      deliveryTime: String(restaurant.deliveryTime ?? 30),
      deliveryRadiusKm: String(restaurant.deliveryRadiusKm ?? 5),
      baseDeliveryFee: String(restaurant.baseDeliveryFee ?? 40),
      freeDeliveryAbove: String(restaurant.freeDeliveryAbove ?? 500),
      isVegOnly: Boolean(restaurant.isVegOnly),
      isActive: Boolean(restaurant.isActive),
      isSelfDelivery: Boolean(restaurant.isSelfDelivery),
      tiffinAvailable: Boolean(restaurant.tiffinAvailable),
      tiffinPrice: String(restaurant.tiffinPrice ?? 0),
      tiffinMealType: restaurant.tiffinMealType || "veg",
      tiffinDescription: restaurant.tiffinDescription || "",
      tiffinDeliveryType: restaurant.tiffinDeliveryType || "delivery",
      tiffinMealsPerDay: String(restaurant.tiffinMealsPerDay ?? 1),
      tiffinDuration: restaurant.tiffinDuration || "monthly",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/admin/restaurants/${editingId}`, form);
        toast.success("Restaurant updated");
      } else {
        await api.post("/admin/restaurants", form);
        toast.success("Restaurant created");
      }
      resetForm();
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (restaurant) => {
    try {
      await api.patch(`/admin/restaurants/${restaurant._id}/toggle`, {});
      toast.success(`${restaurant.name} is now ${restaurant.isActive ? "paused" : "live"}`);
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (restaurant) => {
    if (!window.confirm(`Delete restaurant "${restaurant.name}" and its menu/promos/subscriptions?`)) return;
    try {
      await api.delete(`/admin/restaurants/${restaurant._id}`);
      toast.success("Restaurant deleted");
      if (editingId === restaurant._id) resetForm();
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-5">
      <Panel>
        <SectionTitle title={editingId ? "Edit restaurant" : "Create restaurant"} action={editingId ? <Btn onClick={resetForm} small>New restaurant</Btn> : null} />
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <SelectInput label="Owner" value={form.vendorId} onChange={(event) => updateForm("vendorId", event.target.value)} disabled={Boolean(editingId)}>
              <option value="">Choose vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor._id} value={vendor._id}>
                  {vendor.name} ({vendor.email})
                </option>
              ))}
            </SelectInput>
            <TextInput label="Name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
            <TextInput label="Category" value={form.category} onChange={(event) => updateForm("category", event.target.value)} required />
            <TextInput label="Image URL" value={form.imageUrl} onChange={(event) => updateForm("imageUrl", event.target.value)} />
            <TextInput label="Cuisine tags" value={form.cuisineType} onChange={(event) => updateForm("cuisineType", event.target.value)} placeholder="Punjabi, Chinese" />
            <TextInput label="Delivery minutes" type="number" value={form.deliveryTime} onChange={(event) => updateForm("deliveryTime", event.target.value)} />
            <TextInput label="Delivery radius km" type="number" value={form.deliveryRadiusKm} onChange={(event) => updateForm("deliveryRadiusKm", event.target.value)} />
            <TextInput label="Base delivery fee" type="number" value={form.baseDeliveryFee} onChange={(event) => updateForm("baseDeliveryFee", event.target.value)} />
            <TextInput label="Free delivery above" type="number" value={form.freeDeliveryAbove} onChange={(event) => updateForm("freeDeliveryAbove", event.target.value)} />
          </div>
          <TextArea label="Address" value={form.address} onChange={(event) => updateForm("address", event.target.value)} required />
          <TextArea label="Description" value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <CheckboxField label="Live" checked={form.isActive} onChange={(value) => updateForm("isActive", value)} />
            <CheckboxField label="Veg only" checked={form.isVegOnly} onChange={(value) => updateForm("isVegOnly", value)} />
            <CheckboxField label="Self delivery" checked={form.isSelfDelivery} onChange={(value) => updateForm("isSelfDelivery", value)} />
            <CheckboxField label="Tiffin available" checked={form.tiffinAvailable} onChange={(value) => updateForm("tiffinAvailable", value)} />
          </div>
          {form.tiffinAvailable ? (
            <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700">Tiffin details</p>
              <div className="grid gap-3 md:grid-cols-4">
                <TextInput label="Tiffin price" type="number" value={form.tiffinPrice} onChange={(event) => updateForm("tiffinPrice", event.target.value)} />
                <SelectInput label="Meal type" value={form.tiffinMealType} onChange={(event) => updateForm("tiffinMealType", event.target.value)}>
                  <option value="veg">Veg</option>
                  <option value="non-veg">Non-veg</option>
                  <option value="both">Both</option>
                </SelectInput>
                <SelectInput label="Delivery type" value={form.tiffinDeliveryType} onChange={(event) => updateForm("tiffinDeliveryType", event.target.value)}>
                  <option value="delivery">Delivery</option>
                  <option value="pickup">Pickup</option>
                  <option value="both">Both</option>
                </SelectInput>
                <SelectInput label="Duration" value={form.tiffinDuration} onChange={(event) => updateForm("tiffinDuration", event.target.value)}>
                  <option value="weekly">Weekly</option>
                  <option value="10days">10 days</option>
                  <option value="15days">15 days</option>
                  <option value="monthly">Monthly</option>
                </SelectInput>
                <TextInput label="Meals per day" type="number" value={form.tiffinMealsPerDay} onChange={(event) => updateForm("tiffinMealsPerDay", event.target.value)} />
                <TextArea label="Tiffin description" className="md:col-span-3" value={form.tiffinDescription} onChange={(event) => updateForm("tiffinDescription", event.target.value)} />
              </div>
            </div>
          ) : null}
          <div className="flex gap-2">
            <Btn type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Create restaurant"}
            </Btn>
            <Btn onClick={resetForm}>Clear</Btn>
          </div>
        </form>
      </Panel>

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search restaurant..." />
        <div className="flex gap-1">
          {["all", "active", "paused", "tiffin"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                statusFilter === status ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <Btn onClick={load} small>
          Refresh
        </Btn>
        <span className="text-xs text-gray-400">{restaurants.length} restaurants</span>
      </Toolbar>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {["Restaurant", "Vendor", "Category", "Menu", "Orders", "Revenue", "Status", "Actions"].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <EmptyRow colSpan={8} label="Loading..." />
            ) : restaurants.length === 0 ? (
              <EmptyRow colSpan={8} label="No restaurants found" />
            ) : (
              restaurants.map((restaurant) => (
                <tr key={restaurant._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{restaurant.name}</p>
                    <p className="max-w-[220px] truncate text-xs text-gray-400">{restaurant.address}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-700">{restaurant.vendor?.name || "N/A"}</p>
                    <p className="text-xs text-gray-400">{restaurant.vendor?.email || ""}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{restaurant.category}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {restaurant.activeMenuCount || 0}/{restaurant.menuCount || 0}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{restaurant.orderCount || 0}</td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(restaurant.totalRevenue || 0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Pill label={restaurant.isActive ? "Live" : "Paused"} color={restaurant.isActive ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-50 text-gray-600 border border-gray-100"} />
                      {restaurant.tiffinAvailable ? <Pill label="Tiffin" color="bg-amber-50 text-amber-700 border border-amber-100" /> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Btn onClick={() => startEdit(restaurant)} small>
                        Edit
                      </Btn>
                      <Btn onClick={() => handleToggle(restaurant)} variant={restaurant.isActive ? "default" : "success"} small>
                        {restaurant.isActive ? "Pause" : "Go live"}
                      </Btn>
                      <Btn onClick={() => handleDelete(restaurant)} variant="danger" small>
                        Delete
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
};

const MenuTab = () => {
  const [items, setItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [restaurantId, setRestaurantId] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyMenuForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/admin/menu${buildQuery({ search, restaurantId, availability })}`),
      api.get("/admin/restaurants?status=all").catch(() => ({ data: [] })),
    ])
      .then(([itemsResponse, restaurantsResponse]) => {
        setItems(getData(itemsResponse, []));
        setRestaurants(getData(restaurantsResponse, []));
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [availability, restaurantId, search]);

  useEffect(() => {
    load();
  }, [load]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = () => {
    setEditingId("");
    setForm(emptyMenuForm);
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      restaurantId: item.restaurant?._id || item.restaurant || "",
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      price: String(item.price ?? ""),
      imageUrl: item.imageUrl || "",
      isVeg: Boolean(item.isVeg),
      isAvailable: Boolean(item.isAvailable),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/admin/menu/${editingId}`, form);
        toast.success("Menu item updated");
      } else {
        await api.post("/admin/menu", form);
        toast.success("Menu item created");
      }
      resetForm();
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item) => {
    try {
      await api.patch(`/admin/menu/${item._id}/availability`, { isAvailable: !item.isAvailable });
      toast.success(item.isAvailable ? "Item paused" : "Item is live");
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete menu item "${item.name}"?`)) return;
    try {
      await api.delete(`/admin/menu/${item._id}`);
      toast.success("Menu item deleted");
      if (editingId === item._id) resetForm();
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-5">
      <Panel>
        <SectionTitle title={editingId ? "Edit menu item" : "Create menu item"} action={editingId ? <Btn onClick={resetForm} small>New item</Btn> : null} />
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <SelectInput label="Restaurant" value={form.restaurantId} onChange={(event) => updateForm("restaurantId", event.target.value)} required>
              <RestaurantOptions restaurants={restaurants} />
            </SelectInput>
            <TextInput label="Dish name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
            <TextInput label="Category" value={form.category} onChange={(event) => updateForm("category", event.target.value)} required />
            <TextInput label="Price" type="number" value={form.price} onChange={(event) => updateForm("price", event.target.value)} required />
            <TextInput label="Image URL" value={form.imageUrl} onChange={(event) => updateForm("imageUrl", event.target.value)} />
          </div>
          <TextArea label="Description" value={form.description} onChange={(event) => updateForm("description", event.target.value)} required />
          <div className="flex flex-wrap gap-2">
            <CheckboxField label="Veg item" checked={form.isVeg} onChange={(value) => updateForm("isVeg", value)} />
            <CheckboxField label="Available" checked={form.isAvailable} onChange={(value) => updateForm("isAvailable", value)} />
          </div>
          <div className="flex gap-2">
            <Btn type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save item" : "Create item"}
            </Btn>
            <Btn onClick={resetForm}>Clear</Btn>
          </div>
        </form>
      </Panel>

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search menu..." />
        <select value={restaurantId} onChange={(event) => setRestaurantId(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <RestaurantOptions restaurants={restaurants} includeAll />
        </select>
        <select value={availability} onChange={(event) => setAvailability(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="all">All availability</option>
          <option value="live">Live</option>
          <option value="paused">Paused</option>
        </select>
        <Btn onClick={load} small>
          Refresh
        </Btn>
        <span className="text-xs text-gray-400">{items.length} items</span>
      </Toolbar>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {["Item", "Restaurant", "Category", "Price", "Veg", "Status", "Actions"].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <EmptyRow colSpan={7} label="Loading..." />
            ) : items.length === 0 ? (
              <EmptyRow colSpan={7} label="No menu items found" />
            ) : (
              items.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="max-w-[240px] truncate text-xs text-gray-400">{item.description}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.restaurant?.name || "N/A"}</td>
                  <td className="px-4 py-3 text-gray-500">{item.category}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(item.price)}</td>
                  <td className="px-4 py-3 text-gray-500">{item.isVeg ? "Veg" : "Non-veg"}</td>
                  <td className="px-4 py-3">
                    <Pill label={item.isAvailable ? "Live" : "Paused"} color={item.isAvailable ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-50 text-gray-600 border border-gray-100"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Btn onClick={() => startEdit(item)} small>
                        Edit
                      </Btn>
                      <Btn onClick={() => toggleAvailability(item)} small>
                        {item.isAvailable ? "Pause" : "Go live"}
                      </Btn>
                      <Btn onClick={() => deleteItem(item)} variant="danger" small>
                        Delete
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
};

const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/admin/orders${buildQuery({ status: statusFilter, search })}`)
      .then((response) => setOrders(getData(response, [])))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/admin/orders/${id}/status`, { status });
      toast.success("Order status updated");
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await api.delete(`/admin/orders/${id}`);
      toast.success("Order deleted");
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search customer, restaurant..." />
        <div className="flex flex-wrap gap-1">
          {["all", ...ORDER_STATUSES].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                statusFilter === status ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status === "all" ? "all" : formatStatusLabel(status)}
            </button>
          ))}
        </div>
        <Btn onClick={load} small>
          Refresh
        </Btn>
        <span className="text-xs text-gray-400">{orders.length} orders</span>
      </Toolbar>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {["Order ID", "Customer", "Restaurant", "Total", "Status", "Time", "Actions"].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <EmptyRow colSpan={7} label="Loading..." />
            ) : orders.length === 0 ? (
              <EmptyRow colSpan={7} label="No orders found" />
            ) : (
              orders.map((order) => (
                <Fragment key={order._id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">#{order._id.slice(-6)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{order.customer?.name || "N/A"}</p>
                      <p className="text-xs text-gray-400">{order.customer?.email || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{order.restaurant?.name || "N/A"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(order.grandTotal)}</td>
                    <td className="px-4 py-3">
                      <Pill label={formatStatusLabel(order.status)} color={statusColor(order.status)} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{displayDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Btn onClick={() => setExpandedOrderId((current) => (current === order._id ? "" : order._id))} small>
                          {expandedOrderId === order._id ? "Hide" : "Details"}
                        </Btn>
                        <select
                          value={order.status}
                          onChange={(event) => handleStatusChange(order._id, event.target.value)}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-200"
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {formatStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                        <Btn onClick={() => handleDelete(order._id)} variant="danger" small>
                          Del
                        </Btn>
                      </div>
                    </td>
                  </tr>
                  {expandedOrderId === order._id ? (
                    <tr className="bg-gray-50/80">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                          <div className="rounded-lg border border-gray-100 bg-white p-4">
                            <SectionTitle title="Order items" />
                            <div className="divide-y divide-gray-50">
                              {(order.items || []).map((item) => (
                                <div key={`${item.menuItem || item.name}-${item.quantity}`} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                                  <div>
                                    <p className="font-medium text-gray-900">{item.name}</p>
                                    <p className="text-xs text-gray-400">Qty {item.quantity} x {formatCurrency(item.price)}</p>
                                  </div>
                                  <p className="font-semibold text-gray-900">{formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="rounded-lg border border-gray-100 bg-white p-4">
                              <SectionTitle title="Delivery and payment" />
                              <DetailGrid>
                                <DetailItem label="Customer phone" value={order.customer?.phone} />
                                <DetailItem label="Payment method" value={order.paymentMethod} />
                                <DetailItem label="Payment status" value={formatStatusLabel(order.paymentStatus)} />
                                <DetailItem label="Scheduled for" value={order.scheduledFor ? displayDate(order.scheduledFor) : "ASAP"} />
                              </DetailGrid>
                              <div className="mt-4">
                                <DetailItem label="Address" value={order.deliveryAddress} />
                              </div>
                              {order.deliveryInstructions ? (
                                <div className="mt-4">
                                  <DetailItem label="Instructions" value={order.deliveryInstructions} />
                                </div>
                              ) : null}
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="rounded-lg border border-gray-100 bg-white p-4">
                                <SectionTitle title="Bill" />
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between"><span className="text-gray-500">Items</span><span className="font-medium">{formatCurrency(order.itemTotal)}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span className="font-medium">{formatCurrency(order.deliveryFee)}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">Platform</span><span className="font-medium">{formatCurrency(order.platformFee)}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">GST</span><span className="font-medium">{formatCurrency(order.gst)}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="font-medium text-green-700">-{formatCurrency((order.promoDiscount || 0) + (order.loyaltyDiscount || 0))}</span></div>
                                  <div className="border-t border-gray-100 pt-2">
                                    <div className="flex justify-between text-base font-bold text-gray-900"><span>Total</span><span>{formatCurrency(order.grandTotal)}</span></div>
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-lg border border-gray-100 bg-white p-4">
                                <SectionTitle title="Timeline" />
                                <div className="space-y-2">
                                  {(order.statusTimeline || []).map((event, index) => (
                                    <div key={`${event.status}-${event.changedAt}-${index}`} className="flex items-start gap-2">
                                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                                      <div>
                                        <p className="text-sm font-medium text-gray-800">{formatStatusLabel(event.status)}</p>
                                        <p className="text-xs text-gray-400">{displayDate(event.changedAt)}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
};

const PromosTab = () => {
  const [promos, setPromos] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [restaurantId, setRestaurantId] = useState("all");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyPromoForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/admin/promos${buildQuery({ type, status, restaurantId, search })}`),
      api.get("/admin/restaurants?status=all").catch(() => ({ data: [] })),
    ])
      .then(([promosResponse, restaurantsResponse]) => {
        setPromos(getData(promosResponse, []));
        setRestaurants(getData(restaurantsResponse, []));
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [restaurantId, search, status, type]);

  useEffect(() => {
    load();
  }, [load]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = () => {
    setEditingId("");
    setForm({ ...emptyPromoForm, validUntil: nextWeekDate() });
  };

  const startEdit = (promo) => {
    setEditingId(promo._id);
    setForm({
      restaurantId: promo.restaurant?._id || promo.restaurant || "",
      code: promo.code || "",
      discountType: promo.discountType || "PERCENTAGE",
      value: String(promo.value ?? ""),
      minOrderValue: String(promo.minOrderValue ?? 0),
      maxDiscount: promo.maxDiscount === null || promo.maxDiscount === undefined ? "" : String(promo.maxDiscount),
      validUntil: promo.validUntil ? new Date(promo.validUntil).toISOString().slice(0, 10) : nextWeekDate(),
      usageLimit: promo.usageLimit === null || promo.usageLimit === undefined ? "" : String(promo.usageLimit),
      isActive: Boolean(promo.isActive),
      isGameReward: Boolean(promo.isGameReward),
      gameKey: promo.gameKey || "any",
      gameRewardTier: promo.gameRewardTier || "PLAY",
      gameMinScore: String(promo.gameMinScore ?? 40),
      gameHoldMinutes: String(promo.gameHoldMinutes ?? 30),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/admin/promos/${editingId}`, form);
        toast.success("Promo updated");
      } else {
        await api.post("/admin/promos", form);
        toast.success("Promo created");
      }
      resetForm();
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePromo = async (promo) => {
    try {
      await api.patch(`/admin/promos/${promo._id}/status`, { isActive: !promo.isActive });
      toast.success(promo.isActive ? "Promo disabled" : "Promo enabled");
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const deletePromo = async (promo) => {
    if (!window.confirm(`Delete promo "${promo.code}"?`)) return;
    try {
      await api.delete(`/admin/promos/${promo._id}`);
      toast.success("Promo deleted");
      if (editingId === promo._id) resetForm();
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const promoState = (promo) => {
    if (!promo.isActive) return "Disabled";
    if (promo.validUntil && new Date(promo.validUntil) < new Date()) return "Expired";
    return "Active";
  };

  return (
    <div className="space-y-5">
      <Panel>
        <SectionTitle title={editingId ? "Edit promo" : "Create promo or reward"} action={editingId ? <Btn onClick={resetForm} small>New promo</Btn> : null} />
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <SelectInput label="Restaurant" value={form.restaurantId} onChange={(event) => updateForm("restaurantId", event.target.value)} required>
              <RestaurantOptions restaurants={restaurants} />
            </SelectInput>
            <TextInput label="Code" value={form.code} onChange={(event) => updateForm("code", event.target.value.toUpperCase())} required />
            <SelectInput label="Discount type" value={form.discountType} onChange={(event) => updateForm("discountType", event.target.value)}>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FLAT">Flat</option>
            </SelectInput>
            <TextInput label="Value" type="number" value={form.value} onChange={(event) => updateForm("value", event.target.value)} required />
            <TextInput label="Min order" type="number" value={form.minOrderValue} onChange={(event) => updateForm("minOrderValue", event.target.value)} />
            <TextInput label="Max discount" type="number" value={form.maxDiscount} onChange={(event) => updateForm("maxDiscount", event.target.value)} />
            <TextInput label="Valid until" type="date" value={form.validUntil} onChange={(event) => updateForm("validUntil", event.target.value)} required />
            <TextInput label="Usage limit" type="number" value={form.usageLimit} onChange={(event) => updateForm("usageLimit", event.target.value)} />
            <TextInput label="Game key" value={form.gameKey} onChange={(event) => updateForm("gameKey", event.target.value)} />
            <SelectInput label="Reward tier" value={form.gameRewardTier} onChange={(event) => updateForm("gameRewardTier", event.target.value)}>
              <option value="PLAY">Play</option>
              <option value="TOP">Top score</option>
            </SelectInput>
            <TextInput label="Min score" type="number" value={form.gameMinScore} onChange={(event) => updateForm("gameMinScore", event.target.value)} />
            <TextInput label="Hold minutes" type="number" value={form.gameHoldMinutes} onChange={(event) => updateForm("gameHoldMinutes", event.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <CheckboxField label="Active" checked={form.isActive} onChange={(value) => updateForm("isActive", value)} />
            <CheckboxField label="Game reward" checked={form.isGameReward} onChange={(value) => updateForm("isGameReward", value)} />
          </div>
          <div className="flex gap-2">
            <Btn type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save promo" : "Create promo"}
            </Btn>
            <Btn onClick={resetForm}>Clear</Btn>
          </div>
        </form>
      </Panel>

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search promo code..." />
        <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="all">All types</option>
          <option value="coupon">Coupons</option>
          <option value="reward">Game rewards</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="expired">Expired</option>
        </select>
        <select value={restaurantId} onChange={(event) => setRestaurantId(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <RestaurantOptions restaurants={restaurants} includeAll />
        </select>
        <Btn onClick={load} small>
          Refresh
        </Btn>
      </Toolbar>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {["Code", "Restaurant", "Type", "Value", "Usage", "Valid until", "Status", "Actions"].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <EmptyRow colSpan={8} label="Loading..." />
            ) : promos.length === 0 ? (
              <EmptyRow colSpan={8} label="No promos found" />
            ) : (
              promos.map((promo) => (
                <tr key={promo._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">{promo.code}</td>
                  <td className="px-4 py-3 text-gray-600">{promo.restaurant?.name || "N/A"}</td>
                  <td className="px-4 py-3">
                    <Pill label={promo.isGameReward ? "Reward" : "Coupon"} color={promo.isGameReward ? "bg-sky-50 text-sky-700 border border-sky-100" : "bg-orange-50 text-orange-700 border border-orange-100"} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{promo.discountType === "PERCENTAGE" ? `${promo.value}%` : formatCurrency(promo.value)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {promo.usedCount || 0}/{promo.usageLimit || "unlimited"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{displayDate(promo.validUntil)}</td>
                  <td className="px-4 py-3">
                    <Pill label={promoState(promo)} color={promoState(promo) === "Active" ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-50 text-gray-600 border border-gray-100"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Btn onClick={() => startEdit(promo)} small>
                        Edit
                      </Btn>
                      <Btn onClick={() => togglePromo(promo)} small>
                        {promo.isActive ? "Disable" : "Enable"}
                      </Btn>
                      <Btn onClick={() => deletePromo(promo)} variant="danger" small>
                        Delete
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
};

const TiffinTab = () => {
  const [providers, setProviders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providerSearch, setProviderSearch] = useState("");
  const [providerStatus, setProviderStatus] = useState("all");
  const [subscriptionStatus, setSubscriptionStatus] = useState("all");
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [providerForm, setProviderForm] = useState(emptyTiffinProviderForm);
  const [subscriptionForm, setSubscriptionForm] = useState(emptySubscriptionForm);
  const [savingProvider, setSavingProvider] = useState(false);
  const [savingSubscription, setSavingSubscription] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/admin/tiffins${buildQuery({ status: providerStatus, search: providerSearch })}`),
      api.get(`/admin/tiffin-subscriptions${buildQuery({ status: subscriptionStatus, search: subscriptionSearch })}`),
      api.get("/admin/users?role=customer&limit=100").catch(() => ({ data: [] })),
    ])
      .then(([providersResponse, subscriptionsResponse, customersResponse]) => {
        const providerData = getData(providersResponse, []);
        setProviders(providerData);
        setSubscriptions(getData(subscriptionsResponse, []));
        setCustomers(getData(customersResponse, []));
        setProviderForm((current) => (current.restaurantId ? current : { ...emptyTiffinProviderForm, restaurantId: providerData[0]?._id || "" }));
        setSubscriptionForm((current) => (current.restaurantId ? current : { ...emptySubscriptionForm, restaurantId: providerData[0]?._id || "" }));
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [providerSearch, providerStatus, subscriptionSearch, subscriptionStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const updateProviderForm = (field, value) => setProviderForm((current) => ({ ...current, [field]: value }));
  const updateSubscriptionForm = (field, value) => setSubscriptionForm((current) => ({ ...current, [field]: value }));

  const startEditProvider = (restaurant) => {
    setProviderForm({
      restaurantId: restaurant._id,
      tiffinAvailable: Boolean(restaurant.tiffinAvailable),
      tiffinPrice: String(restaurant.tiffinPrice ?? 0),
      tiffinMealType: restaurant.tiffinMealType || "veg",
      tiffinDescription: restaurant.tiffinDescription || "",
      tiffinDeliveryType: restaurant.tiffinDeliveryType || "delivery",
      tiffinMealsPerDay: String(restaurant.tiffinMealsPerDay ?? 1),
      tiffinDuration: restaurant.tiffinDuration || "monthly",
      tiffinWeeklyMenu: DAYS.reduce(
        (menu, day) => ({ ...menu, [day]: restaurant.tiffinWeeklyMenu?.[day] || "" }),
        {}
      ),
    });
  };

  const saveProvider = async (event) => {
    event.preventDefault();
    if (!providerForm.restaurantId) {
      toast.error("Choose a restaurant");
      return;
    }
    setSavingProvider(true);
    try {
      await api.patch(`/admin/tiffins/${providerForm.restaurantId}`, providerForm);
      toast.success("Tiffin provider updated");
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingProvider(false);
    }
  };

  const saveSubscription = async (event) => {
    event.preventDefault();
    setSavingSubscription(true);
    try {
      await api.post("/admin/tiffin-subscriptions", subscriptionForm);
      toast.success("Subscription created");
      setSubscriptionForm(emptySubscriptionForm);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingSubscription(false);
    }
  };

  const updateSubscriptionStatus = async (subscription, status) => {
    try {
      await api.patch(`/admin/tiffin-subscriptions/${subscription._id}/status`, { status });
      toast.success("Subscription updated");
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Panel>
        <SectionTitle title="Tiffin provider" />
        <form onSubmit={saveProvider} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <SelectInput label="Restaurant" value={providerForm.restaurantId} onChange={(event) => updateProviderForm("restaurantId", event.target.value)}>
              <RestaurantOptions restaurants={providers} />
            </SelectInput>
            <TextInput label="Price" type="number" value={providerForm.tiffinPrice} onChange={(event) => updateProviderForm("tiffinPrice", event.target.value)} />
            <SelectInput label="Meal type" value={providerForm.tiffinMealType} onChange={(event) => updateProviderForm("tiffinMealType", event.target.value)}>
              <option value="veg">Veg</option>
              <option value="non-veg">Non-veg</option>
              <option value="both">Both</option>
            </SelectInput>
            <SelectInput label="Delivery type" value={providerForm.tiffinDeliveryType} onChange={(event) => updateProviderForm("tiffinDeliveryType", event.target.value)}>
              <option value="delivery">Delivery</option>
              <option value="pickup">Pickup</option>
              <option value="both">Both</option>
            </SelectInput>
            <TextInput label="Meals per day" type="number" value={providerForm.tiffinMealsPerDay} onChange={(event) => updateProviderForm("tiffinMealsPerDay", event.target.value)} />
            <SelectInput label="Duration" value={providerForm.tiffinDuration} onChange={(event) => updateProviderForm("tiffinDuration", event.target.value)}>
              <option value="weekly">Weekly</option>
              <option value="10days">10 days</option>
              <option value="15days">15 days</option>
              <option value="monthly">Monthly</option>
            </SelectInput>
          </div>
          <TextArea label="Description" value={providerForm.tiffinDescription} onChange={(event) => updateProviderForm("tiffinDescription", event.target.value)} />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {DAYS.map((day) => (
              <TextInput
                key={day}
                label={day}
                value={providerForm.tiffinWeeklyMenu?.[day] || ""}
                onChange={(event) =>
                  updateProviderForm("tiffinWeeklyMenu", {
                    ...providerForm.tiffinWeeklyMenu,
                    [day]: event.target.value,
                  })
                }
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <CheckboxField label="Available" checked={providerForm.tiffinAvailable} onChange={(value) => updateProviderForm("tiffinAvailable", value)} />
            <Btn type="submit" variant="primary" disabled={savingProvider}>
              {savingProvider ? "Saving..." : "Save provider"}
            </Btn>
          </div>
        </form>
      </Panel>

      <div className="space-y-4">
        <Toolbar>
          <SearchInput value={providerSearch} onChange={setProviderSearch} placeholder="Search providers..." />
          <select value={providerStatus} onChange={(event) => setProviderStatus(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="all">All providers</option>
            <option value="available">Available</option>
            <option value="disabled">Disabled</option>
          </select>
          <Btn onClick={load} small>
            Refresh
          </Btn>
        </Toolbar>
        <TableShell>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Provider", "Vendor", "Price", "Meal", "Subscriptions", "Status", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <EmptyRow colSpan={7} label="Loading..." />
              ) : providers.length === 0 ? (
                <EmptyRow colSpan={7} label="No providers found" />
              ) : (
                providers.map((provider) => (
                  <tr key={provider._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{provider.name}</td>
                    <td className="px-4 py-3 text-gray-500">{provider.vendor?.name || "N/A"}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(provider.tiffinPrice || 0)}</td>
                    <td className="px-4 py-3 text-gray-500">{provider.tiffinMealType || "veg"}</td>
                    <td className="px-4 py-3 text-gray-700">{provider.activeSubscriptions || 0}</td>
                    <td className="px-4 py-3">
                      <Pill label={provider.tiffinAvailable ? "Available" : "Disabled"} color={provider.tiffinAvailable ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-50 text-gray-600 border border-gray-100"} />
                    </td>
                    <td className="px-4 py-3">
                      <Btn onClick={() => startEditProvider(provider)} small>
                        Edit
                      </Btn>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableShell>
      </div>

      <Panel>
        <SectionTitle title="Create subscription" />
        <form onSubmit={saveSubscription} className="grid gap-3 md:grid-cols-4">
          <SelectInput label="Customer" value={subscriptionForm.customerId} onChange={(event) => updateSubscriptionForm("customerId", event.target.value)} required>
            <option value="">Choose customer</option>
            {customers.map((customer) => (
              <option key={customer._id} value={customer._id}>
                {customer.name} ({customer.email})
              </option>
            ))}
          </SelectInput>
          <SelectInput label="Restaurant" value={subscriptionForm.restaurantId} onChange={(event) => updateSubscriptionForm("restaurantId", event.target.value)} required>
            <RestaurantOptions restaurants={providers} />
          </SelectInput>
          <TextInput label="Plan" value={subscriptionForm.planName} onChange={(event) => updateSubscriptionForm("planName", event.target.value)} />
          <TextInput label="Price" type="number" value={subscriptionForm.price} onChange={(event) => updateSubscriptionForm("price", event.target.value)} />
          <SelectInput label="Status" value={subscriptionForm.status} onChange={(event) => updateSubscriptionForm("status", event.target.value)}>
            {TIFFIN_SUBSCRIPTION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {formatStatusLabel(item)}
              </option>
            ))}
          </SelectInput>
          <TextInput label="Start date" type="date" value={subscriptionForm.startDate} onChange={(event) => updateSubscriptionForm("startDate", event.target.value)} />
          <TextInput label="End date" type="date" value={subscriptionForm.endDate} onChange={(event) => updateSubscriptionForm("endDate", event.target.value)} />
          <TextInput label="Next delivery" type="date" value={subscriptionForm.nextDelivery} onChange={(event) => updateSubscriptionForm("nextDelivery", event.target.value)} />
          <TextInput label="Meal type" value={subscriptionForm.mealType} onChange={(event) => updateSubscriptionForm("mealType", event.target.value)} />
          <div className="flex items-end gap-2">
            <CheckboxField label="Veg" checked={subscriptionForm.isVeg} onChange={(value) => updateSubscriptionForm("isVeg", value)} />
            <Btn type="submit" variant="primary" disabled={savingSubscription}>
              {savingSubscription ? "Creating..." : "Create"}
            </Btn>
          </div>
        </form>
      </Panel>

      <div className="space-y-4">
        <Toolbar>
          <SearchInput value={subscriptionSearch} onChange={setSubscriptionSearch} placeholder="Search subscriptions..." />
          <select value={subscriptionStatus} onChange={(event) => setSubscriptionStatus(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="all">All subscriptions</option>
            {TIFFIN_SUBSCRIPTION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {formatStatusLabel(item)}
              </option>
            ))}
          </select>
        </Toolbar>
        <TableShell>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Customer", "Restaurant", "Plan", "Price", "Next delivery", "Status", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <EmptyRow colSpan={7} label="Loading..." />
              ) : subscriptions.length === 0 ? (
                <EmptyRow colSpan={7} label="No subscriptions found" />
              ) : (
                subscriptions.map((subscription) => (
                  <tr key={subscription._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{subscription.customer?.name || "N/A"}</p>
                      <p className="text-xs text-gray-400">{subscription.customer?.email || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{subscription.restaurant?.name || "N/A"}</td>
                    <td className="px-4 py-3 text-gray-500">{subscription.planName}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(subscription.price || 0)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{displayDate(subscription.nextDelivery)}</td>
                    <td className="px-4 py-3">
                      <Pill label={formatStatusLabel(subscription.status)} color={statusColor(subscription.status)} />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={subscription.status}
                        onChange={(event) => updateSubscriptionStatus(subscription, event.target.value)}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-200"
                      >
                        {TIFFIN_SUBSCRIPTION_STATUSES.map((item) => (
                          <option key={item} value={item}>
                            {formatStatusLabel(item)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableShell>
      </div>
    </div>
  );
};

const PayoutsTab = () => {
  const [payouts, setPayouts] = useState([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/admin/payouts${buildQuery({ status })}`)
      .then((response) => setPayouts(getData(response, [])))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (payout, nextStatus) => {
    try {
      await api.patch(`/admin/payouts/${payout._id}/status`, {
        status: nextStatus,
        note: notes[payout._id] || payout.note || "",
      });
      toast.success("Payout updated");
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <Toolbar>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="all">All payouts</option>
          {PAYOUT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {formatStatusLabel(item)}
            </option>
          ))}
        </select>
        <Btn onClick={load} small>
          Refresh
        </Btn>
        <span className="text-xs text-gray-400">{payouts.length} requests</span>
      </Toolbar>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {["Vendor", "Restaurant", "Amount", "Requested", "Status", "Note", "Actions"].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <EmptyRow colSpan={7} label="Loading..." />
            ) : payouts.length === 0 ? (
              <EmptyRow colSpan={7} label="No payout requests found" />
            ) : (
              payouts.map((payout) => (
                <tr key={payout._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{payout.vendor?.name || "N/A"}</p>
                    <p className="text-xs text-gray-400">{payout.vendor?.email || ""}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{payout.restaurant?.name || "N/A"}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(payout.amount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{displayDate(payout.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Pill label={formatStatusLabel(payout.status)} color={statusColor(payout.status)} />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={notes[payout._id] ?? payout.note ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [payout._id]: event.target.value }))}
                      className="w-48 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="Settlement note"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Btn onClick={() => updateStatus(payout, "APPROVED")} small>
                        Approve
                      </Btn>
                      <Btn onClick={() => updateStatus(payout, "PAID")} variant="success" small>
                        Mark paid
                      </Btn>
                      <Btn onClick={() => updateStatus(payout, "REJECTED")} variant="danger" small>
                        Reject
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
};

const SettingsTab = () => {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/admin/settings")
      .then((response) => setForm(getData(response, null)))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateReward = (field, value) =>
    setForm((current) => ({
      ...current,
      rewardRules: { ...(current.rewardRules || {}), [field]: value },
    }));

  const updateBanner = (index, field, value) =>
    setForm((current) => ({
      ...current,
      banners: (current.banners || []).map((banner, bannerIndex) =>
        bannerIndex === index ? { ...banner, [field]: value } : banner
      ),
    }));

  const addBanner = () =>
    setForm((current) => ({
      ...current,
      banners: [...(current.banners || []), { title: "", message: "", route: "/", active: true, priority: (current.banners || []).length }],
    }));

  const removeBanner = (index) =>
    setForm((current) => ({
      ...current,
      banners: (current.banners || []).filter((_, bannerIndex) => bannerIndex !== index),
    }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.put("/admin/settings", {
        commissionPercent: form.commissionPercent,
        platformFee: form.platformFee,
        gstPercent: form.gstPercent,
        deliveryBaseFee: form.deliveryBaseFee,
        freeDeliveryAbove: form.freeDeliveryAbove,
        minPayoutAmount: form.minPayoutAmount,
        payoutHoldHours: form.payoutHoldHours,
        maxScheduleDays: form.maxScheduleDays,
        referralBonusPoints: form.referralBonusPoints,
        loyaltyPointsPerRupee: form.loyaltyPointsPerRupee,
        allowScheduledOrders: form.allowScheduledOrders,
        maintenanceMode: form.maintenanceMode,
        customerSupportEnabled: form.customerSupportEnabled,
        rewardRules: form.rewardRules,
        banners: form.banners,
      });
      setForm(getData(response, form));
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("Reset business settings to defaults?")) return;
    setSaving(true);
    try {
      const response = await api.post("/admin/settings/reset", {});
      setForm(getData(response, null));
      toast.success("Settings reset");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="py-8 text-center text-sm text-gray-500">Loading settings...</p>;
  if (!form) return null;

  return (
    <form onSubmit={save} className="space-y-6">
      <Panel>
        <SectionTitle title="Pricing and settlement" />
        <div className="grid gap-3 md:grid-cols-4">
          <TextInput label="Commission percent" type="number" value={form.commissionPercent ?? ""} onChange={(event) => updateForm("commissionPercent", event.target.value)} />
          <TextInput label="Platform fee" type="number" value={form.platformFee ?? ""} onChange={(event) => updateForm("platformFee", event.target.value)} />
          <TextInput label="GST percent" type="number" value={form.gstPercent ?? ""} onChange={(event) => updateForm("gstPercent", event.target.value)} />
          <TextInput label="Delivery base fee" type="number" value={form.deliveryBaseFee ?? ""} onChange={(event) => updateForm("deliveryBaseFee", event.target.value)} />
          <TextInput label="Free delivery above" type="number" value={form.freeDeliveryAbove ?? ""} onChange={(event) => updateForm("freeDeliveryAbove", event.target.value)} />
          <TextInput label="Minimum payout" type="number" value={form.minPayoutAmount ?? ""} onChange={(event) => updateForm("minPayoutAmount", event.target.value)} />
          <TextInput label="Payout hold hours" type="number" value={form.payoutHoldHours ?? ""} onChange={(event) => updateForm("payoutHoldHours", event.target.value)} />
          <TextInput label="Max schedule days" type="number" value={form.maxScheduleDays ?? ""} onChange={(event) => updateForm("maxScheduleDays", event.target.value)} />
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Rewards" />
        <div className="grid gap-3 md:grid-cols-4">
          <TextInput label="Referral bonus points" type="number" value={form.referralBonusPoints ?? ""} onChange={(event) => updateForm("referralBonusPoints", event.target.value)} />
          <TextInput label="Points per rupee" type="number" step="0.01" value={form.loyaltyPointsPerRupee ?? ""} onChange={(event) => updateForm("loyaltyPointsPerRupee", event.target.value)} />
          <TextInput label="Daily login coins" type="number" value={form.rewardRules?.dailyLoginCoins ?? ""} onChange={(event) => updateReward("dailyLoginCoins", event.target.value)} />
          <TextInput label="Game daily limit" type="number" value={form.rewardRules?.gameClaimDailyLimit ?? ""} onChange={(event) => updateReward("gameClaimDailyLimit", event.target.value)} />
          <TextInput label="Order coin percent" type="number" value={form.rewardRules?.orderCoinPercent ?? ""} onChange={(event) => updateReward("orderCoinPercent", event.target.value)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <CheckboxField label="Scheduled orders" checked={form.allowScheduledOrders} onChange={(value) => updateForm("allowScheduledOrders", value)} />
          <CheckboxField label="Maintenance mode" checked={form.maintenanceMode} onChange={(value) => updateForm("maintenanceMode", value)} />
          <CheckboxField label="Customer support" checked={form.customerSupportEnabled} onChange={(value) => updateForm("customerSupportEnabled", value)} />
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Banners" action={<Btn onClick={addBanner} small>Add banner</Btn>} />
        <div className="space-y-3">
          {(form.banners || []).length === 0 ? (
            <p className="text-sm text-gray-400">No banners configured.</p>
          ) : (
            form.banners.map((banner, index) => (
              <div key={`${index}-${banner.title}`} className="rounded-lg border border-gray-100 p-3">
                <div className="grid gap-3 md:grid-cols-5">
                  <TextInput label="Title" value={banner.title || ""} onChange={(event) => updateBanner(index, "title", event.target.value)} />
                  <TextInput label="Message" className="md:col-span-2" value={banner.message || ""} onChange={(event) => updateBanner(index, "message", event.target.value)} />
                  <TextInput label="Route" value={banner.route || "/"} onChange={(event) => updateBanner(index, "route", event.target.value)} />
                  <TextInput label="Priority" type="number" value={banner.priority ?? index} onChange={(event) => updateBanner(index, "priority", event.target.value)} />
                </div>
                <div className="mt-3 flex gap-2">
                  <CheckboxField label="Active" checked={banner.active} onChange={(value) => updateBanner(index, "active", value)} />
                  <Btn onClick={() => removeBanner(index)} variant="danger" small>
                    Remove
                  </Btn>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>

      <div className="flex flex-wrap gap-2">
        <Btn type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </Btn>
        <Btn onClick={reset} variant="danger" disabled={saving}>
          Reset defaults
        </Btn>
      </div>
    </form>
  );
};

const TABS = [
  { id: "stats", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "restaurants", label: "Restaurants" },
  { id: "menu", label: "Menu" },
  { id: "orders", label: "Orders" },
  { id: "promos", label: "Promos" },
  { id: "tiffin", label: "Tiffin" },
  { id: "payouts", label: "Payouts" },
  { id: "settings", label: "Settings" },
  { id: "chats", label: "Chats" },
];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("stats");
  const activeLabel = useMemo(() => TABS.find((item) => item.id === tab)?.label || "Admin", [tab]);

  if (user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Access denied</p>
          <p className="mt-1 text-sm text-gray-500">Admin access only.</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
            <div className="shrink-0">
              <p className="text-sm font-bold text-gray-900">NearBites Admin</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
            <nav className="flex gap-1 overflow-x-auto pb-1 lg:ml-4 lg:flex-wrap lg:overflow-visible lg:pb-0">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    tab === item.id ? "bg-orange-50 text-orange-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{activeLabel}</span>
            <button onClick={handleLogout} className="text-sm text-gray-500 transition-colors hover:text-gray-900">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === "stats" ? <StatsTab onNavigate={setTab} /> : null}
        {tab === "users" ? <UsersTab /> : null}
        {tab === "restaurants" ? <RestaurantsTab /> : null}
        {tab === "menu" ? <MenuTab /> : null}
        {tab === "orders" ? <OrdersTab /> : null}
        {tab === "promos" ? <PromosTab /> : null}
        {tab === "tiffin" ? <TiffinTab /> : null}
        {tab === "payouts" ? <PayoutsTab /> : null}
        {tab === "settings" ? <SettingsTab /> : null}
        {tab === "chats" ? <AdminChat /> : null}
      </main>
    </div>
  );
};

export default AdminDashboard;
