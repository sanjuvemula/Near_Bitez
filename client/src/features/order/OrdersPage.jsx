import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import Button from "../../components/Button.jsx";
import Card from "../../components/Card.jsx";
import Loader from "../../components/Loader.jsx";
import { appRoutes, getCustomerOrderRoute } from "../../app/routes.jsx";
import { formatRelativeTime } from "../customer/customerShared.js";
import { api } from "../../services/api.js";
import { formatCurrency, formatDateTime } from "../../utils/formatters.js";

const LIVE_ORDER_STATUSES = ["PLACED", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "LIVE", label: "Live" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "REJECTED", label: "Rejected" },
];

const STATUS_STYLES = {
  PLACED: "bg-orange-100 text-orange-700",
  ACCEPTED: "bg-sky-100 text-sky-700",
  PREPARING: "bg-violet-100 text-violet-700",
  READY: "bg-emerald-100 text-emerald-700",
  OUT_FOR_DELIVERY: "bg-cyan-100 text-cyan-700",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
};

const TIER_STYLES = {
  BRONZE: "border-amber-200 bg-amber-50 text-amber-700",
  SILVER: "border-slate-200 bg-slate-50 text-slate-700",
  GOLD: "border-yellow-200 bg-yellow-50 text-yellow-700",
  PLATINUM: "border-cyan-200 bg-cyan-50 text-cyan-700",
};

const STEPS = ["PLACED", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];

