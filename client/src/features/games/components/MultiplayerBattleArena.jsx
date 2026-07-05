import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../../../config/runtime.js";
import { useAuth } from "../../../hooks/useAuth.js";
import { api } from "../../../services/api.js";
import { withGameTheme } from "../gameCatalog.js";

const QUIZ_QUESTIONS = [
  { q: "Which dish is traditionally layered with rice and spices?", options: ["Biryani", "Dosa", "Vada Pav"], answer: 0 },
  { q: "Which topping is common on a margherita pizza?", options: ["Basil", "Mango", "Paneer tikka"], answer: 0 },
  { q: "What makes a delivery race faster?", options: ["Avoiding obstacles", "Stopping often", "Dropping food"], answer: 0 },
  { q: "Which drink pairs with spicy street food?", options: ["Chaas", "Soy sauce", "Vinegar"], answer: 0 },
];

const MEMORY_ITEMS = ["Pizza", "Burger", "Momo", "Dosa"];
const GAME_COPY = {
  "food-quiz-battle": {
    verb: "Answer",
    hint: "Correct answers give 14 points. Keep the rhythm to build combo.",
  },
  "tap-battle": {
    verb: "Tap",
    hint: "Tap in quick bursts. Every clean hit keeps your combo alive.",
  },
  "spin-clash": {
    verb: "Spin",
    hint: "Spin for bigger burst values and finish before your rival.",
  },
  "delivery-race": {
    verb: "Dash",
    hint: "Dash through delivery lanes and stack fast scoring runs.",
  },
  "memory-duel": {
    verb: "Match",
    hint: "Match pairs quickly. Clean pairs score the biggest boosts.",
  },
};

const makeMemoryDeck = () =>
  MEMORY_ITEMS.flatMap((label) => [label, label]).sort(() => Math.random() - 0.5);

const getInitials = (name = "NB") =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "NB";

const BattlePlayer = ({ player, active, label }) => (
  <div
    className={`min-h-[104px] rounded-2xl border p-3 transition ${
      active
        ? "border-orange-300 bg-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        : "border-slate-800 bg-slate-900/82"
    }`}
  >
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-sm font-black text-slate-950">
        {player?.avatar || getInitials(player?.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-black text-white">
          {player?.name || "Matching"}
        </p>
      </div>
      <p className="text-2xl font-black text-white">{player?.score || 0}</p>
    </div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
      <Motion.div
        transition={{ duration: 0.18, ease: "easeOut" }}
        animate={{ width: `${Math.min(100, (Number(player?.score || 0) / 180) * 100)}%` }}
        className="h-full rounded-full bg-orange-400"
      />
    </div>
  </div>
);

const RewardBurst = ({ result, won }) => (
  <Motion.div
    initial={{ opacity: 0, scale: 0.9, y: 16 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.94, y: 12 }}
    className="absolute inset-x-4 top-4 z-20 rounded-3xl border border-slate-700 bg-slate-950 p-5 text-center text-white shadow-2xl"
  >
    <Motion.div
      animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 0.75, repeat: 2 }}
      className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-orange-500 text-lg font-black"
    >
      {won ? "WIN" : "XP"}
    </Motion.div>
    <h3 className="mt-4 text-3xl font-black">
      {won ? "You won" : "Done"}
    </h3>
    <p className="mt-2 text-sm font-semibold text-white/62">
      +{result?.rewards?.coins || 20} NearCoins - +{result?.rewards?.xp || 12} XP
    </p>
    {result?.rewards?.badge ? (
      <p className="mt-3 rounded-full bg-amber-300/15 px-3 py-2 text-xs font-black text-amber-100">
        Badge unlocked: {result.rewards.badge}
      </p>
    ) : null}
  </Motion.div>
);

