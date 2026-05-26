import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../services/api.js";
import { formatCurrency, formatDateTime } from "../../utils/formatters.js";
import AdminChat from "./AdminChat.jsx";

const ORDER_STATUSES = ["PLACED","ACCEPTED","PREPARING","READY","OUT_FOR_DELIVERY","DELIVERED","REJECTED"];

const statusColor = (s) => ({
  PLACED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-amber-100 text-amber-700",
  PREPARING: "bg-orange-100 text-orange-700",
  READY: "bg-emerald-100 text-emerald-700",
  OUT_FOR_DELIVERY: "bg-sky-100 text-sky-700",
  DELIVERED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
}[s] || "bg-gray-100 text-gray-700");

const roleColor = (r) => ({
  admin: "bg-purple-100 text-purple-700",
  vendor: "bg-orange-100 text-orange-700",
  customer: "bg-blue-100 text-blue-700",
}[r] || "bg-gray-100 text-gray-700");

const Pill = ({ label, color }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{label}</span>
);

const Btn = ({ onClick, children, variant = "default", disabled, small }) => {
  const base = "rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const size = small ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm";
  const styles = {
    default: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
    primary: "bg-orange-600 text-white hover:bg-orange-700",
    success: "bg-green-50 text-green-700 hover:bg-green-100 border border-green-100",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${size} ${styles[variant]}`}>
      {children}
    </button>
  );
};

const SearchInput = ({ value, onChange, placeholder }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-orange-200"
  />
);

const StatCard = ({ label, value, sub }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
  </div>
);

const StatsTab = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/stats")
      .then((r) => setStats(r.data))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-500 py-8 text-center">Loading stats...</p>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.users.total} sub={`+${stats.users.newThisWeek} this week`} />
        <StatCard label="Customers" value={stats.users.customers} />
        <StatCard label="Vendors" value={stats.users.vendors} />
        <StatCard label="New This Week" value={stats.users.newThisWeek} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Restaurants" value={stats.restaurants.total} sub={`${stats.restaurants.active} active`} />
        <StatCard label="Active" value={stats.restaurants.active} />
        <StatCard label="Paused" value={stats.restaurants.paused} />
        <StatCard label="Total Orders" value={stats.orders.total} sub={`+${stats.orders.newThisWeek} this week`} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Delivered" value={stats.orders.delivered} />
        <StatCard label="Pending" value={stats.orders.pending} />
        <StatCard label="Revenue" value={formatCurrency(stats.revenue.total)} sub="from delivered orders" />
        <StatCard label="Orders This Week" value={stats.orders.newThisWeek} />
      </div>
    </div>
  );
};

const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/users?role=${roleFilter}&search=${search}`)
      .then((r) => setUsers(r.data))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [roleFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"?`)) return;
    try { await api.delete(`/admin/users/${id}`); toast.success("User deleted"); load(); }
    catch (e) { toast.error(e.message); }
  };

  const handleRoleChange = async (id, role) => {
    try { await api.patch(`/admin/users/${id}/role`, { role }); toast.success("Role updated"); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or email..." />
        <div className="flex gap-1">
          {["all","customer","vendor","admin"].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${roleFilter === r ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {r}
            </button>
          ))}
        </div>
        <Btn onClick={load} small>Refresh</Btn>
        <span className="text-xs text-gray-400">{users.length} users</span>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{["Name","Email","Role","Phone","Joined","Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">Loading...</td></tr>
              : users.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No users found</td></tr>
              : users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><Pill label={u.role} color={roleColor(u.role)} /></td>
                  <td className="px-4 py-3 text-gray-500">{u.phone || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {u.role !== "admin" && (
                        <select value={u.role} onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-200">
                          <option value="customer">customer</option>
                          <option value="vendor">vendor</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                      <Btn onClick={() => handleDelete(u._id, u.name)} variant="danger" small>Delete</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const RestaurantsTab = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/restaurants?search=${search}&status=${statusFilter}`)
      .then((r) => setRestaurants(r.data))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id, name, current) => {
    try { await api.patch(`/admin/restaurants/${id}/toggle`, {}); toast.success(`${name} is now ${current ? "paused" : "live"}`); load(); }
    catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete restaurant "${name}"?`)) return;
    try { await api.delete(`/admin/restaurants/${id}`); toast.success("Restaurant deleted"); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search restaurant..." />
        <div className="flex gap-1">
          {["all","active","paused"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${statusFilter === s ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s}
            </button>
          ))}
        </div>
        <Btn onClick={load} small>Refresh</Btn>
        <span className="text-xs text-gray-400">{restaurants.length} restaurants</span>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{["Restaurant","Vendor","Category","Orders","Revenue","Status","Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">Loading...</td></tr>
              : restaurants.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">No restaurants found</td></tr>
              : restaurants.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[180px]">{r.address}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700 font-medium">{r.vendor?.name || "—"}</p>
                    <p className="text-xs text-gray-400">{r.vendor?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.category}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{r.orderCount}</td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(r.totalRevenue)}</td>
                  <td className="px-4 py-3">
                    <Pill label={r.isActive ? "Live" : "Paused"} color={r.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Btn onClick={() => handleToggle(r._id, r.name, r.isActive)} variant={r.isActive ? "default" : "success"} small>
                        {r.isActive ? "Pause" : "Go Live"}
                      </Btn>
                      <Btn onClick={() => handleDelete(r._id, r.name)} variant="danger" small>Delete</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/orders?status=${statusFilter}&search=${search}`)
      .then((r) => setOrders(r.data))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id, status) => {
    try { await api.patch(`/admin/orders/${id}/status`, { status }); toast.success("Order status updated"); load(); }
    catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this order?")) return;
    try { await api.delete(`/admin/orders/${id}`); toast.success("Order deleted"); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search customer, restaurant..." />
        <div className="flex flex-wrap gap-1">
          {["all", ...ORDER_STATUSES].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors capitalize ${statusFilter === s ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s.toLowerCase()}
            </button>
          ))}
        </div>
        <Btn onClick={load} small>Refresh</Btn>
        <span className="text-xs text-gray-400">{orders.length} orders</span>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{["Order ID","Customer","Restaurant","Total","Status","Time","Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">Loading...</td></tr>
              : orders.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">No orders found</td></tr>
              : orders.map((o) => (
                <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o._id.slice(-6)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{o.customer?.name || "—"}</p>
                    <p className="text-xs text-gray-400">{o.customer?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{o.restaurant?.name || "—"}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(o.grandTotal)}</td>
                  <td className="px-4 py-3"><Pill label={o.status} color={statusColor(o.status)} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDateTime(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      <select value={o.status} onChange={(e) => handleStatusChange(o._id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-200">
                        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <Btn onClick={() => handleDelete(o._id)} variant="danger" small>Del</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TABS = [
  { id: "stats", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "restaurants", label: "Restaurants" },
  { id: "orders", label: "Orders" },
  { id: "chats", label: "Chats" },
];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("stats");

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Access denied</p>
          <p className="text-sm text-gray-500 mt-1">Admin access only.</p>
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-bold text-gray-900 text-sm">NearBites Admin</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
            <nav className="flex gap-1 ml-4">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-orange-50 text-orange-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === "stats" && <StatsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "restaurants" && <RestaurantsTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "chats" && <AdminChat />}
      </main>
    </div>
  );
};

export default AdminDashboard;