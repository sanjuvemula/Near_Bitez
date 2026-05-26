import { AnimatePresence, motion as Motion } from "framer-motion";
import { memo, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { appRoutes } from "../../../app/routes.jsx";
import { useUserLocation } from "../../../hooks/useUserLocation.js";
import { api } from "../../../services/api.js";
import PhaserGame from "./PhaserGame.jsx";

const GAME_KEY = "bite-catcher";

const SaveStatus = ({ status, error }) => {
  if (status === "saving") return "Saving score...";
  if (status === "saved") return "Score saved";
  if (status === "error") return error || "Score saved locally";
  return "Ready";
};

const BiteCatcherPage = memo(function BiteCatcherPage() {
  const { location, status: locationStatus, requestLocation } = useUserLocation();
  const [playKey, setPlayKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [engineReady, setEngineReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [result, setResult] = useState(null);
  const [bestScore, setBestScore] = useState(0);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");

  const areaLabel = location?.city || "Nearby";

  const loadLeaderboard = useCallback(async () => {
    try {
      const query = new URLSearchParams({
        gameKey: GAME_KEY,
        area: areaLabel,
      });
      const response = await api.get(`/games/leaderboard?${query.toString()}`);
      setBestScore(Number(response?.data?.currentUser?.bestScore || 0));
    } catch {
      setBestScore(0);
    }
  }, [areaLabel]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handleProgress = useCallback((value) => {
    setProgress(value);
  }, []);

  const handleReady = useCallback(() => {
    setEngineReady(true);
  }, []);

  const handleComplete = useCallback(
    async (payload) => {
      const score = Math.round(Number(payload?.score || 0));

      setResult({ ...payload, score });
      setSaveStatus("saving");
      setSaveError("");
      setBestScore((current) => Math.max(current, score));

      try {
        const response = await api.post("/games/scores", {
          gameKey: GAME_KEY,
          score,
          area: areaLabel,
          meta: payload?.meta || {},
        });

        const savedBest = Number(response?.data?.currentUser?.bestScore || score);
        setBestScore((current) => Math.max(current, savedBest));
        setSaveStatus("saved");
      } catch (apiError) {
        setSaveError(apiError.message || "Leaderboard could not update");
        setSaveStatus("error");
      }
    },
    [areaLabel]
  );

  const handlePlayAgain = () => {
    setResult(null);
    setSaveStatus("idle");
    setSaveError("");
    setEngineReady(false);
    setProgress(0);
    setPlayKey((value) => value + 1);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,47,73,0.55),transparent_35%),linear-gradient(90deg,rgba(249,115,22,0.14),transparent_38%,rgba(34,211,238,0.16))]" />

      <header className="absolute inset-x-3 top-3 z-30 flex flex-wrap items-center gap-2 rounded-[22px] border border-white/12 bg-slate-950/72 p-2 shadow-[0_20px_70px_-42px_rgba(0,0,0,0.75)] backdrop-blur sm:inset-x-5 sm:top-5">
        <Link
          to={appRoutes.customerGames}
          className="inline-flex h-11 items-center rounded-[16px] border border-white/12 bg-white/10 px-4 text-sm font-black text-white no-underline transition hover:bg-white/16"
        >
          Exit
        </Link>

        <div className="min-w-[160px] flex-1 px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
            NearBites Arcade
          </p>
          <h1 className="truncate text-xl font-black leading-tight sm:text-2xl">
            Bite Catcher
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="h-11 rounded-[15px] border border-cyan-300/16 bg-cyan-300/10 px-3 py-1.5">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/65">
              Best
            </p>
            <p className="text-sm font-black text-cyan-50">{bestScore}</p>
          </div>

          <div className="hidden h-11 rounded-[15px] border border-white/10 bg-white/8 px-3 py-1.5 sm:block">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/50">
              Area
            </p>
            <p className="max-w-[150px] truncate text-sm font-black text-white">
              {areaLabel}
            </p>
          </div>

          {locationStatus === "granted" ? null : (
            <button
              type="button"
              onClick={requestLocation}
              className="h-11 rounded-[15px] border border-white/12 bg-white/10 px-3 text-xs font-black text-white transition hover:bg-white/16"
            >
              Use location
            </button>
          )}

          <button
            type="button"
            aria-pressed={soundEnabled}
            onClick={() => setSoundEnabled((value) => !value)}
            className="h-11 rounded-[15px] border border-white/12 bg-white/10 px-3 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-white/16"
          >
            Sound {soundEnabled ? "On" : "Off"}
          </button>

          <button
            type="button"
            onClick={handlePlayAgain}
            className="h-11 rounded-[15px] bg-orange-500 px-4 text-sm font-black text-white transition hover:bg-orange-400"
          >
            Restart
          </button>
        </div>
      </header>

      <main className="relative z-10 h-screen w-screen">
        <PhaserGame
          key={playKey}
          onComplete={handleComplete}
          onProgress={handleProgress}
          onReady={handleReady}
          soundEnabled={soundEnabled}
        />
      </main>

      {!engineReady ? (
        <div className="pointer-events-none absolute inset-x-5 bottom-5 z-30 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-300 transition-[width] duration-200"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      ) : null}

      <AnimatePresence>
        {result ? (
          <Motion.aside
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute bottom-4 left-1/2 z-40 w-[min(520px,calc(100vw-24px))] -translate-x-1/2 rounded-[24px] border border-cyan-300/18 bg-slate-950/86 p-4 shadow-[0_24px_80px_-34px_rgba(0,0,0,0.85)] backdrop-blur sm:bottom-6 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
                  Final score
                </p>
                <p className="mt-1 text-5xl font-black leading-none text-white">
                  {result.score}
                </p>
                <p className="mt-2 text-sm font-bold text-white/62">
                  <SaveStatus status={saveStatus} error={saveError} />
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePlayAgain}
                  className="h-11 rounded-[15px] bg-cyan-300 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
                >
                  Play again
                </button>
                <Link
                  to={appRoutes.customerGames}
                  className="inline-flex h-11 items-center rounded-[15px] border border-white/12 bg-white/10 px-4 text-sm font-black text-white no-underline transition hover:bg-white/16"
                >
                  Game hub
                </Link>
              </div>
            </div>
          </Motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
});

export default BiteCatcherPage;
