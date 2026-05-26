import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Card from "../../components/Card.jsx";
import SectionWrapper from "../../components/SectionWrapper.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import {
  appRoutes,
  getCustomerGameRoute,
  getCustomerRestaurantRoute,
} from "../../app/routes.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useUserLocation } from "../../hooks/useUserLocation.js";
import { api } from "../../services/api.js";
import { formatCurrency } from "../../utils/formatters.js";
import { useRestaurantDiscovery } from "./useRestaurantDiscovery.js";
import {
  DEFAULT_GAME_KEY,
  GAME_LIBRARY,
  getGameSlug,
  getGameTheme,
} from "../games/gameCatalog.js";

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

const HOME_FEATURED_GAME_KEYS = [
  "hand-cricket",
  "tray-shuffle",
  "lucky-tray",
  "snack-snap",
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

const getRewardTone = (reward, index = 0) => {
  if (reward?.gameRewardTier === "TOP") {
    return {
      cardClassName:
        "border-rose-200 bg-[linear-gradient(135deg,#fff1f2,#ffe4e6_55%,#fff7ed)]",
      badgeClassName: "bg-rose-600 text-white",
      metaClassName: "text-rose-600",
    };
  }

  return index % 2 === 0
    ? {
        cardClassName:
          "border-orange-200 bg-[linear-gradient(135deg,#fff7ed,#ffedd5_55%,#fff1f2)]",
        badgeClassName: "bg-orange-600 text-white",
        metaClassName: "text-orange-600",
      }
    : {
        cardClassName:
          "border-amber-200 bg-[linear-gradient(135deg,#fffbeb,#fef3c7_55%,#fff7ed)]",
        badgeClassName: "bg-amber-500 text-stone-950",
        metaClassName: "text-amber-700",
      };
};

const HomeFoodGameCard = ({
  restaurants = [],
  popularDishes = [],
  onOpenGames,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);

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

  const spinChoice = () => {
    if (spinning || choices.length === 0) return;

    setSpinning(true);
    let tick = 0;
    const totalTicks = 16 + Math.floor(Math.random() * 8);

    const intervalId = window.setInterval(() => {
      const nextChoice = choices[tick % choices.length];
      setResult(nextChoice);
      tick += 1;

      if (tick >= totalTicks) {
        window.clearInterval(intervalId);
        const finalChoice = choices[Math.floor(Math.random() * choices.length)];
        setResult(finalChoice);
        setSpinning(false);
      }
    }, 90);
  };

  return (
    <Card className="relative overflow-hidden border-0 bg-[linear-gradient(135deg,#271208_0%,#7c2d12_34%,#f97316_68%,#fb7185_100%)] p-5 text-white shadow-[0_32px_90px_-44px_rgba(249,115,22,0.85)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,237,213,0.18),transparent_28%)]" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/70">
            Games
          </p>
          <h3 className="mt-2 text-2xl font-black">
            {result?.label || "Pick your next bite"}
          </h3>
          <p className="mt-2 text-sm font-semibold text-white/82">
            {result?.restaurant?.name
              ? result.restaurant.name
              : "Live dishes and restaurants"}
          </p>
        </div>
        <span className="rounded-full border border-white/15 bg-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white backdrop-blur">
          {result?.gameName || "Craving Spinner"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr,auto] sm:items-end">
        <div className="grid gap-3 sm:grid-cols-2">
          {choices.slice(0, 4).map((choice, index) => (
            <div
              key={choice.id}
              className={`rounded-[18px] border px-4 py-3 ${
                result?.id === choice.id
                  ? "border-white/45 bg-white/18 shadow-[0_18px_34px_-28px_rgba(255,255,255,0.8)]"
                  : index % 2 === 0
                  ? "border-white/14 bg-white/10"
                  : "border-orange-100/25 bg-black/10"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/65">
                {choice.type}
              </p>
              <p className="mt-1 truncate text-sm font-black text-white">
                {choice.label}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={spinChoice}
            disabled={spinning || choices.length === 0}
            className="rounded-[20px] bg-white px-5 py-3 text-sm font-black text-orange-700 transition hover:scale-[1.02] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {spinning ? "Picking..." : "Spin"}
          </button>
          <button
            type="button"
            onClick={onOpenGames}
            className="rounded-[20px] border border-white/20 bg-black/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
          >
            All games
          </button>
        </div>
      </div>
    </Card>
  );
};

const HomeGameShortcutCard = ({ game, onOpen }) => {
  const theme = getGameTheme(game.key);

  return (
    <Card
      interactive
      as="button"
      type="button"
      onClick={() => onOpen(game.key)}
      className={`relative h-full overflow-hidden p-4 text-left ${theme.softCard}`}
    >
      <div className="absolute right-3 top-3 text-[44px] font-black leading-none text-stone-900/10">
        {theme.glyph || theme.mark}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${theme.chip}`}>
            {theme.mark}
          </span>
          <h3 className="mt-3 text-lg font-black text-stone-950">{game.title}</h3>
        </div>
        <span className="rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-stone-600">
          {theme.crowd || "solo"}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-stone-600">
        {theme.homeHint || game.description}
      </p>
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
  const [gamesFeed, setGamesFeed] = useState({ games: [], rewards: [] });

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      api.get("/tiffins"),
      api.get("/promos/active"),
      api.get("/games/feed"),
    ]).then(([tiffinResult, promoResult, gameResult]) => {
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

      if (gameResult.status === "fulfilled") {
        setGamesFeed(gameResult.value.data || { games: [], rewards: [] });
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

  const homeGames = useMemo(() => {
    const available = Array.isArray(gamesFeed.games) && gamesFeed.games.length
      ? gamesFeed.games
      : GAME_LIBRARY;
    const featured = HOME_FEATURED_GAME_KEYS.map((key) =>
      available.find((game) => game.key === key)
    ).filter(Boolean);
    const extras = available.filter(
      (game) => !featured.some((item) => item.key === game.key)
    );
    return [...featured, ...extras].slice(0, 4);
  }, [gamesFeed.games]);

  const gameRewards = useMemo(
    () => (Array.isArray(gamesFeed.rewards) ? gamesFeed.rewards : []),
    [gamesFeed.rewards]
  );

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

      <SectionWrapper
        eyebrow="Play"
        title="Games & rewards"
        subtitle="Tap in."
        action={
          <Button size="sm" onClick={() => navigate(appRoutes.customerGames)}>
            Games
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <HomeFoodGameCard
            restaurants={topRatedRestaurants.length > 0 ? topRatedRestaurants : filteredRestaurants}
            popularDishes={popularDishes}
            onOpenGames={() => navigate(getCustomerGameRoute(getGameSlug(DEFAULT_GAME_KEY)))}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {homeGames.map((game) => (
              <HomeGameShortcutCard
                key={game.key}
                game={game}
                onOpen={(gameKey) =>
                  navigate(getCustomerGameRoute(getGameSlug(gameKey)))
                }
              />
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr,1fr,1fr]">
          <Card
            interactive
            as="button"
            type="button"
            onClick={() => navigate(appRoutes.customerGames)}
            className="overflow-hidden border-stone-900 bg-[linear-gradient(135deg,#0f172a,#1f2937_55%,#334155)] p-4 text-left text-white shadow-[0_24px_60px_-44px_rgba(15,23,42,0.9)]"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/70">
              Games hub
            </p>
            <h3 className="mt-2 text-xl font-black">Open all games</h3>
          </Card>

          {gameRewards.slice(0, 2).map((reward, index) => {
            const tone = getRewardTone(reward, index);

            return (
              <Card key={reward._id} className={`p-4 ${tone.cardClassName}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${tone.metaClassName}`}>
                      {reward.gameRewardTier === "TOP" ? "Top reward" : "Score reward"}
                    </p>
                    <p className="mt-2 text-xl font-black text-stone-950">
                      {reward.discountType === "PERCENTAGE"
                        ? `${reward.value}% off`
                        : `${formatCurrency(reward.value)} off`}
                    </p>
                    <p className="mt-1 text-xs font-bold text-stone-600">
                      {reward.restaurant?.name || "Vendor offer"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${tone.badgeClassName}`}>
                    {reward.gameRewardTier === "TOP" ? "Top" : `${reward.gameMinScore || 0}+`}
                  </span>
                </div>
              </Card>
            );
          })}

          {gameRewards.length === 0 ? (
            <Card className="border-orange-200 bg-[linear-gradient(135deg,#fff7ed,#ffedd5)] p-4">
              <p className="text-sm font-black text-stone-950">Rewards loading</p>
            </Card>
          ) : null}
        </div>
      </SectionWrapper>
    </div>
  );
};

export default CustomerHome;
