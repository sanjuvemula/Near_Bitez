import { useCallback, useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import Skeleton from "../../components/Skeleton.jsx";
import { appRoutes, getCustomerGameRoute } from "../../app/routes.jsx";
import { useUserLocation } from "../../hooks/useUserLocation.js";
import { api } from "../../services/api.js";
import GameCard from "./components/GameCard.jsx";
import MultiplayerBattleArena from "./components/MultiplayerBattleArena.jsx";
import {
  DEFAULT_GAME_KEY,
  GAME_GROUPS,
  GAME_LIBRARY,
  getGameSlug,
  withGameTheme,
} from "./gameCatalog.js";

const FeaturePill = ({ label, value }) => (
  <div className="rounded-[20px] border border-white/10 bg-white/[0.08] px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_22px_60px_-46px_rgba(0,0,0,0.9)] backdrop-blur">
    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-cyan-200/70">
      {label}
    </p>
    <p className="mt-2 truncate text-[24px] font-black leading-none">{value}</p>
  </div>
);

const ArcadeDecor = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(34,211,238,0.26),transparent_28%),radial-gradient(circle_at_88%_8%,rgba(217,70,239,0.22),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.18),transparent_34%)]" />
    <Motion.div
      animate={{ opacity: [0.28, 0.62, 0.28], y: [0, -12, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -right-20 top-16 h-64 w-64 rounded-full border border-cyan-300/20 bg-cyan-300/10 blur-2xl"
    />
    <Motion.div
      animate={{ opacity: [0.2, 0.5, 0.2], x: [0, 16, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -left-16 bottom-20 h-56 w-56 rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 blur-2xl"
    />
  </div>
);

const LockedGames = () => (
  <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-white/10 bg-[#080b18] p-6 text-center text-white shadow-[0_36px_120px_-70px_rgba(0,0,0,0.95)] sm:p-10">
    <ArcadeDecor />
    <div className="relative">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] border border-cyan-300/30 bg-cyan-300/10 text-3xl font-black text-cyan-100 shadow-[0_0_42px_rgba(34,211,238,0.28)]">
        XP
      </div>
      <p className="mt-6 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/80">
        Reward zone locked
      </p>
      <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
        Place an order to unlock the arcade.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-6 text-white/62">
        Gaming Zone opens as a bonus after checkout so rewards feel earned, timed, and tied to your food journey.
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to={appRoutes.customerHome}
          className="rounded-[18px] bg-white px-5 py-3 text-sm font-black text-stone-950 no-underline transition hover:bg-cyan-50"
        >
          Order food
        </Link>
        <Link
          to={appRoutes.customerOrders}
          className="rounded-[18px] border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline backdrop-blur transition hover:bg-white/15"
        >
          View orders
        </Link>
      </div>
    </div>
  </div>
);

const WalletPanel = ({ wallet, missions = [], event }) => {
  const level = wallet?.level || { name: "Beginner Foodie", progress: 0, xp: 0, xpToNext: 150 };
  const streak = wallet?.streak || { current: 0, longest: 0 };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
      <div className="relative overflow-hidden rounded-[28px] border border-cyan-300/20 bg-[linear-gradient(135deg,#07111f,#172554_42%,#7e22ce_72%,#f97316)] p-5 text-white shadow-[0_0_60px_-28px_rgba(34,211,238,0.7)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,rgba(255,255,255,0.2),transparent_24%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-100">
              NearCoins wallet
            </p>
            <h2 className="mt-2 text-3xl font-black">
              {(wallet?.coins || 0).toLocaleString()} coins
            </h2>
            <p className="mt-1 text-sm font-bold text-orange-50">
              {level.name} - {level.xp.toLocaleString()} XP
            </p>
          </div>
          <div className="rounded-[18px] border border-white/15 bg-white/12 px-4 py-3 text-right backdrop-blur">
            <p className="text-[10px] font-black uppercase text-white/70">Streak</p>
            <p className="mt-1 text-2xl font-black">{streak.current || 0} days</p>
            <p className="text-xs font-bold text-white/70">Best {streak.longest || 0}</p>
          </div>
        </div>
        <div className="relative mt-5">
          <div className="mb-2 flex justify-between text-xs font-black text-orange-50">
            <span>{level.name}</span>
            <span>{level.xpToNext ? `${level.xpToNext} XP to next` : "Max level"}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-black/25">
            <Motion.div
              initial={{ width: 0 }}
              animate={{ width: `${level.progress || 0}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-300 shadow-[0_0_22px_rgba(34,211,238,0.55)]"
            />
          </div>
        </div>
        {event ? (
          <div className="relative mt-4 rounded-[18px] border border-white/15 bg-black/20 p-3 backdrop-blur">
            <p className="text-sm font-black">{event.title}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-white/72">
              {event.description}
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.08] p-5 text-white shadow-[0_24px_80px_-52px_rgba(0,0,0,0.9)] backdrop-blur">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-200/80">
          Daily missions
        </p>
        <div className="mt-4 space-y-3">
          {missions.slice(0, 5).map((mission) => (
            <div key={mission.key} className="rounded-[18px] border border-white/10 bg-white/[0.08] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-white">{mission.title}</p>
                <span className="rounded-full bg-cyan-300/15 px-2.5 py-1 text-[10px] font-black text-cyan-100">
                  {mission.reward?.label}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-400"
                  style={{ width: `${Math.min(100, ((mission.progress || 0) / mission.target) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const GroupButton = ({ group, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "rounded-full px-4 py-2 text-sm font-black transition",
      active
        ? "bg-white text-stone-950 shadow-[0_0_34px_-18px_rgba(34,211,238,0.9)]"
        : "border border-white/10 bg-white/[0.08] text-white/68 hover:border-cyan-300/35 hover:text-white",
    ].join(" ")}
  >
    {group.label}
  </button>
);

const playArcadeTone = (enabled, frequency = 420) => {
  if (!enabled || typeof window === "undefined") return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.14);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.16);
  window.setTimeout(() => context.close(), 260);
};

const CustomerGamesPage = () => {
  const [searchParams] = useSearchParams();
  const requestedGame = searchParams.get("game");
  const orderId = searchParams.get("orderId");
  const { location, status: locationStatus, requestLocation } = useUserLocation();

  const [gameFeed, setGameFeed] = useState({ games: [], rewards: [], myScores: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [battleGame, setBattleGame] = useState(null);

  const areaLabel = location?.city || "Nearby";

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ area: areaLabel });
      const response = await api.get(`/games/feed?${query.toString()}`);
      setGameFeed(response.data || { games: [], rewards: [], myScores: [] });
      setError("");
    } catch (apiError) {
      setError(apiError.message || "Unable to load live game data.");
    } finally {
      setLoading(false);
    }
  }, [areaLabel]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const games = useMemo(() => {
    const liveGames = Array.isArray(gameFeed.games) && gameFeed.games.length
      ? gameFeed.games
      : GAME_LIBRARY;

    return liveGames.map(withGameTheme);
  }, [gameFeed.games]);

  const filteredGames = useMemo(
    () =>
      activeGroup === "all"
        ? games
        : games.filter((game) => game.group === activeGroup),
    [activeGroup, games]
  );

  const redirectGameKey = requestedGame || "";
  if (!orderId) {
    return (
      <div className="-mx-4 -my-5 min-h-[calc(100vh-4rem)] bg-[#050816] px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <LockedGames />
      </div>
    );
  }

  if (redirectGameKey) {
    const targetSlug = getGameSlug(redirectGameKey || DEFAULT_GAME_KEY);
    const target = `${getCustomerGameRoute(targetSlug)}${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ""}`;
    return <Navigate to={target} replace />;
  }

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-4rem)] overflow-hidden bg-[#050816] px-4 py-6 text-white sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="relative mx-auto max-w-7xl space-y-8 pb-10">
        <ArcadeDecor />
      <Motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.08] p-4 shadow-[0_36px_110px_-70px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-6"
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),transparent_38%),radial-gradient(circle_at_92%_20%,rgba(244,114,182,0.18),transparent_26%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr),430px] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/80">
              Order reward unlocked
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight text-white sm:text-6xl">
              Gaming Zone
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/62">
              Arcade rounds, live missions, XP bursts, coins, and restaurant rewards while your food is on the way.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  playArcadeTone(soundEnabled, 520);
                  loadGames();
                }}
                className="rounded-[16px] bg-white px-4 py-3 text-sm font-black text-stone-950 transition hover:-translate-y-0.5 hover:bg-cyan-50"
              >
                Refresh Games
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  playArcadeTone(next, 660);
                }}
                className={`rounded-[16px] border px-4 py-3 text-sm font-black transition hover:-translate-y-0.5 ${
                  soundEnabled
                    ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-50"
                    : "border-white/15 bg-white/10 text-white"
                }`}
              >
                Sound {soundEnabled ? "On" : "Off"}
              </button>
              {locationStatus === "granted" ? null : (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="rounded-[16px] border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  Use Location
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FeaturePill label="Games" value={games.length} />
            <FeaturePill label="Rewards" value={gameFeed.rewards?.length || 0} />
            <FeaturePill label="Area" value={areaLabel} />
          </div>
        </div>
      </Motion.section>

      <section className="relative grid gap-3 md:grid-cols-4">
        {[
          ["Daily", "#1 rank today"],
          ["Weekly", "Top streaks"],
          ["Global", "All players"],
          ["Friends", "Coming live"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[22px] border border-white/10 bg-white/[0.07] p-4 shadow-[0_24px_80px_-58px_rgba(0,0,0,0.9)] backdrop-blur"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/42">
              {label} leaderboard
            </p>
            <p className="mt-2 text-lg font-black text-white">{value}</p>
          </div>
        ))}
      </section>

      <WalletPanel
        wallet={gameFeed.wallet}
        missions={gameFeed.missions}
        event={gameFeed.seasonalEvent}
      />

      <section className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase text-orange-600">
              Game Library
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              Choose your next round
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {GAME_GROUPS.map((group, index) => (
              <GroupButton
                key={group.key}
                group={group}
                active={activeGroup === group.key}
                onClick={() => {
                  playArcadeTone(soundEnabled, 360 + index * 35);
                  setActiveGroup(group.key);
                }}
              />
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-[20px] border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-bold text-amber-100">
            {error} Showing the built-in game library.
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-80 rounded-[24px]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredGames.map((game, index) => (
              <GameCard
                key={game.key}
                game={game}
                index={index}
                orderId={orderId}
                onBattle={(item) => {
                  playArcadeTone(soundEnabled, 740);
                  setBattleGame(item);
                }}
              />
            ))}
          </div>
        )}
      </section>
      <MultiplayerBattleArena
        game={battleGame}
        orderId={orderId}
        open={Boolean(battleGame)}
        onClose={() => setBattleGame(null)}
      />
      </div>
    </div>
  );
};

export default CustomerGamesPage;
