import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Card from "../../components/Card.jsx";
import SectionWrapper from "../../components/SectionWrapper.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import {
  appRoutes,
  getCustomerRestaurantRoute,
} from "../../app/routes.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useUserLocation } from "../../hooks/useUserLocation.js";
import { api } from "../../services/api.js";
import { formatCurrency } from "../../utils/formatters.js";
import { useRestaurantDiscovery } from "./useRestaurantDiscovery.js";

const CATEGORY_ICONS = {
  all: "🍽",
  pizza: "🍕",
  burger: "🍔",
  biryani: "🍛",
  healthy: "🥗",
  chinese: "🥢",
  "south indian": "🥘",
  desserts: "🍰",
  thali: "🍱",
  snacks: "🥟",
  drinks: "🥤",
};

const COMMON_CATEGORIES = [
  "Pizza",
  "Burger",
  "Biryani",
  "Healthy",
  "Chinese",
  "South Indian",
  "Desserts",
  "Thali",
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" },
};

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

const PinIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const ClockIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const ArrowIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const StarIcon = ({ className = "h-3.5 w-3.5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="m12 2.6 2.9 5.88 6.49.95-4.7 4.58 1.11 6.47L12 17.38l-5.8 3.05 1.1-6.47-4.69-4.58 6.49-.95L12 2.6Z" />
  </svg>
);

const CoinIcon = ({ className = "h-5 w-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <ellipse cx="12" cy="6" rx="7" ry="3" />
    <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
    <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
  </svg>
);

const shuffle = (items) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getCategoryIcon = (name) => {
  const key = String(name || "").trim().toLowerCase();
  return CATEGORY_ICONS[key] || "🍴";
};

const getCuisineLine = (restaurant) =>
  (restaurant.cuisineType || []).slice(0, 3).join(", ") ||
  restaurant.category ||
  "Restaurant";

const getDistanceLabel = (restaurant) =>
  restaurant.distanceKm ? `${Number(restaurant.distanceKm).toFixed(1)} km` : "Nearby";

const buildCategoryOptions = (feed) => {
  const realCategories = (feed.categories || []).map((category) => category.name);
  const merged = ["All", ...COMMON_CATEGORIES, ...realCategories]
    .filter(Boolean)
    .map((item) => String(item).trim())
    .filter(Boolean);

  const seen = new Set();
  return merged
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 11)
    .map((label) => {
      const real = (feed.categories || []).find(
        (category) => category.name?.toLowerCase() === label.toLowerCase()
      );
      return {
        label,
        count: real?.restaurantCount || 0,
      };
    });
};

const SectionSkeleton = ({ cards = 3 }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: cards }).map((_, index) => (
      <Card key={index} className="overflow-hidden">
        <Skeleton className="h-40 rounded-none" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </Card>
    ))}
  </div>
);

