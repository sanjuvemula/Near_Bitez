import { useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import gsap from "gsap";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import FoodDice from "./games/FoodDice.jsx";
import SpinWheel from "./games/SpinWheel.jsx";
import ScratchCard from "./games/ScratchCard.jsx";
import MemoryMatch from "./games/MemoryMatch.jsx";
import TapTheFood from "./games/TapTheFood.jsx";
import FoodQuiz from "./games/FoodQuiz.jsx";
import useGameScore from "../../hooks/useGameScore.js";
import { useAuth } from "../../hooks/useAuth.js";
import { SOCKET_URL } from "../../config/runtime.js";

const gameDefs = [
  { key: "food-dice", title: "FoodDice", difficulty: "Easy", component: FoodDice, icon: "dice" },
  { key: "spin-wheel", title: "SpinWheel", difficulty: "Easy", component: SpinWheel, icon: "wheel" },
  { key: "scratch-card", title: "ScratchCard", difficulty: "Easy", component: ScratchCard, icon: "scratch" },
  { key: "memory-match", title: "MemoryMatch", difficulty: "Medium", component: MemoryMatch, icon: "memory" },
  { key: "tap-the-food", title: "TapTheFood", difficulty: "Hard", component: TapTheFood, icon: "tap" },
  { key: "food-quiz", title: "FoodQuiz", difficulty: "Medium", component: FoodQuiz, icon: "quiz" },
];

const GameIcon = ({ type }) => {
  const common = {
    fill: "none",
    stroke: "#ea580c",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2.4,
  };

  if (type === "wheel") {
    return (
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <circle {...common} cx="24" cy="24" r="16" />
        <path {...common} d="M24 8v32M8 24h32M13 13l22 22M35 13 13 35" />
        <circle fill="#ea580c" cx="24" cy="24" r="4" />
      </svg>
    );
  }
  if (type === "scratch") {
    return (
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <rect {...common} x="10" y="13" width="28" height="22" rx="6" />
        <path {...common} d="M17 21h14M17 27h9M35 10l-8 8" />
      </svg>
    );
  }
  if (type === "memory") {
    return (
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <rect {...common} x="9" y="10" width="13" height="13" rx="4" />
        <rect {...common} x="26" y="10" width="13" height="13" rx="4" />
        <rect {...common} x="9" y="27" width="13" height="13" rx="4" />
        <rect {...common} x="26" y="27" width="13" height="13" rx="4" />
      </svg>
    );
  }
  if (type === "tap") {
    return (
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <path {...common} d="M23 8v21M18 16l5-5 5 5" />
        <path {...common} d="M18 30h13c5 0 7 3 7 7v3H16l-5-11c-1-3 3-5 5-2l2 3Z" />
      </svg>
    );
  }
  if (type === "quiz") {
    return (
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <path {...common} d="M15 14a9 9 0 1 1 13 8c-3 2-4 4-4 7" />
        <path {...common} d="M24 37h.01" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
      <rect {...common} x="11" y="11" width="26" height="26" rx="7" />
      <circle fill="#ea580c" cx="18" cy="18" r="2.5" />
      <circle fill="#ea580c" cx="30" cy="18" r="2.5" />
      <circle fill="#ea580c" cx="24" cy="24" r="2.5" />
      <circle fill="#ea580c" cx="18" cy="30" r="2.5" />
      <circle fill="#ea580c" cx="30" cy="30" r="2.5" />
    </svg>
  );
};

const variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
};

const ScoreTile = ({ label, value }) => (
  <div className="rounded-[16px] bg-white px-4 py-3 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
    <p className="text-[11px] font-bold uppercase text-stone-400">{label}</p>
    <p className="mt-2 text-2xl font-medium leading-none text-stone-950">{value}</p>
  </div>
);

const LeaderboardPanel = ({ leaderboard, currentUser }) => {
  const rowRefs = useRef(new Map());
  const previousPositions = useRef(new Map());
  const rows = useMemo(() => {
    const topRows = leaderboard || [];
    if (!currentUser) return topRows;
    const visible = topRows.some((row) => String(row.userId) === String(currentUser.userId));
    return visible ? topRows : [...topRows, { ...currentUser, pinned: true }];
  }, [currentUser, leaderboard]);

  useLayoutEffect(() => {
    const nextPositions = new Map();
    rows.forEach((row) => {
      const node = rowRefs.current.get(row.userId);
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const previous = previousPositions.current.get(row.userId);
      if (previous) {
        const delta = previous.top - rect.top;
        if (Math.abs(delta) > 1) {
          gsap.fromTo(node, { y: delta }, { y: 0, duration: 0.5, ease: "back.out(1.2)" });
        }
      }
      nextPositions.set(row.userId, rect);
    });
    previousPositions.current = nextPositions;
  }, [rows]);

  return (
    <aside className="rounded-[24px] bg-white p-5 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)] lg:sticky lg:top-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase text-orange-600">24h leaderboard</p>
          <h2 className="mt-1 text-2xl font-black text-stone-950">Top 10</h2>
        </div>
        <span className="h-2 w-2 rounded-full bg-[#ea580c] shadow-[0_0_0_6px_rgba(234,88,12,0.14)]" />
      </div>

      <div className="mt-5 space-y-2">
        {rows.length ? (
          rows.map((row) => (
            <div
              key={`${row.userId}-${row.pinned ? "pinned" : "top"}`}
              ref={(node) => {
                if (node) rowRefs.current.set(row.userId, node);
              }}
              className={`flex items-center gap-3 rounded-[18px] border px-3 py-3 ${
                row.isCurrentUser || row.pinned
                  ? "border-orange-200 bg-orange-50"
                  : "border-[#efe8dc] bg-[#fafaf8]"
              }`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-stone-950 text-xs font-black text-white">
                {row.initials || "NB"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-stone-950">
                  #{row.rank || "-"} {row.name || "Foodie"}
                </p>
                <p className="text-xs font-bold text-stone-400">
                  {row.badge || "Playing today"}
                </p>
              </div>
              <p className="text-lg font-black text-stone-950">{row.score}</p>
            </div>
          ))
        ) : (
          <div className="rounded-[18px] border border-dashed border-[#eadfce] bg-[#fafaf8] p-4 text-sm font-bold text-stone-500">
            No scores yet. Be first on the board.
          </div>
        )}
      </div>
    </aside>
  );
};

const GameLobby = ({ order = null, onClose, onOutForDelivery }) => {
  const { user } = useAuth();
  const {
    addScore,
    todayScore,
    myRank,
    leaderboard,
    currentUser,
    loading,
    error,
    refresh,
  } = useGameScore();
  const [activeGame, setActiveGame] = useState(null);
  const shellRef = useRef(null);
  const cardRefs = useRef(new Map());
  const lastRectRef = useRef(null);

  useEffect(() => {
    if (!order?._id || !user?._id) return undefined;
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"], withCredentials: true });
    socket.on("connect", () => {
      socket.emit("join", { userId: String(user._id), role: user.role || "customer" });
    });
    socket.on("order:out_for_delivery", (payload) => {
      if (String(payload?.orderId) !== String(order._id)) return;
      toast.success("Rider is nearby! Score saved.");
      onOutForDelivery?.();
    });
    return () => socket.disconnect();
  }, [onOutForDelivery, order?._id, user?._id, user?.role]);

  const saveScore = useCallback(
    async (gameName, points) => {
      const payload = await addScore(gameName, points);
      if (payload?.badges?.length) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#ea580c", "#f97316", "#fbbf24", "#ffffff"],
        });
      }
      return payload;
    },
    [addScore]
  );

  const openGame = (game) => {
    const rect = cardRefs.current.get(game.key)?.getBoundingClientRect();
    lastRectRef.current = rect;
    setActiveGame(game);
    window.requestAnimationFrame(() => {
      if (!shellRef.current || !rect) return;
      gsap.fromTo(
        shellRef.current,
        {
          borderRadius: 24,
          height: rect.height,
          left: rect.left,
          top: rect.top,
          width: rect.width,
        },
        {
          borderRadius: 0,
          duration: 0.4,
          ease: "power3.inOut",
          height: window.innerHeight,
          left: 0,
          top: 0,
          width: window.innerWidth,
        }
      );
    });
  };

  const collapseGame = () => {
    const rect = lastRectRef.current;
    if (!shellRef.current || !rect) {
      setActiveGame(null);
      return;
    }

    gsap.to(shellRef.current, {
      borderRadius: 24,
      duration: 0.35,
      ease: "power3.inOut",
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      onComplete: () => setActiveGame(null),
    });
  };

  const gameScores = useMemo(() => {
    const scores = new Map();
    for (const play of currentUser?.gamesPlayed || []) {
      scores.set(play.game, Math.max(scores.get(play.game) || 0, Number(play.score || 0)));
    }
    return scores;
  }, [currentUser?.gamesPlayed]);

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-[#fafaf8] p-4">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-[24px] bg-stone-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[#fafaf8] p-4">
        <div className="rounded-[24px] bg-white p-6 text-center shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
          <p className="text-base font-black text-stone-950">{error}</p>
          <button onClick={refresh} className="mt-4 min-h-11 rounded-full bg-[#ea580c] px-5 py-3 text-sm font-black text-white">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const ActiveComponent = activeGame?.component;

  return (
    <div className="min-h-screen bg-[#fafaf8] p-4">
      <div className="mx-auto max-w-7xl">
        <div className="sticky top-0 z-30 rounded-[24px] bg-[#fafaf8]/95 p-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-white px-4 py-3 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
            <div className="flex items-center gap-3">
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="grid min-h-11 min-w-11 place-items-center rounded-full border border-orange-200 text-orange-700"
                  aria-label="Back"
                >
                  &lt;
                </button>
              ) : null}
              <div>
                <p className="text-[11px] font-black uppercase text-orange-600">Game lobby</p>
                <h1 className="text-2xl font-black text-stone-950">NearBites Gaming Zone</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ScoreTile label="Today's score" value={`${todayScore} pts`} />
              <ScoreTile label="Rank" value={myRank ? `#${myRank}` : "-"} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr),360px]">
          <Motion.div
            variants={variants}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {gameDefs.map((game) => (
              <Motion.button
                key={game.key}
                ref={(node) => {
                  if (node) cardRefs.current.set(game.key, node);
                }}
                type="button"
                variants={cardVariants}
                onClick={() => openGame(game)}
                className="group min-h-[220px] rounded-[24px] border border-[#efe8dc] border-l-4 border-l-transparent bg-white p-5 text-left shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)] transition hover:-translate-y-1 hover:border-l-[#ea580c]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-16 w-16 place-items-center rounded-[20px] bg-orange-50">
                    <GameIcon type={game.icon} />
                  </div>
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-black uppercase text-orange-700">
                    {game.difficulty}
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-black text-stone-950">{game.title}</h2>
                <div className="mt-5">
                  <p className="text-[11px] font-bold uppercase text-stone-400">Best today</p>
                  <p className="mt-2 text-2xl font-medium text-stone-950">
                    {gameScores.get(game.title) || 0}
                  </p>
                </div>
              </Motion.button>
            ))}
          </Motion.div>

          <LeaderboardPanel leaderboard={leaderboard} currentUser={currentUser} />
        </div>
      </div>

      {activeGame && ActiveComponent ? (
        <div
          ref={shellRef}
          className="fixed z-50 overflow-auto bg-[#fafaf8]"
          style={{ inset: 0 }}
        >
          <button
            type="button"
            onClick={collapseGame}
            className="fixed left-4 top-4 z-[60] grid min-h-11 min-w-11 place-items-center rounded-full bg-white text-lg font-black text-orange-700 shadow-lg"
            aria-label="Back to lobby"
          >
            &lt;
          </button>
          <ActiveComponent
            order={order}
            onScore={saveScore}
            todayScore={todayScore}
            myRank={myRank}
          />
        </div>
      ) : null}
    </div>
  );
};

export default GameLobby;
