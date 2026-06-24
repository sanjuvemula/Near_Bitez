import { useCallback, useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Navigate, useSearchParams } from "react-router-dom";
import Skeleton from "../../components/Skeleton.jsx";
import { getCustomerGameRoute } from "../../app/routes.jsx";
import { useUserLocation } from "../../hooks/useUserLocation.js";
import { api } from "../../services/api.js";
import LockedGameAccess from "./LockedGameAccess.jsx";
import GameCard from "./components/GameCard.jsx";
import MultiplayerBattleArena from "./components/MultiplayerBattleArena.jsx";
import useOrderGameAccess from "./useOrderGameAccess.js";
import {
  DEFAULT_GAME_KEY,
  GAME_GROUPS,
  GAME_LIBRARY,
  getGameSlug,
  withGameTheme,
} from "./gameCatalog.js";

const FeaturePill = ({ label, value }) => (
  <div className="rounded-[20px] border border-white/80 bg-white/85 px-4 py-3 text-stone-950 shadow-[0_18px_50px_-40px_rgba(14,116,144,0.35)] backdrop-blur">
    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-teal-600">
      {label}
    </p>
    <p className="mt-2 truncate text-[24px] font-black leading-none">{value}</p>
  </div>
);

const ArcadeDecor = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(45,212,191,0.24),transparent_28%),radial-gradient(circle_at_88%_8%,rgba(244,114,182,0.18),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.2),transparent_34%)]" />
    <Motion.div
      animate={{ opacity: [0.28, 0.62, 0.28], y: [0, -12, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -right-20 top-16 h-64 w-64 rounded-full border border-cyan-200/50 bg-cyan-200/30 blur-2xl"
    />
    <Motion.div
      animate={{ opacity: [0.2, 0.5, 0.2], x: [0, 16, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -left-16 bottom-20 h-56 w-56 rounded-full border border-fuchsia-200/50 bg-fuchsia-200/30 blur-2xl"
    />
  </div>
);

const WalletPanel = ({ wallet, missions = [], event }) => {
  const level = wallet?.level || { name: "Beginner Foodie", progress: 0, xp: 0, xpToNext: 150 };
  const streak = wallet?.streak || { current: 0, longest: 0 };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#ecfeff,#fdf4ff_48%,#fff7ed)] p-5 text-stone-950 shadow-[0_28px_70px_-52px_rgba(14,116,144,0.45)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,rgba(251,146,60,0.18),transparent_24%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-600">
              NearCoins wallet
            </p>
            <h2 className="mt-2 text-3xl font-black">
              {(wallet?.coins || 0).toLocaleString()} coins
            </h2>
            <p className="mt-1 text-sm font-bold text-stone-600">
              {level.name} - {level.xp.toLocaleString()} XP
            </p>
          </div>
          <div className="rounded-[18px] border border-white/80 bg-white/75 px-4 py-3 text-right backdrop-blur">
            <p className="text-[10px] font-black uppercase text-stone-500">Streak</p>
            <p className="mt-1 text-2xl font-black">{streak.current || 0} days</p>
            <p className="text-xs font-bold text-stone-500">Best {streak.longest || 0}</p>
          </div>
        </div>
        <div className="relative mt-5">
          <div className="mb-2 flex justify-between text-xs font-black text-stone-600">
            <span>{level.name}</span>
            <span>{level.xpToNext ? `${level.xpToNext} XP to next` : "Max level"}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/75">
            <Motion.div
              initial={{ width: 0 }}
              animate={{ width: `${level.progress || 0}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-300 shadow-[0_0_22px_rgba(34,211,238,0.55)]"
            />
          </div>
        </div>
        {event ? (
          <div className="relative mt-4 rounded-[18px] border border-white/80 bg-white/70 p-3 backdrop-blur">
            <p className="text-sm font-black">{event.title}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-stone-600">
              {event.description}
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-white/80 bg-white/85 p-5 text-stone-950 shadow-[0_24px_70px_-52px_rgba(14,116,144,0.32)] backdrop-blur">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-600">
          Daily missions
        </p>
        <div className="mt-4 space-y-3">
          {missions.slice(0, 5).map((mission) => (
            <div key={mission.key} className="rounded-[18px] border border-orange-100 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-stone-950">{mission.title}</p>
                <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-black text-teal-700">
                  {mission.reward?.label}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
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
        ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-[0_18px_34px_-24px_rgba(244,63,94,0.8)]"
        : "border border-orange-100 bg-white text-stone-600 hover:border-orange-200 hover:text-orange-700",
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
  const access = useOrderGameAccess(orderId);

  const [gameFeed, setGameFeed] = useState({ games: [], rewards: [], myScores: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [battleGame, setBattleGame] = useState(null);

  const areaLabel = location?.city || "Nearby";
  const postOrderMode = Boolean(orderId || access.order?._id);

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
    if (access.unlocked) loadGames();
  }, [access.unlocked, loadGames]);

  const games = useMemo(() => {
    const liveByKey = new Map(
      (Array.isArray(gameFeed.games) ? gameFeed.games : []).map((game) => [game.key, game])
    );
    return GAME_LIBRARY.map((game) =>
      withGameTheme({ ...game, ...(liveByKey.get(game.key) || {}) })
    );
  }, [gameFeed.games]);

  const filteredGames = useMemo(
    () =>
      activeGroup === "all"
        ? games
        : games.filter((game) => game.group === activeGroup),
    [activeGroup, games]
  );

  const redirectGameKey = requestedGame || "";
  if (access.loading) {
    return (
      <div className="-mx-4 -my-5 min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#fff7ed_0%,#f0fdfa_48%,#eef2ff_100%)] px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Skeleton className="h-[360px] rounded-[32px]" />
        </div>
      </div>
    );
  }

  if (!access.unlocked) {
    return <LockedGameAccess message={access.message} compact />;
  }

  if (redirectGameKey) {
    const targetSlug = getGameSlug(redirectGameKey || DEFAULT_GAME_KEY);
    const target = `${getCustomerGameRoute(targetSlug)}${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ""}`;
    return <Navigate to={target} replace />;
  }

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-4rem)] overflow-hidden bg-[linear-gradient(180deg,#fff7ed_0%,#f0fdfa_48%,#eef2ff_100%)] px-4 py-6 text-stone-950 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="relative mx-auto max-w-7xl space-y-8 pb-10">
        <ArcadeDecor />
      <Motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/82 p-4 shadow-[0_32px_90px_-64px_rgba(14,116,144,0.5)] backdrop-blur-xl sm:p-6"
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(45,212,191,0.18),transparent_38%),radial-gradient(circle_at_92%_20%,rgba(244,114,182,0.18),transparent_26%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr),430px] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-teal-600">
              {postOrderMode ? "Order reward unlocked" : "Arcade access unlocked"}
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight text-stone-950 sm:text-6xl">
              Gaming Zone
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-stone-600">
              {postOrderMode
                ? "Arcade rounds, live missions, XP bursts, coins, and restaurant rewards while your food is on the way."
                : "Your order history unlocks seven focused games: live battles first, hard bot fallback, solo score runs, and daily top rewards."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  playArcadeTone(soundEnabled, 520);
                  loadGames();
                }}
                className="rounded-[16px] bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-3 text-sm font-black text-white shadow-[0_18px_38px_-26px_rgba(244,63,94,0.75)] transition hover:-translate-y-0.5 hover:brightness-105"
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
                    ? "border-teal-200 bg-teal-50 text-teal-700"
                    : "border-orange-100 bg-white text-stone-600"
                }`}
              >
                Sound {soundEnabled ? "On" : "Off"}
              </button>
              {locationStatus === "granted" ? null : (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="rounded-[16px] border border-orange-100 bg-white px-4 py-3 text-sm font-black text-stone-600 backdrop-blur transition hover:-translate-y-0.5 hover:border-orange-200 hover:text-orange-700"
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
            className="rounded-[22px] border border-white/80 bg-white/82 p-4 shadow-[0_22px_64px_-52px_rgba(14,116,144,0.34)] backdrop-blur"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-400">
              {label} leaderboard
            </p>
            <p className="mt-2 text-lg font-black text-stone-950">{value}</p>
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
            <h2 className="mt-1 text-2xl font-black text-stone-950">
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
          <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
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
