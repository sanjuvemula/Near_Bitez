import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Card from "../../components/Card.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import { appRoutes, getCustomerRestaurantRoute } from "../../app/routes.jsx";
import { useUserLocation } from "../../hooks/useUserLocation.js";
import { api } from "../../services/api.js";
import { formatCurrency } from "../../utils/formatters.js";
import { useRestaurantDiscovery } from "../home/useRestaurantDiscovery.js";
import {
  DEFAULT_GAME_KEY,
  getGameTheme,
  withGameTheme,
} from "./gameCatalog.js";
import CricketMiniGame from "./hand-cricket/CricketMiniGame.jsx";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: "easeOut" },
};

const SOUND_PATTERNS = {
  click: [220],
  score: [640, 820],
  win: [523, 659, 784],
  lose: [260, 190],
};

const useGameAudio = () => {
  const [enabled, setEnabled] = useState(true);
  const contextRef = useRef(null);

  const play = useCallback(
    (type = "click") => {
      if (!enabled) return;

      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const context = contextRef.current || new AudioContext();
        contextRef.current = context;

        const notes = SOUND_PATTERNS[type] || SOUND_PATTERNS.click;
        notes.forEach((frequency, index) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const start = context.currentTime + index * 0.07;
          const duration = type === "click" ? 0.045 : 0.11;

          oscillator.type = type === "lose" ? "sawtooth" : "sine";
          oscillator.frequency.setValueAtTime(frequency, start);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.08, start + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(start);
          oscillator.stop(start + duration + 0.02);
        });
      } catch {
        // Sound is enhancement-only; browser audio policies may block it.
      }
    },
    [enabled]
  );

  return { enabled, setEnabled, play };
};

