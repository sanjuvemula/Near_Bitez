import { useCallback, useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Navigate, useSearchParams } from "react-router-dom";
import Skeleton from "../../components/Skeleton.jsx";
import { getCustomerGameRoute } from "../../app/routes.jsx";
import { useUserLocation } from "../../hooks/useUserLocation.js";
import { api } from "../../services/api.js";
import GameCard from "./components/GameCard.jsx";
import {
  DEFAULT_GAME_KEY,
  GAME_GROUPS,
  GAME_LIBRARY,
  getGameSlug,
  withGameTheme,
} from "./gameCatalog.js";

const FeaturePill = ({ label, value }) => (
  <div className="rounded-[16px] border border-[#e5dccf] bg-[#f4f1ec] px-4 py-3 text-stone-950 shadow-[inset_7px_7px_14px_rgba(139,120,96,0.14),inset_-7px_-7px_14px_rgba(255,255,255,0.92)]">
    <p className="text-[11px] font-extrabold uppercase text-stone-400">
      {label}
    </p>
    <p className="mt-2 truncate text-[24px] font-black leading-none">{value}</p>
  </div>
);

const GroupButton = ({ group, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "rounded-full px-4 py-2 text-sm font-black transition",
      active
        ? "bg-stone-950 text-white shadow-[0_20px_36px_-24px_rgba(15,23,42,0.75)]"
        : "border border-[#e8dece] bg-white text-stone-600 hover:border-orange-200 hover:text-orange-700",
    ].join(" ")}
  >
    {group.label}
  </button>
);

const CustomerGamesPage = () => {
  const [searchParams] = useSearchParams();
  const requestedGame = searchParams.get("game");
  const orderId = searchParams.get("orderId");
  const { location, status: locationStatus, requestLocation } = useUserLocation();

  const [gameFeed, setGameFeed] = useState({ games: [], rewards: [], myScores: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");

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
  if (redirectGameKey) {
    const targetSlug = getGameSlug(redirectGameKey || DEFAULT_GAME_KEY);
    const target = `${getCustomerGameRoute(targetSlug)}${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ""}`;
    return <Navigate to={target} replace />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10 text-stone-950">
      <Motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="rounded-[24px] border border-[#e7ded2] bg-[#f7f4ee] p-4 shadow-[0_18px_48px_-40px_rgba(65,54,43,0.36)] sm:p-5"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr),430px] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase text-orange-600">
              NearBites Playground
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-stone-950 sm:text-3xl">
              Game Zone
            </h1>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadGames}
                className="rounded-[14px] bg-stone-950 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-orange-600"
              >
                Refresh Games
              </button>
              {locationStatus === "granted" ? null : (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="rounded-[14px] border border-[#e5dccf] bg-white px-4 py-3 text-sm font-black text-stone-700 transition hover:-translate-y-0.5 hover:border-orange-200 hover:text-orange-700"
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
            {GAME_GROUPS.map((group) => (
              <GroupButton
                key={group.key}
                group={group}
                active={activeGroup === group.key}
                onClick={() => setActiveGroup(group.key)}
              />
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-[20px] border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-700">
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
              <GameCard key={game.key} game={game} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CustomerGamesPage;
