import { useCallback, useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Card from "../../components/Card.jsx";
import Loader from "../../components/Loader.jsx";
import {
  appRoutes,
  getCustomerGameRoute,
  getCustomerRestaurantRoute,
} from "../../app/routes.jsx";
import {
  CustomerStatusBadge,
  OrderProgressStrip,
} from "../customer/components/CustomerUi.jsx";
import {
  CUSTOMER_ORDER_STEPS,
  STATUS_COPY,
  formatRelativeTime,
} from "../customer/customerShared.js";
import { useUserLocation } from "../../hooks/useUserLocation.js";
import { api } from "../../services/api.js";
import {
  formatCurrency,
  formatDateTime,
  formatStatusLabel,
} from "../../utils/formatters.js";
import { DEFAULT_GAME_KEY, getGameSlug, getGameTheme } from "../games/gameCatalog.js";
import GameZoneInviteModal from "../games/GameZoneInviteModal.jsx";
import ReviewForm from "./ReviewForm.jsx";

const STATUS_THEME = {
  PLACED: {
    panel: "from-orange-50 via-amber-50 to-white",
    border: "border-orange-200",
    accent: "text-orange-700",
    chip: "bg-orange-100 text-orange-700",
  },
  ACCEPTED: {
    panel: "from-sky-50 via-white to-white",
    border: "border-sky-200",
    accent: "text-sky-700",
    chip: "bg-sky-100 text-sky-700",
  },
  PREPARING: {
    panel: "from-violet-50 via-white to-white",
    border: "border-violet-200",
    accent: "text-violet-700",
    chip: "bg-violet-100 text-violet-700",
  },
  READY: {
    panel: "from-emerald-50 via-white to-white",
    border: "border-emerald-200",
    accent: "text-emerald-700",
    chip: "bg-emerald-100 text-emerald-700",
  },
  OUT_FOR_DELIVERY: {
    panel: "from-cyan-50 via-white to-white",
    border: "border-cyan-200",
    accent: "text-cyan-700",
    chip: "bg-cyan-100 text-cyan-700",
  },
  DELIVERED: {
    panel: "from-emerald-50 via-white to-white",
    border: "border-emerald-200",
    accent: "text-emerald-700",
    chip: "bg-emerald-100 text-emerald-700",
  },
  REJECTED: {
    panel: "from-red-50 via-white to-white",
    border: "border-red-200",
    accent: "text-red-700",
    chip: "bg-red-100 text-red-700",
  },
};

const LIVE_STATUSES = ["PLACED", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];
const GAME_STATUSES = ["PLACED", "ACCEPTED", "PREPARING", "READY"];
const WAIT_FEATURED_GAME_KEYS = [
  "food-quiz-battle",
  "delivery-race",
  "hand-cricket",
  "snakes-sprint",
  "bite-catcher",
  "food-memory",
  "tray-shuffle",
];

const WaitAndPlayPanel = ({ orderId }) => {
  const { location, status: locationStatus, requestLocation } = useUserLocation();
  const [gamesData, setGamesData] = useState({ games: [], rewards: [] });
  const [activeGameKey, setActiveGameKey] = useState("");
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [error, setError] = useState("");

  const areaLabel = location?.city || "Nearby";

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ area: areaLabel });
      const response = await api.get(`/games/feed?${query.toString()}`);
      const nextData = response.data || { games: [], rewards: [] };
      setGamesData(nextData);
      setActiveGameKey((current) => current || nextData.games?.[0]?.key || "");
      setError("");
    } catch (apiError) {
      setError(apiError.message || "Could not load games right now.");
    } finally {
      setLoading(false);
    }
  }, [areaLabel]);

  const loadLeaderboard = useCallback(async () => {
    if (!activeGameKey) return;
    setLeaderboardLoading(true);
    try {
      const query = new URLSearchParams({ gameKey: activeGameKey, area: areaLabel });
      const response = await api.get(`/games/leaderboard?${query.toString()}`);
      setLeaderboard(response.data || null);
    } catch {
      setLeaderboard(null);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [activeGameKey, areaLabel]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const games = gamesData.games || [];
  const activeRewards = useMemo(
    () =>
      (gamesData.rewards || []).filter(
        (reward) => reward.gameKey === "any" || reward.gameKey === activeGameKey
      ),
    [activeGameKey, gamesData.rewards]
  );
  const activeTheme = getGameTheme(activeGameKey || games[0]?.key || DEFAULT_GAME_KEY);
  const orderedGames = useMemo(() => {
    const featured = WAIT_FEATURED_GAME_KEYS.map((key) =>
      games.find((game) => game.key === key)
    ).filter(Boolean);
    const extras = games.filter(
      (game) => !featured.some((entry) => entry.key === game.key)
    );
    return [...featured, ...extras];
  }, [games]);

  return (
    <Card className="overflow-hidden border-0 p-0">
      <div
        className={`bg-gradient-to-br ${activeTheme.panel} px-5 py-5 text-white sm:px-6 sm:py-6`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/70">
              Play while you wait
            </p>
            <h2 className="mt-2 text-2xl font-black">Food is coming. Arcade is open.</h2>
          </div>

          <div className="rounded-[20px] border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/65">
              Area
            </p>
            <p className="mt-1 text-sm font-black text-white">{areaLabel}</p>
            {locationStatus === "granted" ? null : (
              <button
                type="button"
                onClick={requestLocation}
                className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-white"
              >
                Use location
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr),320px] sm:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-28 rounded-[22px] bg-stone-100" />
            <div className="h-28 rounded-[22px] bg-stone-100" />
            <div className="h-28 rounded-[22px] bg-stone-100" />
            <div className="h-28 rounded-[22px] bg-stone-100" />
          </div>
          <div className="h-72 rounded-[22px] bg-stone-100" />
        </div>
      ) : error ? (
        <div className="p-5 sm:p-6">
          <div className="rounded-[20px] border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr),320px] sm:p-6">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {orderedGames.slice(0, 7).map((game) => {
                const active = activeGameKey === game.key;
                const theme = getGameTheme(game.key);

                return (
                  <button
                    key={game.key}
                    type="button"
                    onClick={() => setActiveGameKey(game.key)}
                    className={[
                      "w-full rounded-[22px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_-42px_rgba(15,23,42,0.55)]",
                      active ? `${theme.softCard} shadow-[0_24px_50px_-36px_rgba(15,23,42,0.35)]` : "border-[#eee7dc] bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${theme.chip}`}>
                          {theme.mark}
                        </span>
                        <h3 className="mt-3 text-base font-black text-stone-950">{game.title}</h3>
                        <p className="mt-2 text-xs font-bold text-stone-500">
                          {theme.homeHint || game.scoreLabel || "Score"}
                        </p>
                      </div>
                      <Link
                        to={`${getCustomerGameRoute(getGameSlug(game.key))}?orderId=${orderId}`}
                        className="rounded-full bg-orange-600 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white no-underline transition hover:bg-orange-700"
                      >
                        Play
                      </Link>
                    </div>
                  </button>
                );
              })}
            </div>

            <Link
              to={`${getCustomerGameRoute(getGameSlug(activeGameKey || games[0]?.key || DEFAULT_GAME_KEY))}?orderId=${orderId}`}
              className="inline-flex rounded-[18px] bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-3 text-sm font-black text-white no-underline shadow-[0_18px_34px_-24px_rgba(244,63,94,0.75)] transition hover:brightness-105"
            >
              Open selected game
            </Link>
          </div>

          <div className={`rounded-[24px] border p-4 ${activeTheme.softCard}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-stone-500">
                  Live board
                </p>
                <h3 className="mt-1 text-xl font-black text-stone-950">
                  {games.find((game) => game.key === activeGameKey)?.title || "Leaderboard"}
                </h3>
              </div>
              <button
                type="button"
                onClick={loadLeaderboard}
                className={`rounded-full px-3 py-1 text-xs font-black ${activeTheme.chip}`}
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {leaderboardLoading ? (
                <>
                  <div className="h-14 rounded-[18px] bg-white" />
                  <div className="h-14 rounded-[18px] bg-white" />
                  <div className="h-14 rounded-[18px] bg-white" />
                </>
              ) : leaderboard?.leaderboard?.length ? (
                leaderboard.leaderboard.slice(0, 3).map((entry) => (
                  <div
                    key={entry._id}
                    className={`flex items-center gap-3 rounded-[18px] border px-3 py-3 ${
                      entry.isCurrentUser ? "border-white bg-white" : "border-white/80 bg-white/80"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-orange-500 to-rose-500 text-sm font-black text-white">
                      {entry.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-stone-950">{entry.name}</p>
                      <p className="text-xs font-bold text-stone-400">
                        {entry.plays} play{entry.plays === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="text-lg font-black text-stone-950">{entry.bestScore}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-white bg-white/80 p-4 text-sm font-bold text-stone-500">
                  No scores in this area yet.
                </div>
              )}
            </div>

            <div className="mt-4 rounded-[18px] border border-white/80 bg-white/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">
                Reward snapshot
              </p>
              {activeRewards.length ? (
                activeRewards.slice(0, 2).map((reward) => (
                  <div key={reward._id} className="mt-3">
                    <p className="text-sm font-black text-stone-950">
                      {reward.discountType === "PERCENTAGE"
                        ? `${reward.value}% off`
                        : `${formatCurrency(reward.value)} off`}
                    </p>
                    <p className="text-xs font-bold text-stone-500">
                      {reward.gameRewardTier === "TOP"
                        ? `Hold #1 for ${reward.gameHoldMinutes || 1} min`
                        : `Score ${reward.gameMinScore || 0}+`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="mt-2 text-sm font-semibold text-stone-500">
                  No live reward right now.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

const OrderTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteDismissed, setInviteDismissed] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data);
      setError("");
    } catch (apiError) {
      setError(apiError.message || "Could not load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    setInviteOpen(false);
    setInviteDismissed(false);
  }, [id]);

  useEffect(() => {
    if (!order || !LIVE_STATUSES.includes(order.status)) return undefined;
    const intervalId = setInterval(loadOrder, 5000);
    return () => clearInterval(intervalId);
  }, [loadOrder, order]);

  const theme = STATUS_THEME[order?.status] || STATUS_THEME.PLACED;
  const currentStepIndex = useMemo(
    () => CUSTOMER_ORDER_STEPS.indexOf(order?.status),
    [order?.status]
  );
  const totalItems = useMemo(
    () =>
      (order?.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      ),
    [order?.items]
  );
  const showGamePanel = order && GAME_STATUSES.includes(order.status);
  const isLive = order && LIVE_STATUSES.includes(order.status);
  const timelineMap = useMemo(
    () => new Map((order?.statusTimeline || []).map((entry) => [entry.status, entry.changedAt])),
    [order?.statusTimeline]
  );

  useEffect(() => {
    if (!showGamePanel || inviteDismissed) return undefined;
    const timerId = window.setTimeout(() => setInviteOpen(true), 3000);
    return () => window.clearTimeout(timerId);
  }, [inviteDismissed, showGamePanel]);

  const handleTrackInstead = () => {
    setInviteOpen(false);
    setInviteDismissed(true);
  };

  const handleEnterGameZone = () => {
    setInviteOpen(false);
    setInviteDismissed(true);
    navigate(`${appRoutes.customerGames}?orderId=${encodeURIComponent(order._id)}`);
  };

  const handleOutForDelivery = () => {
    setInviteOpen(false);
    setInviteDismissed(true);
    loadOrder();
  };

  if (loading) {
    return <Loader label="Loading your order..." />;
  }

  if (error || !order) {
    return (
      <div className="rounded-[22px] border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-600">
        {error || "Order not found"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <Link
        to={appRoutes.customerOrders}
        className="inline-flex items-center gap-2 rounded-full border border-[#ece4d7] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-stone-600 no-underline transition hover:border-orange-200 hover:bg-orange-50"
      >
        All orders
      </Link>

      <Motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`overflow-hidden rounded-[28px] border bg-gradient-to-br ${theme.panel} ${theme.border} p-5 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.4)] sm:p-7`}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr,320px] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">
              Order #{order._id.slice(-6)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className={`text-3xl font-black sm:text-4xl ${theme.accent}`}>
                {formatStatusLabel(order.status)}
              </h1>
              <CustomerStatusBadge status={order.status} />
            </div>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-stone-600">
              {STATUS_COPY?.[order.status] || "Your order is being updated."}
            </p>
            {isLive ? (
              <div className="mt-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-stone-600">
                Updated {formatRelativeTime(order.updatedAt)}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: "Items", value: totalItems },
              { label: "Total", value: formatCurrency(order.grandTotal) },
              { label: "Placed", value: formatDateTime(order.createdAt) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[22px] border border-white/80 bg-white/80 px-4 py-4"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">
                  {stat.label}
                </p>
                <p className="mt-2 text-base font-black text-stone-950">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <OrderProgressStrip status={order.status} />
        </div>
      </Motion.section>

      <GameZoneInviteModal
        open={inviteOpen}
        order={order}
        onEnter={handleEnterGameZone}
        onTrack={handleTrackInstead}
        onOutForDelivery={handleOutForDelivery}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),360px]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">
                Live timeline
              </p>
              <h2 className="mt-2 text-2xl font-black text-stone-950">Order progress</h2>
            </div>
            {isLive ? (
              <span className={`rounded-full px-3 py-2 text-xs font-black ${theme.chip}`}>
                Live
              </span>
            ) : null}
          </div>

          <div className="mt-5 space-y-4">
            {CUSTOMER_ORDER_STEPS.map((step, index) => {
              const reached = currentStepIndex >= index;
              const current = currentStepIndex === index;

              return (
                <div
                  key={step}
                  className={`rounded-[20px] border px-4 py-4 ${
                    current
                      ? "border-orange-200 bg-orange-50"
                      : reached
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-[#eee7dc] bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-stone-950">
                        {formatStatusLabel(step)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        {STATUS_COPY?.[step]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-stone-400">
                        {current ? "Current" : reached ? "Done" : "Pending"}
                      </p>
                      {timelineMap.get(step) ? (
                        <p className="mt-1 text-xs font-bold text-stone-500">
                          {formatDateTime(timelineMap.get(step))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            {order.status === "REJECTED" ? (
              <div className="rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
                This order was not accepted.
              </div>
            ) : null}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="h-44 overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100">
              {order.restaurant?.imageUrl ? (
                <img
                  src={order.restaurant.imageUrl}
                  alt={order.restaurant.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-black text-orange-600">
                  {order.restaurant?.name?.slice(0, 1) || "R"}
                </div>
              )}
            </div>
            <div className="p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-600">
                Restaurant
              </p>
              <h2 className="mt-2 text-2xl font-black text-stone-950">
                {order.restaurant?.name || "Restaurant"}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-stone-500">
                {order.restaurant?.address || ""}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[18px] bg-[#fcfbf8] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">
                    ETA
                  </p>
                  <p className="mt-1 text-base font-black text-stone-950">
                    {order.restaurant?.deliveryTime || 30} min
                  </p>
                </div>
                <div className="rounded-[18px] bg-[#fcfbf8] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">
                    Rating
                  </p>
                  <p className="mt-1 text-base font-black text-stone-950">
                    {Number(order.restaurant?.rating || 0).toFixed(1)}
                  </p>
                </div>
              </div>

              {order.restaurant?._id ? (
                <Link
                  to={getCustomerRestaurantRoute(order.restaurant._id)}
                  className="mt-4 inline-flex rounded-[18px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-black text-orange-700 no-underline transition hover:bg-orange-100"
                >
                  View menu
                </Link>
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-600">
              Bill summary
            </p>
            <div className="mt-5 space-y-3 text-sm font-semibold">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Items ({totalItems})</span>
                <span className="font-black text-stone-950">
                  {formatCurrency(order.itemTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Delivery fee</span>
                <span className="font-black text-stone-950">
                  {formatCurrency(order.deliveryFee)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Platform fee</span>
                <span className="font-black text-stone-950">
                  {formatCurrency(order.platformFee)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">GST</span>
                <span className="font-black text-stone-950">
                  {formatCurrency(order.gst)}
                </span>
              </div>
              {order.promoDiscount > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Promo ({order.promoCode})</span>
                  <span className="font-black text-emerald-600">
                    -{formatCurrency(order.promoDiscount)}
                  </span>
                </div>
              ) : null}
              {order.loyaltyDiscount > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Loyalty</span>
                  <span className="font-black text-emerald-600">
                    -{formatCurrency(order.loyaltyDiscount)}
                  </span>
                </div>
              ) : null}
              <div className="border-t border-[#efe8dc] pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-stone-950">Total</span>
                  <span className="text-base font-black text-orange-600">
                    {formatCurrency(order.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] border border-[#eee7dc] bg-[#fcfbf8] p-4 text-sm font-semibold text-stone-600">
              <div className="flex items-start justify-between gap-4">
                <span>Payment</span>
                <span className="text-right font-black text-stone-950">
                  {order.paymentMethod}
                </span>
              </div>
              <div className="mt-3 flex items-start justify-between gap-4">
                <span>Delivery address</span>
                <span className="max-w-[190px] text-right font-black text-stone-950">
                  {order.deliveryAddress}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-600">
              Order items
            </p>
            <div className="mt-4 space-y-3">
              {(order.items || []).map((item) => (
                <div
                  key={item.menuItem || item.name}
                  className="flex items-center justify-between gap-4 rounded-[18px] border border-[#f1ece4] bg-[#fcfbf8] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-black text-stone-950">{item.name}</p>
                    <p className="mt-1 text-xs font-bold text-stone-400">
                      {item.quantity} x {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="text-sm font-black text-stone-950">
                    {formatCurrency(item.quantity * item.price)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {order.status === "DELIVERED" ? (
        <ReviewForm
          orderId={order._id}
          restaurantName={order.restaurant?.name || "Restaurant"}
        />
      ) : null}
    </div>
  );
};

export default OrderTracking;