const MultiplayerBattleArena = ({ game, orderId, open, onClose }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const comboRef = useRef(0);
  const roomFrameRef = useRef(0);
  const queuedRoomRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [room, setRoom] = useState(null);
  const [result, setResult] = useState(null);
  const [combo, setCombo] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [memory, setMemory] = useState([]);
  const [lastDelta, setLastDelta] = useState(0);

  const item = useMemo(() => withGameTheme(game), [game]);
  const copy = GAME_COPY[item.key] || GAME_COPY["tap-battle"];
  const meId = String(user?._id || "");
  const players = room?.players || [];
  const me = players.find((player) => player.id === meId) || players[0];
  const rival = players.find((player) => player.id !== me?.id) || null;
  const won = result?.winner?.id === meId || (!result?.winner?.isBot && result?.winner?.id === me?.id);
  const canPlay = room?.status === "playing" && !result;
  const roomId = room?.roomId;

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  const applyLiveRoom = useCallback((payload) => {
    queuedRoomRef.current = payload;
    if (roomFrameRef.current) return;
    roomFrameRef.current = window.requestAnimationFrame(() => {
      roomFrameRef.current = 0;
      setRoom(queuedRoomRef.current);
      queuedRoomRef.current = null;
    });
  }, []);

  const sendAction = useCallback(
    (delta, event = "score") => {
      if (!socketRef.current || !roomId || !canPlay) return;
      const nextCombo = comboRef.current + 1;
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      setLastDelta(delta);
      socketRef.current.emit("battle:action", {
        roomId,
        delta,
        combo: nextCombo,
        event,
      });
    },
    [canPlay, roomId]
  );

  useEffect(() => {
    if (!open) return undefined;
    setStatus("searching");
    setResult(null);
    setRoom(null);
    setCombo(0);
    comboRef.current = 0;
    setQuizIndex(0);
    setMemory(makeMemoryDeck());

    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"], withCredentials: true });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("join", { userId: user?._id, role: user?.role || "customer" });
      socket.emit("battle:join", {
        gameKey: item.key,
        userId: user?._id,
        name: user?.name || "Foodie",
        orderId,
      });
    });
    socket.on("battle:searching", () => setStatus("searching"));
    socket.on("battle:matched", (payload) => {
      setStatus("matched");
      setRoom(payload);
    });
    socket.on("battle:bot_matched", (payload) => {
      setStatus("bot");
      setRoom(payload);
    });
    socket.on("battle:countdown", ({ room: payload }) => {
      setStatus("countdown");
      setRoom(payload);
    });
    socket.on("battle:start", (payload) => {
      setStatus("playing");
      setRoom(payload);
    });
    socket.on("battle:state", applyLiveRoom);
    socket.on("battle:action", ({ delta }) => setLastDelta(delta));
    socket.on("battle:finished", async (payload) => {
      setStatus("finished");
      setResult(payload);
      setRoom(payload);
      const score = payload.players?.find((player) => player.id === String(user?._id))?.score || 0;
      if (score > 0) {
        try {
          await api.post("/games/scores", {
            gameKey: item.key,
            gameName: item.title,
            score,
            points: score,
          });
        } catch {
          // Local battle result remains visible even if persistence fails.
        }
      }
    });

    return () => {
      if (roomFrameRef.current) {
        window.cancelAnimationFrame(roomFrameRef.current);
        roomFrameRef.current = 0;
      }
      socket.emit("battle:leave");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [applyLiveRoom, item.key, item.title, open, orderId, user?._id, user?.name, user?.role]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  const handlePrimaryAction = () => {
    if (!canPlay) return;
    if (item.key === "spin-clash") {
      sendAction(18 + Math.floor(Math.random() * 34), "spin");
      return;
    }
    if (item.key === "delivery-race") {
      sendAction(7 + Math.floor(Math.random() * 8), "dash");
      return;
    }
    if (item.key === "memory-duel") {
      const next = memory.slice(0, 2);
      setMemory((current) => {
        const remaining = current.slice(2);
        return remaining.length > 0 ? remaining : makeMemoryDeck();
      });
      sendAction(next[0] === next[1] ? 22 : 8, "match");
      return;
    }
    sendAction(3 + Math.min(12, Math.floor(combo / 8)), "tap");
  };

  const answerQuiz = (index) => {
    if (!canPlay) return;
    const question = QUIZ_QUESTIONS[quizIndex % QUIZ_QUESTIONS.length];
    sendAction(index === question.answer ? 14 : 2, index === question.answer ? "correct" : "miss");
    setQuizIndex((value) => value + 1);
  };

  if (!open) return null;

  const question = QUIZ_QUESTIONS[quizIndex % QUIZ_QUESTIONS.length];

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/96 px-3 py-3 text-white sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl items-center">
        <div className="relative w-full overflow-hidden rounded-[24px] border border-white/10 bg-slate-950 p-4 shadow-[0_32px_90px_-44px_rgba(0,0,0,0.9)] sm:rounded-[28px] sm:p-6">
          <div className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(circle_at_12%_10%,rgba(34,211,238,0.2),transparent_30%),radial-gradient(circle_at_88%_0%,rgba(249,115,22,0.18),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0),rgba(15,23,42,0.68))]" />
          <AnimatePresence>{result ? <RewardBurst result={result} won={won} /> : null}</AnimatePresence>

          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/80">
                Live multiplayer battle
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">{item.title}</h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/68">
                {copy.hint || item.description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/15"
            >
              Close
            </button>
          </div>

          <div className="relative mt-5 grid gap-3 md:grid-cols-2">
            <BattlePlayer player={me} active label="You" />
            <BattlePlayer player={rival} label={rival?.isBot ? "AI rival" : "Rival"} />
          </div>

          <div className="relative mt-5 rounded-[24px] border border-white/10 bg-slate-900/86 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:rounded-[28px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/55">
                  {status === "searching" ? "Matchmaking" : room?.status || status}
                </p>
                <p className="mt-1 text-xl font-black">
                  {status === "searching"
                    ? "Finding a rival..."
                    : status === "countdown"
                    ? "Battle starts now"
                    : result
                    ? won
                      ? "You won the battle"
                      : `${result?.winner?.name || "Rival"} won`
                    : "Score live"}
                </p>
              </div>
              <div className="min-w-[92px] rounded-2xl bg-white px-4 py-2 text-right text-stone-950">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">Combo</p>
                <p className="text-2xl font-black">{combo}x</p>
              </div>
            </div>

            {item.key === "food-quiz-battle" ? (
              <div className="mt-5">
                <p className="text-lg font-black leading-snug">{question.q}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {question.options.map((option, index) => (
                    <Motion.button
                      key={option}
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      disabled={!canPlay}
                      onClick={() => answerQuiz(index)}
                      className="min-h-14 rounded-[18px] border border-white/10 bg-white/10 px-4 py-4 text-left text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {option}
                    </Motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-[1fr,240px] md:items-center">
                <Motion.button
                  whileTap={{ scale: 0.94 }}
                  disabled={!canPlay}
                  onClick={handlePrimaryAction}
                  className="grid min-h-[220px] place-items-center rounded-[28px] border border-cyan-300/25 bg-[radial-gradient(circle_at_50%_35%,rgba(34,211,238,0.32),transparent_34%),linear-gradient(135deg,rgba(8,47,73,0.96),rgba(154,52,18,0.82))] px-6 py-8 text-center shadow-[inset_0_0_60px_rgba(255,255,255,0.06)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span>
                    <span className="block text-5xl font-black">{copy.verb}</span>
                    <span className="mt-3 block text-sm font-bold text-white/60">
                      {item.key === "memory-duel" ? `${Math.max(0, memory.length)} cards left` : "Touch control ready"}
                    </span>
                  </span>
                </Motion.button>
                <div className="space-y-3">
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.08] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">Last hit</p>
                    <Motion.p
                      key={lastDelta}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-2 text-4xl font-black text-cyan-100"
                    >
                      +{lastDelta}
                    </Motion.p>
                  </div>
                  <button
                    type="button"
                    disabled={!canPlay}
                    onClick={() => socketRef.current?.emit("battle:finish", { roomId: room?.roomId })}
                    className="min-h-12 w-full rounded-[18px] bg-white px-4 py-3 text-sm font-black text-stone-950 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Finish round
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerBattleArena;