const SearchIcon = ({ className = "h-5 w-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const getStatusLabel = (status) =>
  String(status || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getProgress = (status) => {
  const index = STEPS.indexOf(status);
  if (index < 0) return 0;
  return Math.round(((index + 1) / STEPS.length) * 100);
};

const StatusBadge = ({ status }) => (
  <span
    className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
      STATUS_STYLES[status] || "bg-stone-100 text-stone-700"
    }`}
  >
    {getStatusLabel(status)}
  </span>
);

const LoyaltyBanner = ({ loyalty }) => {
  if (!loyalty) return null;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-600">
            Loyalty
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
                TIER_STYLES[loyalty.tier] || TIER_STYLES.BRONZE
              }`}
            >
              {loyalty.tier || "BRONZE"}
            </span>
            <p className="text-2xl font-black text-stone-950">
              {(loyalty.points || 0).toLocaleString()} pts
            </p>
          </div>
          <p className="mt-1 text-sm font-semibold text-stone-500">
            Worth {formatCurrency(loyalty.discountValue || 0)}
          </p>
        </div>

        {loyalty.nextTier ? (
          <div className="min-w-[240px]">
            <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-stone-400">
              <span>Next tier</span>
              <span>{loyalty.tierProgress || 0}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-orange-600 transition-all"
                style={{ width: `${loyalty.tierProgress || 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-stone-500">
              {loyalty.pointsToNext || 0} pts to {String(loyalty.nextTier || "").toLowerCase()}
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
};

const OrderCard = ({ order, index, onReorder }) => {
  const isLive = LIVE_ORDER_STATUSES.includes(order.status);
  const isDelivered = order.status === "DELIVERED";
  const itemsLine = (order.items || [])
    .slice(0, 3)
    .map((item) => `${item.quantity}x ${item.name}`)
    .join(", ");

  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
    >
      <Card
        as={Link}
        to={getCustomerOrderRoute(order._id)}
        interactive
        className="block overflow-hidden no-underline"
      >
        <div className="grid gap-4 p-4 sm:grid-cols-[88px,1fr] sm:p-5">
          <div className="h-24 w-full overflow-hidden rounded-[20px] bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100 sm:h-24 sm:w-[88px]">
            {order.restaurant?.imageUrl ? (
              <img
                src={order.restaurant.imageUrl}
                alt={order.restaurant.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-black text-orange-300">
                {order.restaurant?.name?.slice(0, 1) || "R"}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-stone-400">
                  #{order._id.slice(-6)} - {formatRelativeTime(order.createdAt)}
                </p>
                <h3 className="mt-1 truncate text-xl font-black text-stone-950">
                  {order.restaurant?.name || "Restaurant"}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={order.status} />
                {isDelivered ? (
                  <button
                    type="button"
                    onClick={(event) => onReorder(event, order._id)}
                    className="rounded-full bg-orange-600 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-orange-700"
                  >
                    Reorder
                  </button>
                ) : null}
              </div>
            </div>

            <p className="mt-3 truncate text-sm font-semibold text-stone-500">
              {itemsLine}
              {order.items?.length > 3 ? ` +${order.items.length - 3} more` : ""}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-stone-500">
                <span>{formatDateTime(order.createdAt)}</span>
                {order.promoDiscount > 0 ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700">
                    Saved {formatCurrency(order.promoDiscount)}
                  </span>
                ) : null}
              </div>
              <p className="text-lg font-black text-stone-950">
                {formatCurrency(order.grandTotal)}
              </p>
            </div>

            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full ${
                    order.status === "REJECTED"
                      ? "bg-red-500"
                      : "bg-gradient-to-r from-orange-500 to-orange-600"
                  }`}
                  style={{ width: `${order.status === "REJECTED" ? 100 : getProgress(order.status)}%` }}
                />
              </div>
            </div>

            {isLive ? (
              <div className="mt-4 rounded-[16px] border border-orange-200 bg-orange-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-orange-700">
                Live order
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </Motion.div>
  );
};

const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loyalty, setLoyalty] = useState(null);
  const deferredSearch = useDeferredValue(search);

  const loadOrders = useCallback(async (silent = false) => {
    try {
      const response = await api.get("/orders");
      const data = Array.isArray(response.data) ? response.data : [];
      setOrders(data);
      setError("");
      return data;
    } catch (apiError) {
      if (!silent) {
        setError(apiError.message || "Could not load orders");
      }
      return [];
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    api
      .get("/orders/loyalty")
      .then((response) => setLoyalty(response.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let intervalId = null;

    const run = async () => {
      const data = await loadOrders();
      const hasLive = data.some((order) => LIVE_ORDER_STATUSES.includes(order.status));
      clearInterval(intervalId);
      if (hasLive) {
        intervalId = setInterval(() => {
          loadOrders(true);
        }, 5000);
      }
    };

    run();
    return () => clearInterval(intervalId);
  }, [loadOrders]);

  const stats = useMemo(
    () => ({
      total: orders.length,
      live: orders.filter((order) => LIVE_ORDER_STATUSES.includes(order.status)).length,
      delivered: orders.filter((order) => order.status === "DELIVERED").length,
      totalSpend: orders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0),
    }),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesFilter =
        filter === "ALL"
          ? true
          : filter === "LIVE"
          ? LIVE_ORDER_STATUSES.includes(order.status)
          : order.status === filter;

      const matchesSearch =
        !query ||
        [order._id, order.restaurant?.name, order.deliveryAddress]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [deferredSearch, filter, orders]);

  const handleReorder = async (event, orderId) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      const response = await api.post(`/orders/${orderId}/reorder`);
      toast.success(response.message || "Items added to cart");
      navigate(appRoutes.customerCart);
    } catch (apiError) {
      toast.error(apiError.message || "Could not reorder");
    }
  };

  if (loading) {
    return <Loader label="Loading your orders..." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <Motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[28px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.18),transparent_30%),linear-gradient(145deg,rgba(255,247,237,0.96),rgba(255,255,255,0.98))] p-5 shadow-[0_34px_90px_-60px_rgba(15,23,42,0.42)] sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">
              Orders
            </p>
            <h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">
              Your orders
            </h1>
          </div>

          <div className="grid min-w-[260px] gap-3 sm:grid-cols-3">
            {[
              { label: "Total", value: stats.total },
              { label: "Live", value: stats.live },
              { label: "Spent", value: formatCurrency(stats.totalSpend) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[22px] border border-white/90 bg-white/90 px-4 py-4"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">
                  {stat.label}
                </p>
                <p className="mt-2 text-lg font-black text-stone-950">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Motion.section>

      <LoyaltyBanner loyalty={loyalty} />

      {error ? (
        <div className="rounded-[20px] border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </div>
      ) : null}

      {orders.length === 0 ? (
        <Card className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-orange-50 text-3xl font-black text-orange-600">
            Cart
          </div>
          <h2 className="mt-6 text-3xl font-black text-stone-950">No orders yet</h2>
          <Button className="mt-6" size="lg" onClick={() => navigate(appRoutes.customerHome)}>
            Browse restaurants
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr,auto]">
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search orders"
                  className="h-12 w-full rounded-[18px] border border-[#ece4d7] bg-[#fcfbf8] pl-11 pr-4 text-sm font-semibold text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={`rounded-full px-4 py-2 text-sm font-black transition ${
                      filter === item.id
                        ? "bg-orange-600 text-white shadow-[0_14px_24px_-18px_rgba(234,88,12,0.9)]"
                        : "border border-[#ece4d7] bg-white text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {item.label}
                    {item.id === "LIVE" && stats.live > 0 ? ` ${stats.live}` : ""}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {filteredOrders.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-xl font-black text-stone-950">No matching orders</p>
              <div className="mt-5">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setFilter("ALL");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order, index) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  index={index}
                  onReorder={handleReorder}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrdersPage;