const shuffle = (items) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const chooseRandom = (items, count) => shuffle(items).slice(0, count);
const BALL_CHOICES = [1, 2, 3, 4, 5, 6];
const FOOD_DICE_FACES = {
  1: "🍕",
  2: "🍔",
  3: "🍟",
  4: "🌮",
  5: "🍜",
  6: "🍩",
};
const WHEEL_SEGMENT_COUNT = 6;
const WHEEL_SEGMENT_COLORS = ["#fed7aa", "#bbf7d0", "#bfdbfe", "#fde68a", "#fecdd3", "#ddd6fe"];
const SNAKES = { 28: 11, 24: 7, 19: 5, 14: 3 };
const LADDERS = { 2: 12, 6: 17, 10: 21, 16: 27, 22: 29 };
const TRAY_SHELLS = [
  {
    mark: "A",
    className: "from-indigo-500 via-violet-500 to-sky-400",
    softClassName: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  {
    mark: "B",
    className: "from-rose-500 via-pink-500 to-orange-400",
    softClassName: "border-rose-200 bg-rose-50 text-rose-700",
  },
  {
    mark: "C",
    className: "from-emerald-500 via-teal-500 to-cyan-400",
    softClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
];
const LUCKY_LIDS = [0, 2, 3, 4, 5, 7];

const getRestaurantScore = (restaurant) =>
  Number(restaurant?.rating || 0) * 18 +
  Number(restaurant?.availableItemCount || 0) +
  Math.max(0, 50 - Number(restaurant?.deliveryTime || 50));

const restaurantLine = (restaurant) =>
  [restaurant?.category, ...(restaurant?.cuisineType || []).slice(0, 2)]
    .filter(Boolean)
    .join(" - ");

const metric = (label, value) => ({ label, value });

const getRandomNumber = () => BALL_CHOICES[Math.floor(Math.random() * BALL_CHOICES.length)];

const getFoodDieFace = (value) => FOOD_DICE_FACES[value] || "🍽️";

const getWheelIcon = (kind = "") => {
  const normalized = kind.toLowerCase();
  if (normalized.includes("dish")) return "🍜";
  if (normalized.includes("restaurant")) return "🍽️";
  return "🥡";
};

const pickResultRestaurant = (restaurants, seed = 0) => {
  if (!restaurants?.length) return null;
  const ranked = [...restaurants].sort(
    (left, right) => getRestaurantScore(right) - getRestaurantScore(left)
  );
  return ranked[Math.abs(seed) % ranked.length] || ranked[0];
};

const resolveBoardMove = (position, roll) => {
  const stepped = Math.min(30, position + roll);
  if (LADDERS[stepped]) {
    return {
      next: LADDERS[stepped],
      event: "ladder",
      landed: stepped,
    };
  }
  if (SNAKES[stepped]) {
    return {
      next: SNAKES[stepped],
      event: "snake",
      landed: stepped,
    };
  }
  return {
    next: stepped,
    event: "",
    landed: stepped,
  };
};

const EmptyGame = ({ title, description }) => (
  <div className="rounded-[20px] border border-dashed border-[#eadfce] bg-[#fffaf3] p-8 text-center">
    <p className="text-lg font-black text-stone-950">{title}</p>
    <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-stone-500">
      {description}
    </p>
  </div>
);

const RestaurantOption = ({ restaurant, onClick, active = false, badge = null }) => {
  if (!restaurant) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-[22px] border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_22px_55px_-40px_rgba(234,88,12,0.55)]",
        active ? "border-orange-400 ring-4 ring-orange-100" : "border-[#eee7dc]",
      ].join(" ")}
    >
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[18px] bg-stone-100">
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-orange-50 text-xs font-black text-orange-700">
              Food
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="truncate text-sm font-black text-stone-950">
              {restaurant.name}
            </p>
            {badge ? (
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-orange-700">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-stone-500">
            {restaurantLine(restaurant) || "Restaurant"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black text-stone-600">
            <span className="rounded-full bg-stone-100 px-2.5 py-1">
              {Number(restaurant.rating || 0).toFixed(1)} rated
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-1">
              {restaurant.deliveryTime || 30} min
            </span>
            {Number(restaurant.minimumItemPrice || 0) > 0 ? (
              <span className="rounded-full bg-stone-100 px-2.5 py-1">
                starts {formatCurrency(restaurant.minimumItemPrice)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
};

const ResultPanel = ({ result, onReset, onClaim, canClaimPlay, claiming }) => {
  if (!result) return null;

  return (
    <Motion.div
      {...fadeUp}
      className="rounded-[22px] border border-[#e7ded2] bg-[#f7f4ee] p-5 text-stone-950 shadow-[0_18px_48px_-40px_rgba(65,54,43,0.32)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase text-orange-600">
            Result
          </p>
          <h3 className="mt-2 text-2xl font-black text-stone-950">{result.title}</h3>
          <p className="mt-1 text-sm font-semibold text-stone-500">
            Score {result.score}. Best score counts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canClaimPlay ? (
            <Button size="sm" onClick={onClaim} loading={claiming}>
              Claim reward
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" onClick={onReset}>
            Play again
          </Button>
        </div>
      </div>

      {result.restaurant?._id ? (
        <Link
          to={getCustomerRestaurantRoute(result.restaurant._id)}
          className="mt-4 flex items-center gap-3 rounded-[18px] border border-[#e7ded2] bg-white p-3 text-stone-950 no-underline transition hover:-translate-y-0.5 hover:border-orange-200"
        >
          <div className="h-14 w-14 overflow-hidden rounded-[16px] bg-stone-100">
            {result.restaurant.imageUrl ? (
              <img
                src={result.restaurant.imageUrl}
                alt={result.restaurant.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-stone-950">
              {result.restaurant.name}
            </p>
            <p className="mt-1 text-xs font-bold text-stone-500">
              Open menu
            </p>
          </div>
        </Link>
      ) : null}
    </Motion.div>
  );
};

const RewardCodePanel = ({ claim }) => {
  if (!claim?.promo?.code) return null;

  return (
    <Motion.div
      {...fadeUp}
      className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 text-stone-950 shadow-[0_18px_48px_-40px_rgba(6,95,70,0.24)]"
    >
      <p className="text-[11px] font-black uppercase text-emerald-700">
        Reward unlocked
      </p>
      <p className="mt-2 text-3xl font-black text-emerald-900">
        {claim.promo.code}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-emerald-700">
        Use it at checkout for {claim.promo.restaurant?.name || "this vendor"}.
      </p>
    </Motion.div>
  );
};

const LeaderboardPanel = ({
  leaderboard,
  loading,
  topReward,
  claiming,
  onClaimTop,
  theme,
}) => {
  const rows = leaderboard?.leaderboard || [];
  const current = leaderboard?.currentUser || null;
  const isTop = current?.rank === 1;

  return (
    <Card className={`p-5 ${theme?.softCard || ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-stone-500">
            Area board
          </p>
          <h3 className="mt-1 text-xl font-black text-stone-950">Leaderboard</h3>
          <p className="mt-1 text-xs font-bold text-stone-500">
            {current ? `#${current.rank} with ${current.bestScore}` : "Play once to enter"}
          </p>
        </div>
        {topReward ? (
          <Button
            size="sm"
            variant={isTop ? "primary" : "secondary"}
            disabled={!isTop}
            loading={claiming}
            onClick={onClaimTop}
          >
            Claim top
          </Button>
        ) : null}
      </div>

      <div className="mt-5 space-y-2">
        {loading ? (
          <>
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </>
        ) : rows.length > 0 ? (
          rows.map((entry) => (
            <div
              key={entry._id}
              className={[
                "flex items-center gap-3 rounded-[18px] border px-3 py-3",
                entry.isCurrentUser
                  ? "border-white bg-white"
                  : "border-white/80 bg-white/80",
              ].join(" ")}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-stone-950 text-sm font-black text-white">
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
          <div className="rounded-[18px] border border-dashed border-white bg-white/70 p-4 text-sm font-bold text-stone-500">
            No scores in this area yet.
          </div>
        )}
      </div>
    </Card>
  );
};

const RewardCard = ({ reward, canClaim, claiming, onClaim, theme }) => {
  const isTop = reward.gameRewardTier === "TOP";

  return (
    <div
      className={`rounded-[20px] border p-4 ${
        isTop
          ? "border-violet-200 bg-[linear-gradient(135deg,#faf5ff,#ffffff)]"
          : theme?.softCard || "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5,#ffffff)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={[
              "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
              isTop
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {isTop ? "Area top" : "Play reward"}
          </span>
          <p className="mt-3 text-xl font-black text-stone-950">
            {reward.discountType === "PERCENTAGE"
              ? `${reward.value}% off`
              : `${formatCurrency(reward.value)} off`}
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-stone-500">
            {reward.restaurant?.name || "Vendor reward"}
            {reward.minOrderValue
              ? ` - min ${formatCurrency(reward.minOrderValue)}`
              : ""}
          </p>
          <p className="mt-1 text-xs font-bold text-stone-400">
            {isTop
              ? `Stay #1 for ${reward.gameHoldMinutes || 1} min`
              : `Score ${reward.gameMinScore || 0}+`}
          </p>
        </div>
        <Button
          size="sm"
          variant={canClaim ? "primary" : "secondary"}
          disabled={!canClaim}
          loading={claiming}
          onClick={onClaim}
        >
          Claim
        </Button>
      </div>
    </div>
  );
};

const NeoMetricCard = ({ label, value, className = "", valueClassName = "" }) => (
  <div className={`nb-neo-stat rounded-[16px] px-4 py-3 ${className}`}>
    <p className="text-[11px] font-extrabold uppercase leading-none text-stone-400">
      {label}
    </p>
    <p className={`mt-2 truncate text-[24px] font-black leading-none text-stone-950 ${valueClassName}`}>
      {value}
    </p>
  </div>
);

const GameInstructions = ({ steps }) => (
  <div className="mb-5 grid gap-3 md:grid-cols-3">
    {steps.map((step) => {
      const countdown = /timer|time|seconds|left/i.test(step.label);
      return (
        <NeoMetricCard
          key={step.label}
          label={step.label}
          value={step.value}
          className={countdown ? "nb-countdown-stat" : ""}
          valueClassName={countdown ? "text-orange-700" : ""}
        />
      );
    })}
  </div>
);

const ArcadeStatCard = ({ label, value, accentClassName }) => (
  <NeoMetricCard label={label} value={value} className={accentClassName} />
);

const GameGroupChip = ({ group, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-4 py-2 text-sm font-black transition ${
      active
        ? "bg-stone-950 text-white shadow-[0_18px_28px_-20px_rgba(15,23,42,0.8)]"
        : "border border-[#e8dece] bg-white text-stone-600 hover:border-orange-200 hover:text-orange-700"
    }`}
  >
    {group.label}
  </button>
);

const GamePosterCard = ({ game, active, onClick }) => {
  const theme = getGameTheme(game.key);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative overflow-hidden rounded-[26px] border p-5 text-left transition duration-200",
        active
          ? `border-transparent bg-gradient-to-br ${theme.panel} text-white shadow-[0_30px_70px_-38px_rgba(15,23,42,0.65)]`
          : `${theme.softCard} hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-34px_rgba(15,23,42,0.3)]`,
      ].join(" ")}
    >
      <div className="absolute right-4 top-4 text-[54px] font-black leading-none text-white/14">
        {theme.glyph || theme.mark}
      </div>
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
              active ? "bg-white/15 text-white" : theme.chip
            }`}
          >
            {theme.mark}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
              active ? "bg-white/10 text-white/85" : "bg-white/80 text-stone-500"
            }`}
          >
            {theme.crowd || "solo"}
          </span>
        </div>

        <div className="mt-10">
          <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${active ? "text-white/65" : "text-stone-400"}`}>
            {theme.group || "quick"}
          </p>
          <h3 className={`mt-2 text-2xl font-black leading-tight ${active ? "text-white" : "text-stone-950"}`}>
            {game.title}
          </h3>
          <p className={`mt-2 text-sm font-semibold ${active ? "text-white/78" : "text-stone-600"}`}>
            {theme.homeHint || game.description}
          </p>
        </div>
      </div>
    </button>
  );
};

const HeroGameTile = ({ game, active, onClick }) => {
  const theme = getGameTheme(game.key);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-[24px] border p-4 text-left transition ${
        active
          ? "border-white/20 bg-white/14 text-white shadow-[0_20px_40px_-26px_rgba(15,23,42,0.65)]"
          : "border-white/10 bg-black/12 text-white/90 hover:bg-white/12"
      }`}
    >
      <div className="absolute right-3 top-3 text-3xl font-black leading-none text-white/12">
        {theme.glyph || theme.mark}
      </div>
      <div className="relative">
        <span className="inline-flex rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/80">
          {theme.mark}
        </span>
        <h3 className="mt-6 text-lg font-black">{game.title}</h3>
        <p className="mt-1 text-xs font-bold text-white/70">{theme.homeHint}</p>
      </div>
    </button>
  );
};

const CravingSpinnerGame = ({ restaurants, popularDishes, categories, onComplete }) => {
  const [spinning, setSpinning] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0);

  const choices = useMemo(() => {
    const dishes = popularDishes
      .filter((dish) => dish.name && dish.restaurant?._id)
      .map((dish) => ({
        id: `dish-${dish._id}`,
        label: dish.name,
        kind: "Dish",
        restaurant: dish.restaurant,
      }));

    const restaurantChoices = restaurants.map((restaurant) => ({
      id: `restaurant-${restaurant._id}`,
      label: restaurant.name,
      kind: "Restaurant",
      restaurant,
    }));

    const categoryChoices = categories
      .filter((category) => category.label !== "All" && category.count > 0)
      .map((category) => {
        const restaurant = restaurants.find(
          (item) =>
            item.category?.toLowerCase() === category.label.toLowerCase() ||
            item.cuisineType?.some(
              (cuisine) => cuisine?.toLowerCase() === category.label.toLowerCase()
            )
        );
        return {
          id: `category-${category.label}`,
          label: category.label,
          kind: "Craving",
          restaurant,
        };
      });

    return [...dishes, ...restaurantChoices, ...categoryChoices].slice(0, WHEEL_SEGMENT_COUNT);
  }, [categories, popularDishes, restaurants]);

  const wheelGradient = useMemo(() => {
    const segmentSize = 100 / Math.max(choices.length, 1);
    return choices
      .map((_, index) => {
        const start = index * segmentSize;
        const end = (index + 1) * segmentSize;
        return `${WHEEL_SEGMENT_COLORS[index % WHEEL_SEGMENT_COLORS.length]} ${start}% ${end}%`;
      })
      .join(", ");
  }, [choices]);

  const spin = () => {
    if (spinning || choices.length === 0) return;

    setSpinning(true);
    let tick = 0;
    const totalTicks = 18 + Math.floor(Math.random() * 8);

    const intervalId = window.setInterval(() => {
      const nextChoice = choices[tick % choices.length];
      setSelected(nextChoice);
      setSelectedIndex(tick % choices.length);
      tick += 1;

      if (tick >= totalTicks) {
        window.clearInterval(intervalId);
        const finalIndex = Math.floor(Math.random() * choices.length);
        const finalChoice = choices[finalIndex];
        const segmentAngle = 360 / choices.length;
        const segmentCenter = finalIndex * segmentAngle + segmentAngle / 2;
        setSelected(finalChoice);
        setSelectedIndex(finalIndex);
        setWheelRotation((current) => current + 1440 + (360 - segmentCenter));
        setSpinning(false);
        onComplete({
          score: Math.min(
            100,
            68 + Math.floor(getRestaurantScore(finalChoice.restaurant) / 14)
          ),
          title: finalChoice.label,
          restaurant: finalChoice.restaurant,
          meta: { choice: finalChoice.label, type: finalChoice.kind },
        });
      }
    }, 85);
  };

  if (choices.length === 0) {
    return (
      <EmptyGame
        title="No live choices yet"
        description="The spinner unlocks when restaurants or dishes are live in the feed."
      />
    );
  }

  return (
    <div className="space-y-5">
      <GameInstructions
        steps={[
          metric("Segments", choices.length),
          metric("Selected", selected ? selected.kind : "Ready"),
          metric("Action", spinning ? "Spin" : "Tap"),
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr,220px] lg:items-center">
        <div className="rounded-[22px] border border-orange-100 bg-[#fff7ed] p-5">
          <p className="text-[11px] font-black uppercase text-orange-600">
            Pick for me
          </p>
          <h3 className="mt-2 text-3xl font-black text-stone-950">
            {selected?.label || "Dinner is one spin away"}
          </h3>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-[240px]">
          <div className="absolute left-1/2 top-[-8px] z-20 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[18px] border-x-transparent border-t-stone-950" />
          <div
            className="nb-spinner-wheel absolute inset-0 rounded-full border-[10px] border-white"
            style={{
              background: `conic-gradient(${wheelGradient})`,
              transform: `rotate(${wheelRotation}deg)`,
            }}
          >
            {choices.map((choice, index) => {
              const angle = (360 / choices.length) * index + 180 / choices.length;
              return (
                <span
                  key={choice.id}
                  className="absolute left-1/2 top-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/82 text-xl shadow-[0_8px_20px_-14px_rgba(65,54,43,0.45)]"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-78px) rotate(-${angle}deg)`,
                  }}
                >
                  {getWheelIcon(choice.kind)}
                </span>
              );
            })}
          </div>
          <button
            type="button"
            onClick={spin}
            disabled={spinning}
            className="absolute left-1/2 top-1/2 z-10 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-orange-100 bg-white text-lg font-black text-orange-700 shadow-[0_12px_30px_-22px_rgba(65,54,43,0.42)] transition hover:scale-[1.02] disabled:opacity-70"
          >
            {spinning ? "..." : "Spin"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {choices.map((choice, index) => (
          <div
            key={choice.id}
            className={`rounded-[18px] border px-4 py-3 ${
              selected?.id === choice.id || selectedIndex === index
                ? "border-orange-300 bg-orange-50"
                : "border-[#eee7dc] bg-white"
            }`}
          >
            <p className="text-[11px] font-black uppercase text-stone-400">
              {choice.kind}
            </p>
            <p className="mt-1 text-sm font-black text-stone-950">{choice.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const RestaurantDuelGame = ({ restaurants, onComplete }) => {
  const contestants = useMemo(() => restaurants.slice(0, 12), [restaurants]);
  const totalRounds = Math.min(5, Math.max(1, contestants.length - 1));
  const [round, setRound] = useState(0);
  const [winner, setWinner] = useState(null);

  const pair = useMemo(() => {
    if (contestants.length < 2) return [];
    const left = winner || contestants[(round * 2) % contestants.length];
    const right = contestants[(round * 2 + 1) % contestants.length];
    return left?._id === right?._id
      ? [left, contestants[(round * 2 + 2) % contestants.length]]
      : [left, right];
  }, [contestants, round, winner]);

  const chooseWinner = (restaurant) => {
    const nextRound = round + 1;
    setWinner(restaurant);
    if (nextRound >= totalRounds) {
      onComplete({
        score: Math.min(
          100,
          60 + totalRounds * 6 + Math.floor(getRestaurantScore(restaurant) / 18)
        ),
        title: restaurant.name,
        restaurant,
        meta: { winner: restaurant.name, rounds: totalRounds },
      });
      return;
    }
    setRound(nextRound);
  };

  if (contestants.length < 2) {
    return (
      <EmptyGame
        title="Need at least two restaurants"
        description="The duel opens once two restaurants are live nearby."
      />
    );
  }

  return (
    <div className="space-y-5">
      <GameInstructions
        steps={[
          metric("Round", `${Math.min(round + 1, totalRounds)} of ${totalRounds}`),
          metric("Choose", "One"),
          metric("Winner", winner?.name || "TBD"),
        ]}
      />

      <div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${((round + 1) / totalRounds) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr,auto,1fr] md:items-center">
        <RestaurantOption restaurant={pair[0]} onClick={() => chooseWinner(pair[0])} />
        <div className="rounded-full bg-stone-950 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
          Pick one
        </div>
        <RestaurantOption restaurant={pair[1]} onClick={() => chooseWinner(pair[1])} />
      </div>

      {winner ? (
        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
          Current winner: {winner.name}
        </div>
      ) : null}
    </div>
  );
};

const buildMemoryCards = (restaurants, popularDishes) => {
  const dishSources = popularDishes
    .filter((dish) => dish.name)
    .map((dish) => ({ id: `dish-${dish._id}`, label: dish.name }));
  const restaurantSources = restaurants.map((restaurant) => ({
    id: `restaurant-${restaurant._id}`,
    label: restaurant.name,
  }));

  return shuffle([...dishSources, ...restaurantSources])
    .slice(0, 6)
    .flatMap((item) => [
      { id: `${item.id}-a`, pairId: item.id, label: item.label, flipped: false, matched: false },
      { id: `${item.id}-b`, pairId: item.id, label: item.label, flipped: false, matched: false },
    ]);
};

const FoodMemoryGame = ({ restaurants, popularDishes, onComplete }) => {
  const [cards, setCards] = useState(() =>
    shuffle(buildMemoryCards(restaurants, popularDishes))
  );
  const [flipped, setFlipped] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!started || completed) return undefined;
    const intervalId = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [completed, started]);

  const flipCard = (cardId) => {
    if (completed || flipped.length >= 2) return;
    const card = cards.find((item) => item.id === cardId);
    if (!card || card.flipped || card.matched) return;

    if (!started) setStarted(true);

    const nextFlipped = [...flipped, cardId];
    setCards((current) =>
      current.map((item) => (item.id === cardId ? { ...item, flipped: true } : item))
    );
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      const [firstId, secondId] = nextFlipped;
      const firstCard = cards.find((item) => item.id === firstId);
      const secondCard = cards.find((item) => item.id === secondId);
      const isMatch = firstCard?.pairId === secondCard?.pairId;
      const nextMatchedCount = isMatch
        ? cards.filter((item) => item.matched).length + 2
        : 0;

      window.setTimeout(() => {
        setCards((current) =>
          current.map((item) => {
            if (item.id !== firstId && item.id !== secondId) return item;
            return isMatch
              ? { ...item, matched: true }
              : { ...item, flipped: false };
          })
        );
        setFlipped([]);

        if (isMatch && nextMatchedCount === cards.length) {
          setCompleted(true);
          onComplete({
            score: Math.max(45, 132 - nextMoves * 6 - seconds * 2),
            title: "Memory cleared",
            restaurant: restaurants[0],
            meta: { moves: nextMoves, seconds },
          });
        }
      }, isMatch ? 320 : 700);
    }
  };

  if (cards.length < 6) {
    return (
      <EmptyGame
        title="Need more menu signals"
        description="Memory uses live restaurant and dish names, so it unlocks with a fuller feed."
      />
    );
  }

  return (
    <div className="space-y-5">
      <GameInstructions
        steps={[
          metric("Moves", moves),
          metric("Time", `${seconds}s`),
          metric("Goal", "Pairs"),
        ]}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => flipCard(card.id)}
            className={[
              "flex aspect-[1.4] items-center justify-center rounded-[18px] border px-3 text-center text-sm font-black transition",
              card.flipped || card.matched
                ? "border-blue-200 bg-white text-stone-950"
                : "border-blue-200 bg-blue-600 text-white hover:bg-blue-700",
              card.matched ? "opacity-60" : "",
            ].join(" ")}
          >
            <span className="line-clamp-2">
              {card.flipped || card.matched ? card.label : "NearBites"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const buildQuizQuestions = (restaurants) =>
  restaurants.slice(0, 10).reduce((questions, restaurant, index, source) => {
    const other = source[(index + 1) % source.length];
    if (!other || restaurant._id === other._id) return questions;

    const askFastest = index % 2 === 0;
    questions.push({
      id: `${restaurant._id}-${other._id}-${index}`,
      prompt: askFastest ? "Which one reaches you faster?" : "Which one is rated higher?",
      left: restaurant,
      right: other,
      answerId: askFastest
        ? Number(restaurant.deliveryTime || 999) <= Number(other.deliveryTime || 999)
          ? restaurant._id
          : other._id
        : Number(restaurant.rating || 0) >= Number(other.rating || 0)
        ? restaurant._id
        : other._id,
    });

    return questions;
  }, []);

const SpeedQuizGame = ({ restaurants, onComplete }) => {
  const questions = useMemo(() => buildQuizQuestions(restaurants), [restaurants]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const total = Math.min(5, questions.length);

  const answer = (restaurant) => {
    const question = questions[index];
    const nextCorrect = correct + (question.answerId === restaurant._id ? 1 : 0);
    const nextIndex = index + 1;

    if (nextIndex >= total) {
      const recommended = restaurants
        .slice()
        .sort((left, right) => getRestaurantScore(right) - getRestaurantScore(left))[0];
      onComplete({
        score: Math.max(35, nextCorrect * 20),
        title: `${nextCorrect}/${total} correct`,
        restaurant: recommended,
        meta: { correct: nextCorrect, total },
      });
      return;
    }

    setCorrect(nextCorrect);
    setIndex(nextIndex);
  };

  if (questions.length < 2) {
    return (
      <EmptyGame
        title="Need more live restaurants"
        description="Quiz needs real restaurant comparisons to start."
      />
    );
  }

  const question = questions[index];

  return (
    <div className="space-y-5">
      <GameInstructions
        steps={[
          metric("Question", `${index + 1}/${total}`),
          metric("Correct", correct),
          metric("Rule", "Fast pick"),
        ]}
      />
      <div className="rounded-[22px] border border-violet-100 bg-violet-50 p-4">
        <p className="text-sm font-black text-violet-700">{question.prompt}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <RestaurantOption restaurant={question.left} onClick={() => answer(question.left)} />
        <RestaurantOption restaurant={question.right} onClick={() => answer(question.right)} />
      </div>
    </div>
  );
};

const buildPriceRounds = (restaurants) => {
  const priced = restaurants.filter((restaurant) => Number(restaurant.minimumItemPrice || 0) > 0);
  return shuffle(priced).slice(0, 8).reduce((rounds, restaurant, index, source) => {
    const others = source.filter((item) => item._id !== restaurant._id);
    const optionPool = chooseRandom(others, 2);
    if (optionPool.length < 2) return rounds;
    const options = shuffle([restaurant, ...optionPool]);
    const targetBudget = Math.max(
      Number(restaurant.minimumItemPrice || 0),
      Number(restaurant.minimumItemPrice || 0) + 60
    );
    const affordable = options.filter(
      (item) => Number(item.minimumItemPrice || Number.MAX_SAFE_INTEGER) <= targetBudget
    );
    const answer = affordable.sort(
      (left, right) =>
        Number(right.rating || 0) - Number(left.rating || 0) ||
        Number(left.minimumItemPrice || 0) - Number(right.minimumItemPrice || 0)
    )[0];

    if (!answer) return rounds;

    rounds.push({
      id: `${restaurant._id}-${index}`,
      budget: targetBudget,
      options,
      answerId: answer._id,
    });
    return rounds;
  }, []);
};

const PriceHuntGame = ({ restaurants, onComplete }) => {
  const rounds = useMemo(() => buildPriceRounds(restaurants), [restaurants]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const total = Math.min(4, rounds.length);

  const answer = (restaurant) => {
    const round = rounds[index];
    const nextCorrect = correct + (round.answerId === restaurant._id ? 1 : 0);
    const nextIndex = index + 1;

    if (nextIndex >= total) {
      const winner = round.options.find((item) => item._id === round.answerId) || restaurant;
      onComplete({
        score: 40 + nextCorrect * 15,
        title: `${nextCorrect}/${total} smart picks`,
        restaurant: winner,
        meta: { correct: nextCorrect, total },
      });
      return;
    }

    setCorrect(nextCorrect);
    setIndex(nextIndex);
  };

  if (rounds.length < 2) {
    return (
      <EmptyGame
        title="Need live pricing"
        description="Price Hunt needs restaurants with visible starting prices."
      />
    );
  }

  const round = rounds[index];

  return (
    <div className="space-y-5">
      <GameInstructions
        steps={[
          metric("Round", `${index + 1}/${total}`),
          metric("Target", `Under ${formatCurrency(round.budget)}`),
          metric("Rule", "Best rated"),
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {round.options.map((restaurant) => (
          <RestaurantOption
            key={restaurant._id}
            restaurant={restaurant}
            onClick={() => answer(restaurant)}
            badge={formatCurrency(restaurant.minimumItemPrice || 0)}
          />
        ))}
      </div>
    </div>
  );
};

const buildCuisineRounds = (restaurants) => {
  const valid = restaurants.filter(
    (restaurant) => restaurant.category || (restaurant.cuisineType || []).length > 0
  );

  return shuffle(valid).slice(0, 10).reduce((rounds, restaurant, index, source) => {
    const labels = [restaurant.category, ...(restaurant.cuisineType || [])].filter(Boolean);
    if (!labels.length) return rounds;
    const answerLabel = labels[0];
    const distractors = source.filter((item) => {
      const pool = [item.category, ...(item.cuisineType || [])]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return item._id !== restaurant._id && !pool.includes(answerLabel.toLowerCase());
    });
    const options = shuffle([restaurant, ...chooseRandom(distractors, 2)]);
    if (options.length < 3) return rounds;
    rounds.push({
      id: `${restaurant._id}-${index}`,
      label: answerLabel,
      answerId: restaurant._id,
      options,
    });
    return rounds;
  }, []);
};

const CuisineMatchGame = ({ restaurants, onComplete }) => {
  const rounds = useMemo(() => buildCuisineRounds(restaurants), [restaurants]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const total = Math.min(4, rounds.length);

  const answer = (restaurant) => {
    const round = rounds[index];
    const nextCorrect = correct + (round.answerId === restaurant._id ? 1 : 0);
    const nextIndex = index + 1;

    if (nextIndex >= total) {
      const winner = round.options.find((item) => item._id === round.answerId) || restaurant;
      onComplete({
        score: 42 + nextCorrect * 14,
        title: `${nextCorrect}/${total} matched`,
        restaurant: winner,
        meta: { correct: nextCorrect, total, label: round.label },
      });
      return;
    }

    setCorrect(nextCorrect);
    setIndex(nextIndex);
  };

  if (rounds.length < 2) {
    return (
      <EmptyGame
        title="Cuisine Match needs more variety"
        description="Once the feed has a few cuisine tags, this game comes alive."
      />
    );
  }

  const round = rounds[index];

  return (
    <div className="space-y-5">
      <GameInstructions
        steps={[
          metric("Round", `${index + 1}/${total}`),
          metric("Find", round.label),
          metric("Rule", "True match"),
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {round.options.map((restaurant) => (
          <RestaurantOption
            key={restaurant._id}
            restaurant={restaurant}
            onClick={() => answer(restaurant)}
          />
        ))}
      </div>
    </div>
  );
};

const buildEtaRounds = (restaurants) =>
  shuffle(restaurants)
    .slice(0, 12)
    .reduce((rounds, restaurant, index, source) => {
      const others = source.filter((item) => item._id !== restaurant._id);
      const options = shuffle([restaurant, ...chooseRandom(others, 2)]);
      if (options.length < 3) return rounds;
      const answer = options.sort(
        (left, right) =>
          Number(left.deliveryTime || 999) - Number(right.deliveryTime || 999) ||
          Number(right.rating || 0) - Number(left.rating || 0)
      )[0];
      rounds.push({
        id: `${restaurant._id}-${index}`,
        answerId: answer._id,
        options,
      });
      return rounds;
    }, []);

const EtaRushGame = ({ restaurants, onComplete }) => {
  const rounds = useMemo(() => buildEtaRounds(restaurants), [restaurants]);
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(8);
  const [correct, setCorrect] = useState(0);
  const total = Math.min(4, rounds.length);

  useEffect(() => {
    if (rounds.length === 0) return undefined;

    const intervalId = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current > 1) {
          return current - 1;
        }

        setIndex((previousIndex) => {
          const nextIndex = previousIndex + 1;
          if (nextIndex >= total) {
            const round = rounds[previousIndex];
            const winner = round.options.find((item) => item._id === round.answerId);
            onComplete({
              score: 36 + correct * 16,
              title: `${correct}/${total} rush picks`,
              restaurant: winner,
              meta: { correct, total },
            });
            return previousIndex;
          }
          return nextIndex;
        });

        return 8;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [correct, onComplete, rounds, total]);

  const answer = (restaurant) => {
    const round = rounds[index];
    const nextCorrect = correct + (round.answerId === restaurant._id ? 1 : 0);
    const nextIndex = index + 1;

    if (nextIndex >= total) {
      const winner = round.options.find((item) => item._id === round.answerId) || restaurant;
      onComplete({
        score: 36 + nextCorrect * 16 + secondsLeft * 2,
        title: `${nextCorrect}/${total} rush picks`,
        restaurant: winner,
        meta: { correct: nextCorrect, total, timeLeft: secondsLeft },
      });
      return;
    }

    setCorrect(nextCorrect);
    setIndex(nextIndex);
    setSecondsLeft(8);
  };

  if (rounds.length < 2) {
    return (
      <EmptyGame
        title="ETA Rush needs more restaurants"
        description="The rush starts when a few live restaurants are available."
      />
    );
  }

  const round = rounds[index];

  return (
    <div className="space-y-5">
      <GameInstructions
        steps={[
          metric("Round", `${index + 1}/${total}`),
          metric("Timer", `${secondsLeft}s`),
          metric("Rule", "Fastest"),
        ]}
      />
      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all"
          style={{ width: `${(secondsLeft / 8) * 100}%` }}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {round.options.map((restaurant) => (
          <RestaurantOption
            key={restaurant._id}
            restaurant={restaurant}
            onClick={() => answer(restaurant)}
            badge={`${restaurant.deliveryTime || 30} min`}
          />
        ))}
      </div>
    </div>
  );
};

const createCricketState = () => ({
  innings: 0,
  balls: 0,
  scores: [0, 0],
  target: null,
  pendingBatPick: null,
  phase: "bat-select",
  log: [],
  lastBall: null,
  complete: false,
});

const HandCricketGame = ({ restaurants, onComplete }) => {
  const [mode, setMode] = useState("bot");
  const [game, setGame] = useState(createCricketState);
  const players = mode === "bot" ? ["You", "Bot"] : ["Player 1", "Player 2"];
  const battingIndex = game.innings;
  const bowlingIndex = game.innings === 0 ? 1 : 0;
  const battingName = players[battingIndex];
  const bowlingName = players[bowlingIndex];
  const chasing = game.innings === 1;
  const targetLabel = chasing ? game.target || game.scores[0] + 1 : null;
  const remaining = chasing ? Math.max(0, (targetLabel || 0) - game.scores[1]) : null;

  const startMatch = (nextMode) => {
    setMode(nextMode);
    setGame(createCricketState());
  };

  const finishMatch = (nextScores, meta = {}) => {
    const winnerIndex =
      nextScores[0] === nextScores[1] ? -1 : nextScores[0] > nextScores[1] ? 0 : 1;
    const maxRuns = Math.max(...nextScores);
    const closeBonus = Math.max(0, 18 - Math.abs(nextScores[0] - nextScores[1]) * 2);
    const matchScore = Math.max(
      38,
      Math.min(100, maxRuns * 3 + closeBonus + (mode === "friend" ? 10 : 6))
    );
    const winnerLabel = winnerIndex === -1 ? "Match tied" : `${players[winnerIndex]} won`;

    setGame((current) => ({
      ...current,
      complete: true,
      scores: nextScores,
      lastBall: {
        title: winnerLabel,
        detail: `${nextScores[0]} - ${nextScores[1]}`,
      },
    }));

    onComplete({
      score: matchScore,
      title: `${winnerLabel} ${nextScores[0]}-${nextScores[1]}`,
      restaurant: pickResultRestaurant(restaurants, nextScores[0] + nextScores[1]),
      meta: {
        mode,
        innings1: nextScores[0],
        innings2: nextScores[1],
        winner: winnerIndex === -1 ? "tie" : players[winnerIndex],
        ...meta,
      },
    });
  };

  const resolveDelivery = ({ batterPick, bowlerPick }) => {
    const nextScores = [...game.scores];
    const ballNumber = game.balls + 1;
    const isOut = batterPick === bowlerPick;
    if (!isOut) {
      nextScores[battingIndex] += batterPick;
    }

    const nextLog = [
      {
        id: `${game.innings}-${ballNumber}-${batterPick}-${bowlerPick}`,
        batter: battingName,
        bowler: bowlingName,
        batterPick,
        bowlerPick,
        isOut,
        total: nextScores[battingIndex],
      },
      ...game.log,
    ].slice(0, 8);

    if (chasing && nextScores[1] >= (game.target || game.scores[0] + 1)) {
      finishMatch(nextScores, { chase: true, ball: ballNumber });
      return;
    }

    if (isOut || ballNumber >= 6) {
      if (!chasing) {
        setGame({
          innings: 1,
          balls: 0,
          scores: nextScores,
          target: nextScores[0] + 1,
          pendingBatPick: null,
          phase: "bat-select",
          log: nextLog,
          complete: false,
          lastBall: {
            title: isOut ? `${battingName} out` : `${battingName} finished`,
            detail: `${players[1]} need ${nextScores[0] + 1}`,
          },
        });
        return;
      }

      finishMatch(nextScores, { out: isOut, ball: ballNumber });
      return;
    }

    setGame((current) => ({
      ...current,
      balls: ballNumber,
      scores: nextScores,
      pendingBatPick: null,
      phase: "bat-select",
      log: nextLog,
      lastBall: {
        title: isOut ? `${battingName} out` : `${battingName} +${batterPick}`,
        detail: `${batterPick} vs ${bowlerPick}`,
      },
    }));
  };

  const playNumber = (value) => {
    if (game.complete) return;

    if (mode === "bot") {
      const botPick = getRandomNumber();
      if (battingIndex === 0) {
        resolveDelivery({ batterPick: value, bowlerPick: botPick });
      } else {
        resolveDelivery({ batterPick: botPick, bowlerPick: value });
      }
      return;
    }

    if (game.phase === "bat-select") {
      setGame((current) => ({
        ...current,
        pendingBatPick: value,
        phase: "bowl-select",
      }));
      return;
    }

    resolveDelivery({
      batterPick: game.pendingBatPick || value,
      bowlerPick: value,
    });
  };

  const prompt =
    mode === "bot"
      ? battingIndex === 0
        ? "Pick your batting run"
        : "Pick your bowling number"
      : game.phase === "bat-select"
      ? `${battingName} bats`
      : `${bowlingName} bowls`;

  return (
    <div className="space-y-5">
      <GameInstructions
        steps={[
          metric("Mode", mode === "bot" ? "Bot" : "2P"),
          metric("Balls left", Math.max(0, 6 - game.balls)),
          metric("Target", targetLabel || "Set score"),
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {[
          { key: "bot", label: "Play Bot" },
          { key: "friend", label: "Play Friend" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => startMatch(item.key)}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              mode === item.key
                ? "bg-lime-600 text-white shadow-[0_18px_28px_-20px_rgba(132,204,22,0.9)]"
                : "border border-lime-200 bg-lime-50 text-lime-800 hover:bg-lime-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-[26px] border border-lime-200 bg-[linear-gradient(135deg,#f7fee7,#ecfccb_55%,#dcfce7)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-lime-700">
                Hand cricket
              </p>
              <h3 className="mt-2 text-3xl font-black text-stone-950">
                {game.lastBall?.title || prompt}
              </h3>
              <p className="mt-2 text-sm font-semibold text-stone-600">
                {game.phase === "bowl-select" && mode === "friend"
                  ? "Batter choice stored. Pass for the bowl pick."
                  : chasing && remaining !== null
                  ? `${battingName} need ${remaining} more`
                  : `${battingName} batting now`}
              </p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-lime-800">
              Innings {game.innings + 1}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {players.map((name, index) => {
              const active = battingIndex === index && !game.complete;
              return (
                <div
                  key={name}
                  className={`rounded-[22px] border px-4 py-4 ${
                    active
                      ? "border-lime-300 bg-white shadow-[0_18px_35px_-26px_rgba(132,204,22,0.7)]"
                      : "border-white/70 bg-white/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-stone-950">{name}</p>
                    <span className="rounded-full bg-lime-100 px-2.5 py-1 text-[10px] font-black uppercase text-lime-800">
                      {active ? "Batting" : "Waiting"}
                    </span>
                  </div>
                  <p className="mt-3 text-4xl font-black text-lime-700">
                    {game.scores[index]}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {BALL_CHOICES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => playNumber(value)}
                disabled={game.complete}
                className="rounded-[20px] border border-lime-200 bg-white px-4 py-4 text-2xl font-black text-lime-700 transition hover:-translate-y-0.5 hover:bg-lime-50 disabled:opacity-50"
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[24px] border border-[#eee7dc] bg-[#fcfbf8] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">
              Last ball
            </p>
            <p className="mt-2 text-xl font-black text-stone-950">
              {game.lastBall?.detail || "Start the first ball"}
            </p>
          </div>
          <div className="rounded-[24px] border border-[#eee7dc] bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">
              Ball log
            </p>
            <div className="mt-4 space-y-2">
              {game.log.length > 0 ? (
                game.log.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-[18px] border border-stone-100 bg-[#fafaf8] px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-black text-stone-950">
                        {entry.batterPick} vs {entry.bowlerPick}
                      </p>
                      <p className="text-xs font-bold text-stone-500">
                        {entry.batter} total {entry.total}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                        entry.isOut ? "bg-rose-100 text-rose-700" : "bg-lime-100 text-lime-800"
                      }`}
                    >
                      {entry.isOut ? "Out" : `+${entry.batterPick}`}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-[#eadfce] bg-[#fffaf3] p-4 text-sm font-bold text-stone-500">
                  First ball is waiting.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SnakesSprintGame = ({ restaurants, onComplete }) => {
  const [positions, setPositions] = useState([1, 1]);
  const [rolls, setRolls] = useState([0, 0]);
  const [turn, setTurn] = useState(0);
  const [lastMove, setLastMove] = useState(null);
  const [diceRoll, setDiceRoll] = useState(1);
  const [diceRolling, setDiceRolling] = useState(false);
  const [finished, setFinished] = useState(false);
  const board = useMemo(() => Array.from({ length: 30 }, (_, index) => 30 - index), []);
  const players = ["You", "Bot"];

  const finishRace = (nextPositions, nextRolls, winnerIndex, move) => {
    const score = Math.max(
      winnerIndex === 0 ? 56 : 34,
      Math.min(100, 84 - nextRolls[0] * 4 + nextPositions[0])
    );

    setPositions(nextPositions);
    setRolls(nextRolls);
    setLastMove(move);
    setFinished(true);

    onComplete({
      score,
      title:
        winnerIndex === 0
          ? `You reached 30 in ${nextRolls[0]} rolls`
          : `Bot reached 30 first`,
      restaurant: pickResultRestaurant(restaurants, nextPositions[0] + nextPositions[1]),
      meta: {
        player: nextPositions[0],
        bot: nextPositions[1],
        rollsYou: nextRolls[0],
        rollsBot: nextRolls[1],
        winner: players[winnerIndex],
      },
    });
  };

  const takeTurn = (playerIndex) => {
    if (finished) return;

    const roll = getRandomNumber();
    setDiceRoll(roll);
    setDiceRolling(true);
    window.setTimeout(() => setDiceRolling(false), 560);

    const nextPositions = [...positions];
    const nextRolls = [...rolls];
    const move = resolveBoardMove(nextPositions[playerIndex], roll);
    nextPositions[playerIndex] = move.next;
    nextRolls[playerIndex] += 1;

    const summary = {
      player: players[playerIndex],
      roll,
      ...move,
      next: nextPositions[playerIndex],
    };

    if (nextPositions[playerIndex] >= 30) {
      finishRace(nextPositions, nextRolls, playerIndex, summary);
      return;
    }

    setPositions(nextPositions);
    setRolls(nextRolls);
    setLastMove(summary);
    setTurn(playerIndex === 0 ? 1 : 0);
  };

  useEffect(() => {
    if (finished || turn !== 1) return undefined;
    const timeoutId = window.setTimeout(() => takeTurn(1), 900);
    return () => window.clearTimeout(timeoutId);
  }, [finished, turn, positions, rolls]);

  return (
    <div className="space-y-5">
      <GameInstructions
        steps={[
          metric("You", positions[0]),
          metric("Bot", positions[1]),
          metric("Turn", finished ? "Done" : players[turn]),
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-[22px] border border-fuchsia-200 bg-[linear-gradient(135deg,#fdf4ff,#fae8ff_55%,#fce7f3)] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase text-fuchsia-700">
                Snakes Sprint
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="nb-dice-scene h-16 w-16">
                <div className={`nb-food-die ${diceRolling ? "nb-food-die-rolling" : ""}`}>
                  {getFoodDieFace(diceRoll)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => takeTurn(0)}
                disabled={turn !== 0 || finished}
                className="rounded-[14px] bg-fuchsia-600 px-4 py-3 text-sm font-black text-white transition hover:bg-fuchsia-700 disabled:opacity-50"
              >
                {finished ? "Finished" : turn === 0 ? "Roll dice" : "Bot rolling"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {board.map((cell) => {
              const hasYou = positions[0] === cell;
              const hasBot = positions[1] === cell;
              const isSnake = SNAKES[cell];
              const isLadder = LADDERS[cell];

              return (
                <div
                  key={cell}
                  className={`min-h-[72px] rounded-[18px] border px-2 py-2 ${
                    hasYou || hasBot
                      ? "border-fuchsia-300 bg-white shadow-[0_16px_28px_-22px_rgba(192,38,211,0.55)]"
                      : isSnake
                      ? "border-rose-200 bg-rose-50"
                      : isLadder
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-white/80 bg-white/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-stone-600">{cell}</span>
                    <span className="text-[10px] font-black uppercase text-stone-400">
                      {isSnake ? "Snake" : isLadder ? "Ladder" : ""}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {hasYou ? (
                      <span className="rounded-full bg-fuchsia-600 px-2 py-1 text-[10px] font-black text-white">
                        You
                      </span>
                    ) : null}
                    {hasBot ? (
                      <span className="rounded-full bg-stone-950 px-2 py-1 text-[10px] font-black text-white">
                        Bot
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[24px] border border-[#eee7dc] bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">
              Last move
            </p>
            <p className="mt-2 text-xl font-black text-stone-950">
              {lastMove ? `${lastMove.player} rolled ${getFoodDieFace(lastMove.roll)}` : "Start the race"}
            </p>
            <p className="mt-2 text-sm font-semibold text-stone-500">
              {lastMove?.event === "snake"
                ? `Snake down to ${lastMove.next}`
                : lastMove?.event === "ladder"
                ? `Ladder up to ${lastMove.next}`
                : lastMove
                ? `Now on ${lastMove.next}`
                : "First to 30 wins."}
            </p>
          </div>
          <div className="rounded-[24px] border border-[#eee7dc] bg-[#fcfbf8] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">
              Race stats
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {players.map((name, index) => (
                <div key={name} className="rounded-[18px] border border-stone-100 bg-white px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-stone-400">
                    {name}
                  </p>
                  <p className="mt-1 text-2xl font-black text-fuchsia-700">{positions[index]}</p>
                  <p className="text-xs font-bold text-stone-500">{rolls[index]} rolls</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const buildSnackSnapRounds = (restaurants, popularDishes) => {
  const dishPool = popularDishes
    .filter((dish) => dish?.name)
    .map((dish) => ({
      id: `dish-${dish._id}`,
      label: dish.name,
      kind: "Dish",
      restaurant: dish.restaurant,
    }));

  const restaurantPool = restaurants.map((restaurant) => ({
    id: `restaurant-${restaurant._id}`,
    label: restaurant.name,
    kind: "Restaurant",
    restaurant,
  }));

  return shuffle([...dishPool, ...restaurantPool]).reduce((rounds, item, index, pool) => {
    const distractors = chooseRandom(
      pool.filter(
        (option) =>
          option.id !== item.id &&
          option.label.toLowerCase() !== item.label.toLowerCase()
      ),
      3
    );
    if (distractors.length < 3) return rounds;

    rounds.push({
      id: `${item.id}-${index}`,
      target: item,
      options: shuffle([item, ...distractors]),
    });
    return rounds;
  }, []);
};

const SnackSnapGame = ({ restaurants, popularDishes, onComplete }) => {
  const rounds = useMemo(
    () => buildSnackSnapRounds(restaurants, popularDishes).slice(0, 6),
    [popularDishes, restaurants]
  );
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(7);
  const [lastAction, setLastAction] = useState(null);
  const [completed, setCompleted] = useState(false);
  const total = rounds.length;

  const advanceRound = (isCorrect, choice = null, timedOut = false) => {
    if (completed) return;
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    const nextStreak = isCorrect ? streak + 1 : 0;
    const nextMaxStreak = Math.max(maxStreak, nextStreak);
    const nextIndex = index + 1;
    const activeRound = rounds[index];

    if (nextIndex >= total) {
      setCompleted(true);
      setLastAction({
        ok: isCorrect,
        label: choice?.label || activeRound?.target?.label || "Miss",
        timedOut,
      });
      onComplete({
        score: Math.max(
          34,
          Math.min(100, 28 + nextCorrect * 14 + nextMaxStreak * 6 + secondsLeft * 2)
        ),
        title: `${nextCorrect}/${total} snapped`,
        restaurant:
          activeRound?.target?.restaurant || pickResultRestaurant(restaurants, nextCorrect),
        meta: {
          correct: nextCorrect,
          total,
          maxStreak: nextMaxStreak,
          timedOut,
        },
      });
      return;
    }

    setCorrect(nextCorrect);
    setStreak(nextStreak);
    setMaxStreak(nextMaxStreak);
    setIndex(nextIndex);
    setSecondsLeft(7);
    setLastAction({
      ok: isCorrect,
      label: choice?.label || activeRound?.target?.label || "Miss",
      timedOut,
    });
  };

  useEffect(() => {
    if (!rounds.length || completed) return undefined;
    const timeoutId = window.setTimeout(() => {
      if (secondsLeft <= 1) {
        advanceRound(false, null, true);
      } else {
        setSecondsLeft((current) => current - 1);
      }
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [advanceRound, completed, rounds.length, secondsLeft]);

  if (rounds.length < 3) {
    return (
      <EmptyGame
        title="Snack Snap needs more live names"
        description="Load a few dishes or restaurants and the quick match rounds will appear."
      />
    );
  }

  const round = rounds[index];

  return (
    <div className="space-y-5">
      <GameInstructions
        steps={[
          metric("Round", `${index + 1}/${total}`),
          metric("Streak", maxStreak),
          metric("Timer", `${secondsLeft}s`),
        ]}
      />

      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-teal-500 transition-all"
          style={{ width: `${(secondsLeft / 7) * 100}%` }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.92fr,1.08fr]">
        <div className="rounded-[26px] border border-teal-200 bg-[linear-gradient(135deg,#f0fdfa,#ccfbf1_55%,#ecfeff)] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-teal-700">
            Target
          </p>
          <h3 className="mt-3 text-3xl font-black text-stone-950">{round.target.label}</h3>
          <div className="mt-4 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-black text-teal-700">
            {round.target.kind}
          </div>
          <p className="mt-4 text-sm font-semibold text-stone-600">
            Tap the exact same card before the bar drops.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {round.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => advanceRound(option.id === round.target.id, option, false)}
              disabled={completed}
              className="rounded-[22px] border border-teal-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-32px_rgba(13,148,136,0.5)]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-teal-600">
                {option.kind}
              </p>
              <p className="mt-2 text-lg font-black text-stone-950">{option.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[22px] border border-[#eee7dc] bg-[#fcfbf8] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">
              Last tap
            </p>
            <p className="mt-1 text-sm font-black text-stone-950">
              {lastAction
                ? lastAction.timedOut
                  ? "Round timed out"
                  : lastAction.label
                : "First tap starts now"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${
              lastAction?.ok
                ? "bg-teal-100 text-teal-700"
                : "bg-stone-200 text-stone-700"
            }`}
          >
            {lastAction ? (lastAction.ok ? "Snap" : "Miss") : `${correct} correct`}
          </span>
        </div>
      </div>
    </div>
  );
};

const buildArcadeItems = (restaurants, popularDishes) => {
  const dishItems = popularDishes
    .filter((dish) => dish?.name)
    .map((dish) => ({
      id: `dish-${dish._id}`,
      label: dish.name,
      kind: "Dish",
      restaurant: dish.restaurant,
    }));

  const restaurantItems = restaurants.map((restaurant) => ({
    id: `restaurant-${restaurant._id}`,
    label: restaurant.name,
    kind: "Restaurant",
    restaurant,
  }));

  return shuffle([...dishItems, ...restaurantItems]);
};

const buildTrayShuffleRounds = (restaurants, popularDishes) =>
  buildArcadeItems(restaurants, popularDishes).reduce((rounds, target, index, pool) => {
    const distractors = chooseRandom(
      pool.filter((item) => item.id !== target.id),
      2
    );
    if (distractors.length < 2) return rounds;

    const options = shuffle([target, ...distractors]).map((option, optionIndex) => ({
      ...option,
      shell: TRAY_SHELLS[optionIndex % TRAY_SHELLS.length],
    }));

    rounds.push({
      id: `${target.id}-${index}`,
      targetId: target.id,
      targetLabel: target.label,
      targetKind: target.kind,
      options,
    });

    return rounds;
  }, []);

const TrayShuffleGame = ({ restaurants, popularDishes, onComplete }) => {
  const rounds = useMemo(
    () => buildTrayShuffleRounds(restaurants, popularDishes).slice(0, 5),
    [popularDishes, restaurants]
  );
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("preview");
  const [displayOptions, setDisplayOptions] = useState(rounds[0]?.options || []);
  const [correct, setCorrect] = useState(0);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [complete, setComplete] = useState(false);
  const total = rounds.length;

  useEffect(() => {
    if (!rounds.length || !rounds[index]) return undefined;

    const round = rounds[index];
    let shuffleCount = 0;
    let shuffleIntervalId;

    setPhase("preview");
    setLocked(true);
    setDisplayOptions(round.options);
    setFeedback(null);

    const previewTimeoutId = window.setTimeout(() => {
      setPhase("shuffle");
      shuffleIntervalId = window.setInterval(() => {
        shuffleCount += 1;
        setDisplayOptions((current) => shuffle(current));
        if (shuffleCount >= 6) {
          window.clearInterval(shuffleIntervalId);
          setPhase("pick");
          setLocked(false);
        }
      }, 220);
    }, 1100);

    return () => {
      window.clearTimeout(previewTimeoutId);
      if (shuffleIntervalId) {
        window.clearInterval(shuffleIntervalId);
      }
    };
  }, [index, rounds]);

  const chooseTray = (option) => {
    if (locked || phase !== "pick" || complete) return;

    const round = rounds[index];
    const isCorrect = option.id === round.targetId;
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    const nextIndex = index + 1;

    setLocked(true);
    setPhase("reveal");
    setFeedback({
      ok: isCorrect,
      pickedId: option.id,
      picked: option.label,
      target: round.targetLabel,
    });

    const moveNext = () => {
      setCorrect(nextCorrect);
      if (nextIndex >= total) {
        setComplete(true);
        onComplete({
          score: Math.max(38, Math.min(100, nextCorrect * 18 + 18)),
          title: `${nextCorrect}/${total} trays tracked`,
          restaurant:
            option.restaurant ||
            pickResultRestaurant(restaurants, nextCorrect + total),
          meta: {
            correct: nextCorrect,
            total,
          },
        });
        return;
      }

      setIndex(nextIndex);
    };

    window.setTimeout(moveNext, 850);
  };

  if (rounds.length < 3) {
    return (
      <EmptyGame
        title="Tray Shuffle needs more live names"
        description="Load a few dishes or restaurants and the shuffle round will open."
      />
    );
  }

  const round = rounds[index];

  return (
    <div className="space-y-5">
      <GameInstructions
        steps={[
          metric("Round", `${index + 1}/${total}`),
          metric("Hits", correct),
          metric(
            "Phase",
            phase === "preview"
              ? "Watch"
              : phase === "shuffle"
              ? "Track"
              : phase === "pick"
              ? "Tap"
              : "Reveal"
          ),
        ]}
      />

      <div className="rounded-[26px] border border-indigo-200 bg-[linear-gradient(135deg,#eef2ff,#e0e7ff_55%,#f5f3ff)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-indigo-700">
              Track this tray
            </p>
            <h3 className="mt-2 text-3xl font-black text-stone-950">
              {round.targetLabel}
            </h3>
          </div>
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-indigo-700">
            {round.targetKind}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {displayOptions.map((option) => {
          const showLabel = phase === "preview" || phase === "reveal";
          const isCorrect = feedback && option.id === round.targetId;
          const wasPicked = feedback && option.id === feedback.pickedId;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => chooseTray(option)}
              disabled={locked}
              className={`overflow-hidden rounded-[24px] border transition ${
                phase === "reveal" && isCorrect
                  ? "border-emerald-300 bg-emerald-50"
                  : phase === "reveal" && wasPicked
                  ? "border-rose-300 bg-rose-50"
                  : "border-[#eee7dc] bg-white"
              }`}
            >
              <div className={`h-24 bg-gradient-to-br ${option.shell.className} p-4 text-white`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                    Tray {option.shell.mark}
                  </span>
                  <span className="text-2xl font-black leading-none">
                    {showLabel ? option.kind.slice(0, 1) : "?"}
                  </span>
                </div>
              </div>
              <div className="p-4 text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">
                  {showLabel ? option.kind : phase === "pick" ? "Tracked tray" : "Shuffling"}
                </p>
                <p className="mt-2 text-base font-black text-stone-950">
                  {showLabel ? option.label : phase === "pick" ? "Tap the right tray" : "Keep watching"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[22px] border border-[#eee7dc] bg-[#fcfbf8] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">
              Shuffle note
            </p>
            <p className="mt-1 text-sm font-black text-stone-950">
              {feedback
                ? feedback.ok
                  ? "Tracked clean"
                  : `Missed ${feedback.target}`
                : phase === "preview"
                ? "Lock the tray in"
                : phase === "shuffle"
                ? "Do not blink"
                : "Pick the tray now"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${
              feedback?.ok ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
            }`}
          >
            {feedback ? (feedback.ok ? "Hit" : "Miss") : `${correct} hits`}
          </span>
        </div>
      </div>
    </div>
  );
};

const buildLuckyRounds = (restaurants, popularDishes) =>
  buildArcadeItems(restaurants, popularDishes)
    .slice(0, 5)
    .map((item, roundIndex) => ({
      id: `${item.id}-${roundIndex}`,
      item,
      lids: shuffle(LUCKY_LIDS).map((value, lidIndex) => ({
        id: `${item.id}-lid-${lidIndex}`,
        value,
        shell: TRAY_SHELLS[lidIndex % TRAY_SHELLS.length],
      })),
    }));

const LuckyTrayGame = ({ restaurants, popularDishes, onComplete }) => {
  const rounds = useMemo(
    () => buildLuckyRounds(restaurants, popularDishes),
    [popularDishes, restaurants]
  );
  const [index, setIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [revealedLidId, setRevealedLidId] = useState("");
  const [lastOpen, setLastOpen] = useState(null);
  const [complete, setComplete] = useState(false);
  const total = rounds.length;

  const openLid = (lid) => {
    if (revealedLidId || complete) return;

    const round = rounds[index];
    const nextTotal = totalScore + lid.value;
    const nextStreak = lid.value > 0 ? streak + 1 : 0;
    const nextIndex = index + 1;

    setRevealedLidId(lid.id);
    setLastOpen({
      value: lid.value,
      label: round.item.label,
      kind: round.item.kind,
    });

    window.setTimeout(() => {
      setTotalScore(nextTotal);
      setStreak(nextStreak);
      if (nextIndex >= total) {
        setComplete(true);
        onComplete({
          score: Math.max(34, Math.min(100, nextTotal * 4 + nextStreak * 5 + 14)),
          title: `${nextTotal} lucky points`,
          restaurant:
            round.item.restaurant ||
            pickResultRestaurant(restaurants, nextTotal + nextStreak),
          meta: {
            totalScore: nextTotal,
            streak: nextStreak,
            rounds: total,
          },
        });
        return;
      }

      setIndex(nextIndex);
      setRevealedLidId("");
    }, 900);
  };

  if (rounds.length < 3) {
    return (
      <EmptyGame
        title="Lucky Tray needs more live picks"
        description="Bring in a few restaurants or dishes and the lid game will appear."
      />
    );
  }

  const round = rounds[index];

  return (
    <div className="space-y-5">
      <GameInstructions
        steps={[
          metric("Round", `${index + 1}/${total}`),
          metric("Score", totalScore),
          metric("Streak", streak),
        ]}
      />

      <div className="rounded-[26px] border border-pink-200 bg-[linear-gradient(135deg,#fdf2f8,#fce7f3_55%,#fff1f2)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-pink-700">
              Lucky tray
            </p>
            <h3 className="mt-2 text-3xl font-black text-stone-950">
              {round.item.label}
            </h3>
          </div>
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-pink-700">
            {round.item.kind}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {round.lids.map((lid, lidIndex) => {
          const revealed = revealedLidId === lid.id;
          return (
            <button
              key={lid.id}
              type="button"
              onClick={() => openLid(lid)}
              disabled={Boolean(revealedLidId) || complete}
              className="overflow-hidden rounded-[24px] border border-pink-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_22px_46px_-34px_rgba(236,72,153,0.45)] disabled:opacity-80"
            >
              <div className={`h-24 bg-gradient-to-br ${lid.shell.className} p-4 text-white`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                    Lid {lidIndex + 1}
                  </span>
                  <span className="text-2xl font-black leading-none">
                    {revealed ? lid.value : lid.shell.mark}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">
                  {revealed ? (lid.value === 0 ? "Miss" : "Points") : "Tap to open"}
                </p>
                <p className="mt-2 text-base font-black text-stone-950">
                  {revealed ? (lid.value === 0 ? "No points" : `+${lid.value} points`) : "Hidden"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[22px] border border-[#eee7dc] bg-[#fcfbf8] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">
              Last open
            </p>
            <p className="mt-1 text-sm font-black text-stone-950">
              {lastOpen
                ? `${lastOpen.label} ${lastOpen.value === 0 ? "blanked" : `gave +${lastOpen.value}`}`
                : "Pick a lid"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${
              lastOpen?.value > 0 ? "bg-pink-100 text-pink-700" : "bg-stone-200 text-stone-700"
            }`}
          >
            {lastOpen ? lastOpen.kind : `${totalScore} total`}
          </span>
        </div>
      </div>
    </div>
  );
};

const renderGame = ({ key, props, resetKey }) => {
  const map = {
    "craving-spinner": CravingSpinnerGame,
    "restaurant-duel": RestaurantDuelGame,
    "food-memory": FoodMemoryGame,
    "burger-stack": SnackSnapGame,
    "pizza-catcher": SnackSnapGame,
    "fruit-slice": EtaRushGame,
    "guess-the-dish": CuisineMatchGame,
    "speed-quiz": SpeedQuizGame,
    "price-hunt": PriceHuntGame,
    "cuisine-match": CuisineMatchGame,
    "eta-rush": EtaRushGame,
    "hand-cricket": CricketMiniGame,
    "classic-hand-cricket": HandCricketGame,
    "snakes-sprint": SnakesSprintGame,
    "snack-snap": SnackSnapGame,
    "tray-shuffle": TrayShuffleGame,
    "lucky-tray": LuckyTrayGame,
  };

  const Component = map[key] || CravingSpinnerGame;
  return <Component key={`${key}-${resetKey}`} {...props} />;
};

const GameBootLoader = ({ title }) => (
  <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-[#e5dccf] bg-[#f4f1ec] text-center shadow-[inset_7px_7px_14px_rgba(139,120,96,0.14),inset_-7px_-7px_14px_rgba(255,255,255,0.92)]">
    <div className="relative h-20 w-20">
      <span className="absolute inset-0 rounded-[20px] border-4 border-orange-100" />
      <span className="absolute inset-0 animate-spin rounded-[20px] border-4 border-transparent border-t-orange-500" />
      <span className="absolute inset-5 rounded-[14px] bg-orange-500" />
    </div>
    <p className="mt-6 text-[11px] font-black uppercase text-orange-600">
      Loading game
    </p>
    <p className="mt-2 text-2xl font-black text-stone-950">{title}</p>
  </div>
);

const ScoreBurstLayer = ({ bursts }) => (
  <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
    {bursts.map((burst) => (
      <Motion.div
        key={burst.id}
        initial={{ opacity: 0, y: 24, scale: 0.65, rotate: -8 }}
        animate={{ opacity: [0, 1, 1, 0], y: [-4, -46, -86], scale: [0.65, 1.18, 1], rotate: 4 }}
        transition={{ duration: 1.05, ease: "easeOut" }}
        className={`absolute rounded-full px-5 py-2 text-3xl font-black ${burst.className}`}
        style={{ left: `${burst.x}%`, top: `${burst.y}%` }}
      >
        +{burst.value}
      </Motion.div>
    ))}
  </div>
);

const GameModeStyles = () => (
  <style>{`
    .nb-game-mode {
      background: #f6f3ee;
    }
    .nb-game-arena button {
      transform-origin: center;
    }
    .nb-game-arena button:active {
      transform: scale(0.96) !important;
    }
    .nb-neo-stat {
      background: #f4f1ec;
      border: 1px solid #e5dccf;
      box-shadow:
        inset 7px 7px 14px rgba(139, 120, 96, 0.14),
        inset -7px -7px 14px rgba(255, 255, 255, 0.92),
        0 1px 2px rgba(65, 54, 43, 0.05);
    }
    .nb-countdown-stat {
      background: #fff7ed;
      border-color: #fed7aa;
    }
    .nb-spinner-wheel {
      box-shadow:
        inset 8px 8px 18px rgba(139, 120, 96, 0.16),
        inset -8px -8px 18px rgba(255, 255, 255, 0.86),
        0 18px 36px -30px rgba(65, 54, 43, 0.42);
      transition: transform 0.9s cubic-bezier(0.19, 1, 0.22, 1);
    }
    .nb-dice-scene {
      perspective: 720px;
    }
    .nb-food-die {
      align-items: center;
      background: #fffaf3;
      border: 1px solid #eadfce;
      border-radius: 16px;
      box-shadow:
        inset 6px 6px 12px rgba(139, 120, 96, 0.16),
        inset -6px -6px 12px rgba(255, 255, 255, 0.9),
        0 16px 30px -24px rgba(65, 54, 43, 0.4);
      display: flex;
      font-size: 30px;
      height: 100%;
      justify-content: center;
      transform-style: preserve-3d;
      width: 100%;
    }
    .nb-food-die-rolling {
      animation: nb-food-die-roll 0.56s cubic-bezier(0.19, 1, 0.22, 1);
    }
    @keyframes nb-food-die-roll {
      0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
      52% { transform: rotateX(238deg) rotateY(204deg) rotateZ(18deg); }
      100% { transform: rotateX(360deg) rotateY(360deg) rotateZ(0deg); }
    }
  `}</style>
);

const ReactGamePlayPage = ({ routeGameKey }) => {
  const [searchParams] = useSearchParams();
  const { location, status: locationStatus, requestLocation } = useUserLocation();
  const { feed, loading: restaurantLoading, error: restaurantError, loadDiscovery } =
    useRestaurantDiscovery();

  const [gameFeed, setGameFeed] = useState({ games: [], rewards: [], myScores: [] });
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState("");
  const [activeGameKey, setActiveGameKey] = useState(routeGameKey || DEFAULT_GAME_KEY);
  const [leaderboard, setLeaderboard] = useState(null);
  const [_leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [claim, setClaim] = useState(null);
  const [claimError, setClaimError] = useState("");
  const [claimingTier, setClaimingTier] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [booting, setBooting] = useState(true);
  const [scoreBursts, setScoreBursts] = useState([]);
  const [shake, setShake] = useState(false);
  const { enabled: soundEnabled, setEnabled: setSoundEnabled, play: playSound } = useGameAudio();

  const orderId = searchParams.get("orderId");
  const postOrderMode = Boolean(orderId);
  const areaLabel = location?.city || "Nearby";

  const triggerShake = useCallback(() => {
    setShake(false);
    window.requestAnimationFrame(() => setShake(true));
    window.setTimeout(() => setShake(false), 260);
  }, []);

  const handleArenaPointerDown = useCallback(
    (event) => {
      if (!event.target.closest("button")) return;
      playSound("click");
      triggerShake();
    },
    [playSound, triggerShake]
  );

  const loadGamesFeed = useCallback(async () => {
    setGamesLoading(true);
    try {
      const query = new URLSearchParams({ area: areaLabel });
      const response = await api.get(`/games/feed?${query.toString()}`);
      setGameFeed(response.data || { games: [], rewards: [], myScores: [] });
      setGamesError("");
    } catch (apiError) {
      setGamesError(apiError.message || "Unable to load game rewards");
    } finally {
      setGamesLoading(false);
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
    loadGamesFeed();
  }, [loadGamesFeed]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    if (!routeGameKey) return undefined;

    setActiveGameKey(routeGameKey);
    setResult(null);
    setClaim(null);
    setClaimError("");
    setScoreBursts([]);
    setBooting(true);
    const timeoutId = window.setTimeout(() => setBooting(false), 650);
    return () => window.clearTimeout(timeoutId);
  }, [routeGameKey]);

  const restaurants = useMemo(
    () => (feed.restaurants || []).filter((restaurant) => restaurant?._id),
    [feed.restaurants]
  );
  const popularDishes = useMemo(
    () => (feed.popularDishes || []).filter((dish) => dish?.name),
    [feed.popularDishes]
  );
  const categories = useMemo(() => {
    const counts = new Map();
    for (const restaurant of restaurants) {
      if (restaurant.category) {
        counts.set(restaurant.category, (counts.get(restaurant.category) || 0) + 1);
      }
      for (const cuisine of restaurant.cuisineType || []) {
        if (cuisine) {
          counts.set(cuisine, (counts.get(cuisine) || 0) + 1);
        }
      }
    }
    return [
      { label: "All", count: restaurants.length },
      ...[...counts.entries()].map(([label, count]) => ({ label, count })),
    ];
  }, [restaurants]);

  const games = useMemo(
    () => (gameFeed.games || []).map(withGameTheme),
    [gameFeed.games]
  );
  const activeGame =
    games.find((game) => game.key === activeGameKey) ||
    withGameTheme({ key: activeGameKey });
  const tone = getGameTheme(activeGameKey);

  const activeRewards = useMemo(
    () =>
      (gameFeed.rewards || []).filter(
        (reward) => reward.gameKey === "any" || reward.gameKey === activeGameKey
      ),
    [activeGameKey, gameFeed.rewards]
  );

  const playReward = activeRewards.find((reward) => reward.gameRewardTier === "PLAY");
  const bestScore =
    leaderboard?.currentUser?.bestScore ||
    gameFeed.myScores?.find((score) => score.gameKey === activeGameKey)?.bestScore ||
    0;

  const submitScore = useCallback(
    async (payload) => {
      const nextScore = Math.round(Number(payload.score || 0));
      const scoreGate = Number(playReward?.gameMinScore || 0);
      const soundType = scoreGate && nextScore < scoreGate ? "lose" : "win";
      const burstId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      setResult({ ...payload, score: payload.score });
      setClaim(null);
      setClaimError("");
      setScoreBursts((current) => [
        ...current,
        {
          id: burstId,
          value: nextScore,
          x: 34 + Math.random() * 26,
          y: 24 + Math.random() * 20,
          className:
            nextScore >= scoreGate
              ? "bg-orange-100 text-orange-800 shadow-[0_18px_36px_-28px_rgba(154,52,18,0.45)]"
              : "bg-amber-100 text-amber-800 shadow-[0_18px_36px_-28px_rgba(146,64,14,0.42)]",
        },
      ]);
      playSound(soundType);
      triggerShake();
      window.setTimeout(() => {
        setScoreBursts((current) => current.filter((item) => item.id !== burstId));
      }, 1200);

      try {
        const response = await api.post("/games/scores", {
          gameKey: activeGameKey,
          score: nextScore,
          area: areaLabel,
          meta: payload.meta || {},
        });
        setLeaderboard(response.data || null);
        loadGamesFeed();
      } catch (apiError) {
        setClaimError(
          apiError.message || "Score saved locally, but the leaderboard could not update."
        );
      }
    },
    [activeGameKey, areaLabel, loadGamesFeed, playReward?.gameMinScore, playSound, triggerShake]
  );

  const claimReward = async (rewardTier) => {
    setClaimingTier(rewardTier);
    setClaimError("");
    try {
      const response = await api.post("/games/claim", {
        gameKey: activeGameKey,
        rewardTier,
        area: areaLabel,
      });
      setClaim(response.data);
      playSound("score");
      loadGamesFeed();
      loadLeaderboard();
    } catch (apiError) {
      playSound("lose");
      setClaimError(apiError.message || "Reward is not ready yet");
    } finally {
      setClaimingTier("");
    }
  };

  const resetActiveGame = () => {
    playSound("click");
    setResult(null);
    setClaim(null);
    setClaimError("");
    setResetKey((value) => value + 1);
    setBooting(true);
    window.setTimeout(() => setBooting(false), 450);
  };

  if (!routeGameKey) {
    return <Navigate to={appRoutes.customerGames} replace />;
  }

  return (
    <div className="nb-game-mode relative min-h-screen overflow-hidden text-stone-950">
      <GameModeStyles />
      <ScoreBurstLayer bursts={scoreBursts} />

      <div className="relative z-10 flex min-h-screen flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3">
          <Link
            to={appRoutes.customerGames}
            className="inline-flex items-center rounded-full border border-[#e5dccf] bg-white px-4 py-2.5 text-sm font-black text-stone-700 no-underline transition hover:border-orange-200 hover:text-orange-700"
          >
            Back to Playground
          </Link>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase text-orange-600">
              {postOrderMode ? `Order #${orderId?.slice(-6)}` : "Game Mode"}
            </p>
            <h1 className="truncate text-xl font-black sm:text-2xl">
              {activeGame?.title || "NearBites Game"}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <NeoMetricCard label="Best" value={bestScore} className="min-w-[92px]" />
            <div className="hidden rounded-[16px] border border-[#e5dccf] bg-white px-4 py-2 sm:block">
              <p className="text-[11px] font-black uppercase text-stone-400">
                Area
              </p>
              <p className="text-sm font-black text-stone-950">{areaLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setSoundEnabled((value) => !value)}
              className="rounded-[14px] border border-[#e5dccf] bg-white px-4 py-3 text-xs font-black uppercase text-stone-700 transition hover:border-orange-200 hover:text-orange-700"
            >
              Sound {soundEnabled ? "On" : "Off"}
            </button>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center py-5">
          <Motion.section
            animate={
              shake
                ? { x: [0, -7, 6, -3, 2, 0], rotate: [0, -0.25, 0.25, 0] }
                : { x: 0, rotate: 0 }
            }
            transition={{ duration: 0.24, ease: "easeOut" }}
            onPointerDownCapture={handleArenaPointerDown}
            className="nb-game-arena relative w-full overflow-hidden rounded-[28px] border border-[#e5dccf] bg-[#f7f4ee] p-4 shadow-[0_18px_48px_-40px_rgba(65,54,43,0.36)] sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase text-orange-700">
                  {tone.mark}
                </span>
                <span className="rounded-full border border-[#e5dccf] bg-white px-3 py-1 text-[10px] font-black uppercase text-stone-500">
                  {tone.group || "quick"}
                </span>
                <span className="rounded-full border border-[#e5dccf] bg-white px-3 py-1 text-[10px] font-black uppercase text-stone-500">
                  {tone.crowd || "solo"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {locationStatus === "granted" ? null : (
                  <button
                    type="button"
                    onClick={requestLocation}
                    className="rounded-full border border-[#e5dccf] bg-white px-3 py-1.5 text-[11px] font-black text-stone-700 transition hover:border-orange-200 hover:text-orange-700"
                  >
                    Use location
                  </button>
                )}
                <button
                  type="button"
                  onClick={loadDiscovery}
                  className="rounded-full border border-[#e5dccf] bg-white px-3 py-1.5 text-[11px] font-black text-stone-700 transition hover:border-orange-200 hover:text-orange-700"
                >
                  Refresh food
                </button>
              </div>
            </div>

            {gamesError ? (
              <div className="mb-4 rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                {gamesError}
              </div>
            ) : null}

            {booting || gamesLoading ? (
              <GameBootLoader title={activeGame?.title || "NearBites Game"} />
            ) : restaurantLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-56 rounded-[24px]" />
                <Skeleton className="h-20 rounded-[20px]" />
              </div>
            ) : restaurantError ? (
              <EmptyGame title="Restaurant feed could not load" description={restaurantError} />
            ) : restaurants.length > 0 ? (
              renderGame({
                key: activeGameKey,
                resetKey,
                props: {
                  restaurants,
                  popularDishes,
                  categories,
                  onComplete: submitScore,
                },
              })
            ) : (
              <EmptyGame
                title="No live restaurants yet"
                description="Games open when restaurants are active in the customer feed."
              />
            )}
          </Motion.section>
        </main>

        {(result || claim || claimError) && (
          <footer className="mx-auto grid w-full max-w-7xl gap-3 pb-4 lg:grid-cols-[minmax(0,1fr),minmax(280px,420px)]">
            <ResultPanel
              result={result}
              canClaimPlay={
                Boolean(playReward) &&
                result?.score >= Number(playReward?.gameMinScore || 0)
              }
              claiming={claimingTier === "PLAY"}
              onClaim={() => claimReward("PLAY")}
              onReset={() => resetActiveGame()}
            />
            <div className="space-y-3">
              <RewardCodePanel claim={claim} />
              {claimError ? (
                <div className="rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {claimError}
                </div>
              ) : null}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};

export default ReactGamePlayPage;
