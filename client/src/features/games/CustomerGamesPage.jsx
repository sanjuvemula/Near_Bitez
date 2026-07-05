import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion as Motion, useReducedMotion } from "framer-motion";
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

const FeaturePill = ({ label, value, className = "" }) => (
  <div className={`min-w-0 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-950 shadow-sm ${className}`}>
    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-500">
      {label}
    </p>
    <p className="mt-1 truncate text-xl font-black leading-none">{value}</p>
  </div>
);

const MissionRail = ({ missions = [] }) => {
  const visibleMissions = Array.isArray(missions) ? missions.slice(0, 3) : [];
  if (visibleMissions.length === 0) return null;

  return (
    <section className="grid gap-3 md:grid-cols-3">
      {visibleMissions.map((mission) => {
        const progress = Math.min(
          100,
          Math.max(
            0,
            ((Number(mission.progress) || 0) / Math.max(1, Number(mission.target) || 1)) * 100
          )
        );

        return (
          <div
            key={mission.key || mission.title}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <p className="min-w-0 text-sm font-black text-stone-950">{mission.title}</p>
              {mission.reward?.label ? (
                <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black text-teal-700">
                  {mission.reward.label}
                </span>
              ) : null}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-teal-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
};

const ArcadeDecor = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />
    <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-orange-50 to-transparent" />
  </div>
);

const WalletPanel = ({ wallet, event }) => {
  const level = wallet?.level || { name: "Beginner Foodie", progress: 0, xp: 0, xpToNext: 150 };
  const streak = wallet?.streak || { current: 0, longest: 0 };

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <FeaturePill label="Coins" value={(wallet?.coins || 0).toLocaleString()} />
      <FeaturePill label="XP" value={level.xp.toLocaleString()} />
      <FeaturePill label="Streak" value={`${streak.current || 0}d`} />
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-black text-stone-950">{level.name}</p>
          {event?.title ? (
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
              {event.title}
            </span>
          ) : null}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
          <Motion.div
            initial={{ width: 0 }}
            animate={{ width: `${level.progress || 0}%` }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-teal-500"
          />
        </div>
      </div>
    </section>
  );
};

const RewardNotice = () => (
  <section className="relative overflow-hidden rounded-[22px] border border-amber-200 bg-[linear-gradient(135deg,#fffbeb,#ffffff_56%,#ecfeff)] p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">
          Reward update
        </p>
        <h2 className="mt-1 text-xl font-black text-stone-950">
          Rewards are coming soon.
        </h2>
        <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-stone-600">
          You can try Game Zone just for fun right now. Reward work is in progress, so play scores are for practice until the final rewards go live.
        </p>
      </div>
      <span className="w-max rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-amber-700">
        Fun mode
      </span>
    </div>
  </section>
);

const GroupButton = ({ group, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "min-h-10 rounded-full px-4 py-2 text-sm font-black transition",
      active
        ? "bg-stone-950 text-white shadow-sm"
        : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-950",
    ].join(" ")}
  >
    {group.label}
  </button>
);

const playArcadeTone = (contextRef, enabled, frequency = 420) => {
  if (!enabled || typeof window === "undefined") return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const existingContext = contextRef.current?.state === "closed" ? null : contextRef.current;
  const context = existingContext || new AudioContext();
  contextRef.current = context;
  if (context.state === "suspended") {
    context.resume().catch(() => undefined);
  }
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
};

const CustomerGamesPage = () => {
  const [searchParams] = useSearchParams();
  const requestedGame = searchParams.get("game");
  const orderId = searchParams.get("orderId");
  const reduceMotion = useReducedMotion();
  const audioContextRef = useRef(null);
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

  useEffect(() => {
    return () => {
      const context = audioContextRef.current;
      if (context && context.state !== "closed") {
        context.close().catch(() => undefined);
      }
      audioContextRef.current = null;
    };
  }, []);

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
      <div className="-mx-4 -my-5 min-h-[calc(100dvh-4rem)] bg-[#f6f8fb] px-4 py-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Skeleton className="h-[260px] rounded-[24px]" />
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
    <div className="-mx-4 -my-5 min-h-[calc(100dvh-4rem)] overflow-x-hidden bg-[#f6f8fb] px-4 py-5 text-stone-950 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="relative mx-auto max-w-7xl space-y-5 pb-8">
        <ArcadeDecor />
        <Motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">
                {postOrderMode ? "Order games" : "Game hub"}
              </p>
              <h1 className="mt-1 text-3xl font-black leading-tight text-stone-950 sm:text-4xl">
                Gaming Zone
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  playArcadeTone(audioContextRef, soundEnabled, 520);
                  loadGames();
                }}
                className="min-h-11 rounded-2xl bg-orange-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-700"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  playArcadeTone(audioContextRef, next, 660);
                }}
                className={`min-h-11 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                  soundEnabled
                    ? "border-teal-200 bg-teal-50 text-teal-700"
                    : "border-stone-200 bg-white text-stone-600"
                }`}
              >
                Sound {soundEnabled ? "On" : "Off"}
              </button>
              {locationStatus === "granted" ? null : (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="min-h-11 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-black text-stone-600 transition hover:border-stone-300 hover:text-stone-950"
                >
                  Location
                </button>
              )}
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <FeaturePill label="Games" value={games.length} />
            <FeaturePill label="Rewards" value={gameFeed.rewards?.length || 0} />
            <FeaturePill label="Area" value={areaLabel} className="col-span-2 sm:col-span-1" />
          </div>
        </Motion.section>

        <RewardNotice />

        <WalletPanel
          wallet={gameFeed.wallet}
          event={gameFeed.seasonalEvent}
        />

        <MissionRail missions={gameFeed.missions} />

        <section className="space-y-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-orange-600">
                Games
              </p>
              <h2 className="mt-1 text-2xl font-black text-stone-950">
                Pick a round
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {GAME_GROUPS.map((group, index) => (
                <GroupButton
                  key={group.key}
                  group={group}
                  active={activeGroup === group.key}
                  onClick={() => {
                    playArcadeTone(audioContextRef, soundEnabled, 360 + index * 35);
                    setActiveGroup(group.key);
                  }}
                />
              ))}
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
              {error}
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
                    playArcadeTone(audioContextRef, soundEnabled, 740);
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