const EmptyPanel = ({ title, description, action }) => (
  <Card className="flex min-h-52 flex-col items-center justify-center px-6 py-12 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-orange-50 text-orange-600">
      <SearchIcon />
    </div>
    <h3 className="text-lg font-black text-stone-950">{title}</h3>
    {description ? (
      <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-stone-500">
        {description}
      </p>
    ) : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </Card>
);

const RatingBadge = ({ rating }) => {
  const value = Number(rating || 0);
  const tone =
    value >= 4.4
      ? "bg-emerald-600"
      : value >= 4
      ? "bg-orange-500"
      : "bg-stone-500";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black text-white ${tone}`}
    >
      <StarIcon className="h-3 w-3" />
      {value.toFixed(1)}
    </span>
  );
};

const RestaurantTile = ({ restaurant, index = 0 }) => (
  <Motion.div
    {...fadeUp}
    transition={{ ...fadeUp.transition, delay: index * 0.04 }}
  >
    <Card
      as={Link}
      to={getCustomerRestaurantRoute(restaurant._id)}
      interactive
      className="group block overflow-hidden no-underline"
    >
      <div className="relative h-44 overflow-hidden bg-orange-50">
        {restaurant.imageUrl ? (
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl font-black text-orange-200">
            {restaurant.name?.charAt(0) || "N"}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4">
          <h3 className="truncate text-lg font-black text-white">
            {restaurant.name}
          </h3>
        </div>
        {restaurant.category ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-black uppercase text-stone-800 shadow-sm">
            {restaurant.category}
          </span>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <p className="truncate text-sm font-semibold text-stone-500">
          {getCuisineLine(restaurant)}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-stone-600">
          <RatingBadge rating={restaurant.rating} />
          <span className="inline-flex items-center gap-1">
            <ClockIcon />
            {restaurant.deliveryTime || 30} min
          </span>
          <span className="inline-flex items-center gap-1">
            <PinIcon />
            {getDistanceLabel(restaurant)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-stone-100 pt-3">
          <span className="text-sm font-bold text-stone-500">
            {restaurant.minimumItemPrice > 0
              ? `Starts ${formatCurrency(restaurant.minimumItemPrice)}`
              : restaurant.priceBand || "Open now"}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-black text-orange-600">
            Order <ArrowIcon className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Card>
  </Motion.div>
);

const DishTile = ({ dish, index = 0 }) => {
  const restaurant = dish.restaurant;
  if (!restaurant?._id) return null;

  return (
    <Motion.div
      {...fadeUp}
      transition={{ ...fadeUp.transition, delay: index * 0.04 }}
    >
      <Card
        as={Link}
        to={getCustomerRestaurantRoute(restaurant._id)}
        interactive
        className="flex min-w-[260px] gap-3 overflow-hidden p-3 no-underline sm:min-w-0"
      >
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-orange-50">
          {dish.imageUrl ? (
            <img
              src={dish.imageUrl}
              alt={dish.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-black text-orange-300">
              {dish.name?.charAt(0) || "D"}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-stone-950">
            {dish.name}
          </p>
          <p className="mt-1 truncate text-xs font-bold text-stone-500">
            {restaurant.name}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm font-black text-orange-600">
              {formatCurrency(dish.price)}
            </span>
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black text-orange-700">
              {dish.orderCount > 0 ? `${dish.orderCount} ordered` : "Popular"}
            </span>
          </div>
        </div>
      </Card>
    </Motion.div>
  );
};

const QuickActionCard = ({
  title,
  subtitle,
  icon,
  highlight = false,
  badge,
  onClick,
}) => (
  <Motion.button
    type="button"
    whileHover={{ y: -4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={[
      "relative overflow-hidden rounded-[20px] border p-4 text-left transition duration-200",
      highlight
        ? "min-h-[168px] border-orange-200 bg-gradient-to-br from-[#2b1207] via-[#451806] to-[#ea580c] text-white shadow-[0_26px_70px_-38px_rgba(234,88,12,0.8)] sm:col-span-2 lg:col-span-1"
        : "min-h-[132px] border-[#eee7dc] bg-white text-stone-950 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.45)] hover:border-orange-200",
    ].join(" ")}
  >
    <span
      className={[
        "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black",
        highlight ? "bg-white/15 text-white" : "bg-orange-50 text-orange-600",
      ].join(" ")}
      aria-hidden="true"
    >
      {icon}
    </span>
    <span className="block text-lg font-black">{title}</span>
    <span
      className={[
        "mt-1 block text-sm font-semibold leading-5",
        highlight ? "text-orange-50" : "text-stone-500",
      ].join(" ")}
    >
      {subtitle}
    </span>
    {badge ? (
      <span
        className={[
          "absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-black",
          highlight ? "bg-white text-orange-700" : "bg-orange-600 text-white",
        ].join(" ")}
      >
        {badge}
      </span>
    ) : null}
  </Motion.button>
);

const RewardStrip = ({ loyalty }) => {
  const points = Number(loyalty?.points || 0);
  const tier = loyalty?.tier ? String(loyalty.tier).toLowerCase() : "bronze";
  const progress = Math.max(0, Math.min(100, Number(loyalty?.progress || 0)));
  const lastGain = Number(
    loyalty?.lastGain ||
      (typeof window !== "undefined"
        ? window.localStorage.getItem("nearBites:lastCoinGain")
        : 0) ||
      0
  );

  return (
    <Motion.section
      {...fadeUp}
      className="relative overflow-hidden rounded-[26px] border border-white/70 bg-white/75 p-4 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(251,146,60,0.18),transparent_26%),radial-gradient(circle_at_92%_8%,rgba(244,63,94,0.12),transparent_24%)]" />
      <div className="relative grid gap-4 md:grid-cols-[1fr,1.4fr] md:items-center">
        <div className="flex items-center gap-3">
          <Motion.div
            animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-600 text-white shadow-[0_18px_36px_-24px_rgba(234,88,12,0.9)]"
          >
            <CoinIcon />
          </Motion.div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">
              NearCoins wallet
            </p>
            <div className="mt-1 flex flex-wrap items-end gap-2">
              <Motion.p
                key={points}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-3xl font-black leading-none text-stone-950"
              >
                {points.toLocaleString()}
              </Motion.p>
              {lastGain > 0 ? (
                <Motion.span
                  initial={{ y: 10, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  className="mb-0.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700"
                >
                  +{lastGain} after order
                </Motion.span>
              ) : null}
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-4 text-xs font-black uppercase tracking-[0.12em] text-stone-500">
            <span>{tier} tier</span>
            <span>{loyalty?.pointsToNext || 0} XP to next</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-100">
            <Motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400 shadow-[0_0_18px_rgba(249,115,22,0.45)]"
            />
          </div>
        </div>
      </div>
    </Motion.section>
  );
};

const OfferCard = ({ promo, index = 0 }) => {
  const restaurant = promo?.restaurant || {};
  const value =
    promo?.discountType === "PERCENTAGE"
      ? `${promo?.value || promo?.discount || 20}% off`
      : `${formatCurrency(promo?.value || promo?.discount || 100)} off`;

  return (
    <Motion.article
      {...fadeUp}
      transition={{ ...fadeUp.transition, delay: index * 0.04 }}
      whileHover={{ y: -5 }}
      className="relative min-w-[280px] overflow-hidden rounded-[24px] border border-white/50 bg-stone-950 text-white shadow-[0_24px_70px_-44px_rgba(15,23,42,0.65)] sm:min-w-[330px]"
    >
      <div className="absolute inset-0">
        {restaurant?.imageUrl ? (
          <img src={restaurant.imageUrl} alt={restaurant.name || "Restaurant offer"} className="h-full w-full object-cover opacity-70" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-orange-700 via-rose-600 to-stone-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/28 to-black/10" />
      </div>
      <div className="relative flex min-h-[210px] flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-orange-700">
            Restaurant offer
          </span>
          <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] backdrop-blur">
            Live
          </span>
        </div>
        <div>
          <p className="text-3xl font-black leading-none">{value}</p>
          <h3 className="mt-2 truncate text-lg font-black">
            {restaurant?.name || promo?.title || "Featured restaurant"}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-white/78">
            {promo?.description || promo?.code || "Tap to explore today's deal."}
          </p>
          <Link
            to={
              restaurant?._id
                ? getCustomerRestaurantRoute(restaurant._id)
                : appRoutes.customerSearch
            }
            className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-stone-950 no-underline transition hover:bg-orange-50"
          >
            Order deal
          </Link>
        </div>
      </div>
    </Motion.article>
  );
};

const DecisionWheelCard = ({
  restaurants = [],
  popularDishes = [],
}) => {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);

  const choices = useMemo(() => {
    const dishChoices = popularDishes
      .filter((dish) => dish?.name && dish?.restaurant?._id)
      .map((dish) => ({
        id: `dish-${dish._id}`,
        label: dish.name,
        type: "Dish",
        restaurant: dish.restaurant,
        gameName: "Craving Spinner",
      }));

    const restaurantChoices = restaurants.slice(0, 12).map((restaurant) => ({
      id: `restaurant-${restaurant._id}`,
      label: restaurant.name,
      type: "Restaurant",
      restaurant,
      gameName: "Restaurant Duel",
    }));

    return shuffle([...dishChoices, ...restaurantChoices]).slice(0, 16);
  }, [popularDishes, restaurants]);

  const wheelSegments = choices.length > 0 ? choices.slice(0, 10) : [];

  const spinChoice = () => {
    if (spinning || choices.length === 0) return;

    setSpinning(true);
    const finalChoice = choices[Math.floor(Math.random() * choices.length)];
    setRotation((value) => value + 1080 + Math.floor(Math.random() * 360));
    window.setTimeout(() => {
      setResult(finalChoice);
      setSpinning(false);
    }, 1450);
  };

  return (
    <Card className="relative overflow-hidden border-0 bg-[linear-gradient(135deg,#180b05_0%,#7c2d12_42%,#f97316_72%,#f43f5e_100%)] p-5 text-white shadow-[0_32px_90px_-44px_rgba(249,115,22,0.85)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,237,213,0.18),transparent_28%)]" />
      <div className="relative grid gap-6 lg:grid-cols-[0.95fr,1.05fr] lg:items-center">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/70">
            Craving wheel
          </p>
          <h3 className="mt-2 text-3xl font-black leading-tight">
            {result?.label || "Pick your next bite"}
          </h3>
          <p className="mt-2 text-sm font-semibold text-white/82">
            {result?.restaurant?.name
              ? result.restaurant.name
              : "Spin through live restaurants and dishes."}
          </p>
          <button
            type="button"
            onClick={spinChoice}
            disabled={spinning || choices.length === 0}
            className="mt-5 rounded-[20px] bg-white px-5 py-3 text-sm font-black text-orange-700 shadow-[0_18px_34px_-22px_rgba(255,255,255,0.75)] transition hover:scale-[1.02] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {spinning ? "Picking..." : "Spin"}
          </button>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[320px]">
          <div className="absolute inset-[-10px] rounded-full bg-white/10 blur-xl" />
          <div className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-white drop-shadow" />
          <Motion.div
            animate={{ rotate: rotation }}
            transition={{ duration: 1.45, ease: [0.12, 0.76, 0.16, 1] }}
            className="relative h-full w-full rounded-full border-[10px] border-white/20 bg-[conic-gradient(from_0deg,#fb923c,#f43f5e,#fde047,#22c55e,#38bdf8,#a78bfa,#fb923c)] p-5 shadow-[inset_0_0_40px_rgba(0,0,0,0.22),0_28px_70px_-36px_rgba(0,0,0,0.9)]"
          >
            <div className="absolute inset-[18%] rounded-full border border-white/30 bg-stone-950/72 backdrop-blur" />
            {wheelSegments.map((choice, index) => {
              const angle = (360 / wheelSegments.length) * index;
              return (
                <div
                  key={choice.id}
                  className="absolute left-1/2 top-1/2 origin-left text-[10px] font-black uppercase tracking-[0.08em] text-white drop-shadow"
                  style={{ transform: `rotate(${angle}deg) translateX(70px) rotate(90deg)` }}
                >
                  <span className="block max-w-[76px] truncate">{choice.label}</span>
                </div>
              );
            })}
            <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-white text-center text-xs font-black uppercase tracking-[0.12em] text-orange-700 shadow-xl">
              Spin
            </div>
          </Motion.div>
        </div>
      </div>
    </Card>
  );
};

const CustomerHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { favoriteIds } = useFavorites();
  const {
    location,
    status: locationStatus,
    error: locationError,
    requestLocation,
    clearLocation,
  } = useUserLocation();
  const { feed, loading, error, loadDiscovery, filters, filteredRestaurants } =
    useRestaurantDiscovery();

  const [activeCategory, setActiveCategory] = useState("All");
  const [restaurantMode, setRestaurantMode] = useState("recommended");
  const [tiffins, setTiffins] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loyaltyInfo, setLoyaltyInfo] = useState(null);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      api.get("/tiffins"),
      api.get("/promos/active"),
      api.get("/orders/loyalty"),
    ]).then(([tiffinResult, promoResult, loyaltyResult]) => {
      if (!mounted) return;

      if (tiffinResult.status === "fulfilled") {
        const payload = tiffinResult.value;
        const providers = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload.data?.data)
          ? payload.data.data
          : [];
        setTiffins(providers);
      }

      if (promoResult.status === "fulfilled") {
        setPromos(Array.isArray(promoResult.value.data) ? promoResult.value.data : []);
      }

      if (loyaltyResult.status === "fulfilled") {
        setLoyaltyInfo(loyaltyResult.value.data || null);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const firstName = user?.name?.split(" ")[0] || "there";
  const categoryOptions = useMemo(() => buildCategoryOptions(feed), [feed]);
  const hasActiveFilters = Boolean(filters.search.trim()) || activeCategory !== "All";

  const recommendedRestaurants = useMemo(() => {
    if (hasActiveFilters) return filteredRestaurants.slice(0, 6);
    return (feed.featuredRestaurants?.length
      ? feed.featuredRestaurants
      : filteredRestaurants
    ).slice(0, 6);
  }, [feed.featuredRestaurants, filteredRestaurants, hasActiveFilters]);

  const topRatedRestaurants = useMemo(() => {
    const source = hasActiveFilters
      ? filteredRestaurants
      : feed.restaurants?.length
      ? feed.restaurants
      : filteredRestaurants;

    return [...source]
      .sort(
        (left, right) =>
          Number(right.rating || 0) - Number(left.rating || 0) ||
          Number(left.deliveryTime || 999) - Number(right.deliveryTime || 999) ||
          Number(right.availableItemCount || 0) - Number(left.availableItemCount || 0)
      )
      .slice(0, 6);
  }, [feed.restaurants, filteredRestaurants, hasActiveFilters]);

  const showcaseRestaurants =
    restaurantMode === "top-rated" ? topRatedRestaurants : recommendedRestaurants;

  const popularDishes = useMemo(
    () => (feed.popularDishes || []).filter((dish) => dish.restaurant?._id).slice(0, 6),
    [feed.popularDishes]
  );

  const popularRestaurants = useMemo(
    () =>
      (
        feed.trendingRestaurants?.length
          ? feed.trendingRestaurants
          : filteredRestaurants
      ).slice(0, 4),
    [feed.trendingRestaurants, filteredRestaurants]
  );

  const tiffinMinPrice = useMemo(() => {
    const prices = tiffins
      .map((item) => Number(item.price || 0))
      .filter((price) => price > 0);
    return prices.length ? Math.min(...prices) : 0;
  }, [tiffins]);

  const handleCategory = (label) => {
    setActiveCategory(label);
    filters.setSelectedCuisine(label === "All" ? "All" : label);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = filters.search.trim();
    if (query) {
      navigate(`${appRoutes.customerSearch}?q=${encodeURIComponent(query)}`);
    }
  };

  const focusFood = () => {
    document
      .getElementById("recommended-restaurants")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openOffers = () => {
    const restaurantName = promos[0]?.restaurant?.name;
    navigate(
      restaurantName
        ? `${appRoutes.customerSearch}?q=${encodeURIComponent(restaurantName)}`
        : appRoutes.customerSearch
    );
  };

  const clearFilters = () => {
    setActiveCategory("All");
    setRestaurantMode("recommended");
    filters.resetFilters();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-8 text-stone-950">
      <Motion.section
        {...fadeUp}
        className="relative overflow-hidden rounded-[28px] bg-[#211008] px-5 py-6 text-white shadow-[0_28px_80px_-54px_rgba(234,88,12,0.9)] sm:px-7 sm:py-8"
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(234,88,12,0.42),transparent_44%),radial-gradient(circle_at_88%_12%,rgba(255,255,255,0.16),transparent_28%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr,360px] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-orange-200">
              {getGreeting()}
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
              Hi, {firstName} <span aria-hidden="true">👋</span>
            </h1>
          </div>

          <Card className="border-white/15 bg-white/10 p-4 text-white backdrop-blur-xl">
            <button
              type="button"
              onClick={locationStatus === "granted" ? clearLocation : requestLocation}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 text-left transition hover:bg-white/15"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600">
                <PinIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-black uppercase tracking-[0.12em] text-orange-100">
                  Delivery location
                </span>
                <span className="mt-1 block truncate text-sm font-black text-white">
                  {locationStatus === "requesting"
                    ? "Locating..."
                    : locationStatus === "granted"
                    ? location?.city || "Your location"
                    : "Use current location"}
                </span>
              </span>
              <ArrowIcon className="h-4 w-4 text-orange-100" />
            </button>
            {locationError ? (
              <p className="mt-3 text-xs font-semibold text-orange-100">
                {locationError}
              </p>
            ) : null}
          </Card>
        </div>
      </Motion.section>

      <Motion.form
        {...fadeUp}
        onSubmit={handleSearchSubmit}
        className="sticky top-[68px] z-30 -mx-2 rounded-[24px] bg-[#fafaf8]/92 px-2 py-2 backdrop-blur-xl sm:top-[72px]"
      >
        <div className="relative">
          <SearchIcon className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => filters.setSearch(event.target.value)}
            placeholder="Search restaurants, dishes, cuisines..."
            className="h-[60px] w-full rounded-[20px] border border-[#e8dfd2] bg-white py-4 pl-[52px] pr-24 text-base font-bold text-stone-950 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.55)] outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 inline-flex h-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-orange-600 px-4 text-sm font-black text-white transition hover:bg-orange-700"
          >
            Search
          </button>
        </div>
      </Motion.form>

      <RewardStrip loyalty={loyaltyInfo} />

      {promos.length > 0 ? (
        <SectionWrapper
          eyebrow="Today"
          title="Restaurant offers"
          subtitle="Fresh deals from restaurants near you."
          action={
            <Button size="sm" variant="secondary" onClick={openOffers}>
              View deals
            </Button>
          }
        >
          <div className="scrollbar-hide -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {promos.slice(0, 8).map((promo, index) => (
              <div key={promo._id || `${promo.code}-${index}`} className="snap-start">
                <OfferCard promo={promo} index={index} />
              </div>
            ))}
          </div>
        </SectionWrapper>
      ) : null}

      <DecisionWheelCard
        restaurants={topRatedRestaurants.length > 0 ? topRatedRestaurants : filteredRestaurants}
        popularDishes={popularDishes}
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          title="Tiffin Service"
          subtitle={
            tiffins.length > 0
              ? `${tiffins.length} provider${tiffins.length === 1 ? "" : "s"}${tiffinMinPrice ? ` from ${formatCurrency(tiffinMinPrice)}` : ""}`
              : "Daily meal plans from active providers"
          }
          icon="🍱"
          highlight
          badge={tiffins.length > 0 ? `${tiffins.length} live` : null}
          onClick={() => navigate(appRoutes.customerTiffin)}
        />
        <QuickActionCard
          title="Order Food"
          subtitle={`${feed.highlights.activeRestaurantCount || 0} restaurant${
            feed.highlights.activeRestaurantCount === 1 ? "" : "s"
          } available`}
          icon="🍔"
          onClick={focusFood}
        />
        <QuickActionCard
          title="Favorites"
          subtitle={`${favoriteIds.length || 0} saved place${
            favoriteIds.length === 1 ? "" : "s"
          }`}
          icon="★"
          onClick={() => navigate(appRoutes.customerFavorites)}
        />
        <QuickActionCard
          title="Offers"
          subtitle={
            promos.length > 0
              ? `${promos.length} active offer${promos.length === 1 ? "" : "s"}`
              : "Browse restaurants with current deals"
          }
          icon="%"
          onClick={openOffers}
        />
      </section>

      <SectionWrapper title="Categories" subtitle="Pick a craving.">
        <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
          {categoryOptions.map((category) => {
            const active = activeCategory === category.label;
            return (
              <button
                key={category.label}
                type="button"
                onClick={() => handleCategory(category.label)}
                className={[
                  "flex shrink-0 items-center gap-2 rounded-[18px] border px-4 py-3 text-sm font-black transition",
                  active
                    ? "border-orange-600 bg-orange-600 text-white shadow-[0_16px_32px_-24px_rgba(234,88,12,0.9)]"
                    : "border-[#eee7dc] bg-white text-stone-700 hover:border-orange-200 hover:text-orange-700",
                ].join(" ")}
              >
                <span aria-hidden="true">{getCategoryIcon(category.label)}</span>
                <span>{category.label}</span>
                {category.count > 0 ? (
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[11px]",
                      active ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500",
                    ].join(" ")}
                  >
                    {category.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </SectionWrapper>

      <SectionWrapper
        id="recommended-restaurants"
        eyebrow={restaurantMode === "top-rated" ? "Top rated" : "Recommended"}
        title={
          restaurantMode === "top-rated"
            ? "Top rated near you"
            : "Restaurants for you"
        }
        subtitle={
          restaurantMode === "top-rated"
            ? "Sorted by rating."
            : hasActiveFilters
            ? `${showcaseRestaurants.length} result${
                showcaseRestaurants.length === 1 ? "" : "s"
              } match your filters`
            : "Picked from the live feed."
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRestaurantMode("recommended")}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                restaurantMode === "recommended"
                  ? "bg-orange-600 text-white shadow-[0_16px_28px_-20px_rgba(234,88,12,0.9)]"
                  : "border border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
              }`}
            >
              Recommended
            </button>
            <button
              type="button"
              onClick={() => {
                setRestaurantMode("top-rated");
                filters.setSortBy("rating_desc");
              }}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                restaurantMode === "top-rated"
                  ? "bg-stone-950 text-white shadow-[0_16px_28px_-20px_rgba(15,23,42,0.9)]"
                  : "border border-[#e6ded1] bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              Top rated
            </button>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-black text-orange-700 transition hover:bg-orange-50"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        }
      >
        {loading ? (
          <SectionSkeleton cards={6} />
        ) : error ? (
          <EmptyPanel
            title="Restaurants could not load"
            description={error}
            action={<Button onClick={loadDiscovery}>Retry</Button>}
          />
        ) : showcaseRestaurants.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {showcaseRestaurants.map((restaurant, index) => (
              <RestaurantTile
                key={restaurant._id}
                restaurant={restaurant}
                index={index}
              />
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="No restaurants found"
            description="Try another category or search for a different craving."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Reset
              </Button>
            }
          />
        )}
      </SectionWrapper>

      <SectionWrapper
        eyebrow="Live"
        title="Popular near you"
        subtitle="Live picks from the feed."
      >
        {loading ? (
          <SectionSkeleton cards={3} />
        ) : popularDishes.length > 0 ? (
          <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3">
            {popularDishes.map((dish, index) => (
              <DishTile key={dish._id} dish={dish} index={index} />
            ))}
          </div>
        ) : popularRestaurants.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {popularRestaurants.map((restaurant, index) => (
              <RestaurantTile
                key={restaurant._id}
                restaurant={restaurant}
                index={index}
              />
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="Nothing trending yet"
            description="Popular dishes will appear here as real orders come in."
          />
        )}
      </SectionWrapper>
    </div>
  );
};

export default CustomerHome;
