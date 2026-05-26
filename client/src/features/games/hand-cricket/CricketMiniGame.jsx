import { AnimatePresence, motion as Motion } from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

const TOTAL_BALLS = 6;
const BALL_CHOICES = [1, 2, 3, 4, 5, 6];
const MODE_PLAYERS = {
  bot: ["You", "Bot"],
  friend: ["Player 1", "Player 2"],
};

const CROWD_DOTS = Array.from({ length: 168 }, (_, index) => ({
  id: index,
  left: `${3 + ((index * 17) % 94)}%`,
  top: `${10 + ((index * 31) % 32)}%`,
  size: 2 + (index % 3),
  delay: (index % 12) * 0.05,
  tone:
    index % 11 === 0
      ? "bg-amber-200"
      : index % 7 === 0
      ? "bg-cyan-200"
      : index % 5 === 0
      ? "bg-lime-200"
      : "bg-white/40",
}));

const FOG_PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${(index * 23) % 100}%`,
  width: 80 + (index % 5) * 34,
  delay: (index % 9) * 0.22,
  duration: 5.5 + (index % 6) * 0.5,
  opacity: 0.12 + (index % 4) * 0.035,
}));

const SPARKS = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  angle: index * 0.82,
  distance: 32 + (index % 5) * 10,
  delay: index * 0.012,
}));

const CONFETTI = Array.from({ length: 34 }, (_, index) => ({
  id: index,
  left: 16 + ((index * 19) % 68),
  drift: (index % 2 === 0 ? 1 : -1) * (42 + (index % 7) * 16),
  rotate: (index % 2 === 0 ? 1 : -1) * (100 + (index % 8) * 24),
  delay: (index % 8) * 0.024,
  color:
    index % 3 === 0 ? "bg-amber-300" : index % 3 === 1 ? "bg-cyan-300" : "bg-lime-300",
}));

const getRandomNumber = () => BALL_CHOICES[Math.floor(Math.random() * BALL_CHOICES.length)];

const getRestaurantScore = (restaurant) =>
  Number(restaurant?.rating || 0) * 18 +
  Number(restaurant?.availableItemCount || 0) +
  Math.max(0, 50 - Number(restaurant?.deliveryTime || 50));

const pickResultRestaurant = (restaurants, seed = 0) => {
  if (!restaurants?.length) return null;
  const ranked = [...restaurants].sort(
    (left, right) => getRestaurantScore(right) - getRestaurantScore(left)
  );
  return ranked[Math.abs(seed) % ranked.length] || ranked[0];
};

const createInitialGame = () => ({
  innings: 0,
  balls: 0,
  scores: [0, 0],
  outs: [0, 0],
  target: null,
  pendingBatPick: null,
  phase: "bat-select",
  log: [],
  lastMove: null,
  inningsSummary: null,
  complete: false,
  winnerLabel: "",
  streak: 0,
});

const createNoiseBuffer = (context, duration = 0.32) => {
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
  }

  return buffer;
};

const getRewardScore = ({ scores, outs, balls, mode, winnerIndex }) => {
  const maxRuns = Math.max(...scores);
  const closeBonus = Math.max(0, 18 - Math.abs(scores[0] - scores[1]) * 2);
  const cleanBonus = outs[0] === 0 || outs[1] === 0 ? 5 : 0;
  const finishBonus = winnerIndex === 0 ? 14 : winnerIndex === -1 ? 8 : 4;
  return Math.max(
    38,
    Math.min(100, maxRuns * 4 + closeBonus + cleanBonus + finishBonus + (mode === "friend" ? 8 : 4) + balls)
  );
};

const useHandCricketAudio = () => {
  const [enabled, setEnabled] = useState(true);
  const contextRef = useRef(null);
  const ambienceRef = useRef(null);

  const ensureContext = useCallback(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;

    const context = contextRef.current || new AudioContext();
    contextRef.current = context;
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
    return context;
  }, []);

  const playTone = useCallback((context, frequency, duration, type = "sine", volume = 0.055) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }, []);

  const playNoise = useCallback((context, duration, volume, frequency, type = "bandpass") => {
    const source = context.createBufferSource();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const start = context.currentTime;

    source.buffer = createNoiseBuffer(context, duration);
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.9;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(start);
    source.stop(start + duration + 0.04);
  }, []);

  const stopAmbience = useCallback(() => {
    if (!ambienceRef.current) return;

    try {
      const { context, gain, source } = ambienceRef.current;
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
      source.stop(context.currentTime + 0.26);
    } catch {
      // Enhancement-only audio can already be stopped during route changes.
    }

    ambienceRef.current = null;
  }, []);

  const startAmbience = useCallback(() => {
    if (!enabled || ambienceRef.current) return;

    const context = ensureContext();
    if (!context) return;

    const source = context.createBufferSource();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    source.buffer = createNoiseBuffer(context, 2.8);
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 620;
    gain.gain.value = 0.012;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start();

    ambienceRef.current = { context, source, gain };
  }, [enabled, ensureContext]);

  const play = useCallback(
    (type) => {
      if (!enabled) return;

      const context = ensureContext();
      if (!context) return;

      if (type !== "click") startAmbience();

      if (type === "click") {
        playTone(context, 360, 0.055, "triangle", 0.035);
        return;
      }

      if (type === "bat") {
        playNoise(context, 0.12, 0.18, 900);
        playTone(context, 128, 0.12, "triangle", 0.08);
        return;
      }

      if (type === "cheer") {
        playNoise(context, 0.95, 0.075, 1180);
        [392, 523, 659].forEach((frequency, index) => {
          window.setTimeout(() => playTone(context, frequency, 0.12, "sine", 0.05), index * 75);
        });
        return;
      }

      if (type === "six") {
        playNoise(context, 1.1, 0.095, 1320);
        [392, 523, 659, 784].forEach((frequency, index) => {
          window.setTimeout(() => playTone(context, frequency, 0.13, "sine", 0.055), index * 78);
        });
        return;
      }

      if (type === "wicket") {
        playNoise(context, 0.42, 0.1, 320);
        playTone(context, 156, 0.2, "sawtooth", 0.075);
        window.setTimeout(() => playTone(context, 98, 0.24, "sawtooth", 0.055), 90);
        return;
      }

      playTone(context, 520, 0.08, "sine", 0.045);
    },
    [enabled, ensureContext, playNoise, playTone, startAmbience]
  );

  useEffect(() => {
    if (!enabled) stopAmbience();
  }, [enabled, stopAmbience]);

  useEffect(() => stopAmbience, [stopAmbience]);

  return { enabled, setEnabled, play, startAmbience };
};

const useMovingStadiumLight = () => {
  const ref = useRef(null);

  useEffect(() => {
    let frameId = 0;
    const startedAt = performance.now();

    const tick = (time) => {
      const node = ref.current;
      if (node) {
        const seconds = (time - startedAt) / 1000;
        node.style.setProperty("--light-x", `${50 + Math.sin(seconds * 0.22) * 30}%`);
        node.style.setProperty("--light-y", `${18 + Math.cos(seconds * 0.18) * 8}%`);
        node.style.setProperty("--sweep-rotate", `${Math.sin(seconds * 0.16) * 8}deg`);
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return ref;
};

const HandCricketStyles = () => (
  <style>{`
    .hc-arena {
      --light-x: 50%;
      --light-y: 18%;
      --sweep-rotate: 0deg;
      isolation: isolate;
      transform: translateZ(0);
    }

    .hc-arena * {
      backface-visibility: hidden;
    }

    .hc-stadium-core {
      background:
        radial-gradient(circle at var(--light-x) var(--light-y), rgba(240, 249, 255, 0.35), transparent 17%),
        radial-gradient(circle at 18% 3%, rgba(251, 191, 36, 0.26), transparent 18%),
        radial-gradient(circle at 82% 4%, rgba(132, 204, 22, 0.22), transparent 19%),
        linear-gradient(180deg, #020617 0%, #061424 42%, #063020 100%);
    }

    .hc-light-beam {
      transform: rotate(var(--sweep-rotate)) translateZ(0);
      will-change: transform;
    }

    .hc-fog {
      animation: hcFogDrift var(--fog-duration) ease-in-out infinite;
      animation-delay: var(--fog-delay);
      opacity: var(--fog-opacity);
      will-change: transform, opacity;
    }

    @keyframes hcFogDrift {
      0%, 100% { transform: translate3d(-10px, 0, 0) scaleX(0.92); }
      50% { transform: translate3d(28px, -8px, 0) scaleX(1.08); }
    }
  `}</style>
);

const ScoreTile = memo(({ label, value, accent = "text-white", compact = false }) => (
  <div className="min-w-0 rounded-lg border border-white/10 bg-slate-950/48 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md">
    <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-white/48">
      {label}
    </p>
    <Motion.p
      key={`${label}-${value}`}
      initial={{ opacity: 0, y: 8, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`mt-1 truncate font-black leading-none ${compact ? "text-sm" : "text-xl sm:text-2xl"} ${accent}`}
    >
      {value}
    </Motion.p>
  </div>
));

ScoreTile.displayName = "ScoreTile";

const StadiumBackdrop = memo(({ event }) => {
  const crowdExcited = event?.isOut || event?.runs >= 4;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="hc-stadium-core absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-[48%] bg-[linear-gradient(180deg,rgba(2,6,23,0.52),rgba(7,18,37,0.18)_45%,transparent)]" />

      <div className="absolute inset-x-[4%] top-[8%] h-[36%] rounded-b-[50%] border-b border-cyan-200/10 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.35),rgba(2,6,23,0.75)_72%)]" />
      <div className="absolute left-[10%] top-[5%] h-28 w-20 rotate-12 rounded-b-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.78),rgba(125,211,252,0.2)_32%,transparent_64%)] blur-[1px]" />
      <div className="absolute right-[10%] top-[5%] h-28 w-20 -rotate-12 rounded-b-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.78),rgba(250,204,21,0.18)_32%,transparent_64%)] blur-[1px]" />
      <div className="hc-light-beam absolute left-[15%] top-[7%] h-[72%] w-[24%] origin-top bg-[linear-gradient(100deg,rgba(186,230,253,0.2),transparent_62%)] blur-xl" />
      <div className="hc-light-beam absolute right-[12%] top-[7%] h-[72%] w-[24%] origin-top bg-[linear-gradient(260deg,rgba(254,240,138,0.18),transparent_62%)] blur-xl" />

      <div className="absolute inset-x-2 top-[17%] h-[24%] overflow-hidden rounded-[50%] border-t border-white/10 bg-black/20">
        {CROWD_DOTS.map((dot) => (
          <Motion.span
            key={dot.id}
            animate={
              crowdExcited
                ? { opacity: [0.35, 1, 0.48], y: [0, -5, 0] }
                : { opacity: [0.18, 0.56, 0.22] }
            }
            transition={{
              duration: crowdExcited ? 0.42 : 2.3,
              repeat: Infinity,
              delay: dot.delay,
              ease: "easeInOut",
            }}
            className={`absolute rounded-full ${dot.tone}`}
            style={{
              left: dot.left,
              top: dot.top,
              height: dot.size,
              width: dot.size,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.52),rgba(21,128,61,0.26)_48%,rgba(2,6,23,0)_74%)]" />
      {FOG_PARTICLES.map((fog) => (
        <span
          key={fog.id}
          className="hc-fog absolute bottom-[18%] h-12 rounded-full bg-white/18 blur-2xl"
          style={{
            left: fog.left,
            width: fog.width,
            "--fog-delay": `${fog.delay}s`,
            "--fog-duration": `${fog.duration}s`,
            "--fog-opacity": fog.opacity,
          }}
        />
      ))}
    </div>
  );
});

StadiumBackdrop.displayName = "StadiumBackdrop";

const Stumps = memo(({ broken }) => (
  <div className="absolute bottom-[22%] left-1/2 z-30 h-24 w-24 -translate-x-1/2">
    <div className="absolute bottom-0 left-1/2 flex h-24 -translate-x-1/2 items-end gap-1.5">
      {[0, 1, 2].map((stump) => (
        <Motion.span
          key={stump}
          animate={
            broken
              ? {
                  rotate: stump === 0 ? [-2, -25, -18] : stump === 2 ? [2, 24, 15] : [0, 8, -6],
                  y: [0, -7, 15],
                  x: stump === 0 ? [0, -8, -13] : stump === 2 ? [0, 8, 13] : [0, 1, -2],
                }
              : { rotate: 0, y: 0, x: 0 }
          }
          transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
          className="h-20 w-2 rounded-full bg-gradient-to-b from-amber-100 via-amber-300 to-orange-600 shadow-[0_0_18px_rgba(251,191,36,0.55)]"
        />
      ))}
    </div>
    {[0, 1].map((bail) => (
      <Motion.span
        key={bail}
        animate={
          broken
            ? {
                opacity: [1, 1, 0],
                x: bail === 0 ? [0, -22, -48] : [0, 22, 48],
                y: [0, -30, -18],
                rotate: bail === 0 ? [0, -180, -260] : [0, 180, 260],
              }
            : { opacity: 1, x: 0, y: 0, rotate: 0 }
        }
        transition={{ duration: 0.62, ease: "easeOut" }}
        className="absolute left-1/2 top-2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-amber-100 shadow-[0_0_16px_rgba(254,240,138,0.7)]"
      />
    ))}
  </div>
));

Stumps.displayName = "Stumps";

const Batsman = memo(({ swinging, out }) => (
  <div className="absolute bottom-[17%] left-[34%] z-40 h-36 w-28 sm:left-[38%]">
    <Motion.div
      animate={swinging ? { y: [0, -4, 0] } : { y: [0, -1, 0] }}
      transition={swinging ? { duration: 0.42, ease: "easeOut" } : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      className="absolute bottom-0 left-7 h-28 w-14"
    >
      <span className="absolute left-3 top-0 h-11 w-11 rounded-full bg-gradient-to-b from-amber-100 to-orange-300 shadow-[0_0_22px_rgba(251,191,36,0.38)]" />
      <span className="absolute left-4 top-10 h-16 w-9 rounded-t-full bg-gradient-to-b from-cyan-200 via-cyan-500 to-blue-800 shadow-[inset_0_-12px_24px_rgba(15,23,42,0.36)]" />
      <span className="absolute bottom-0 left-4 h-11 w-3 rotate-12 rounded-full bg-white" />
      <span className="absolute bottom-0 left-8 h-11 w-3 -rotate-12 rounded-full bg-white" />
    </Motion.div>

    <Motion.div
      animate={
        swinging
          ? {
              rotate: out ? [-36, 42, 18] : [-34, 64, -18],
              x: out ? [0, 8, -4] : [0, 16, 0],
              y: out ? [0, 0, 6] : [0, -7, 0],
            }
          : { rotate: -28, x: 0, y: 0 }
      }
      transition={{ duration: out ? 0.52 : 0.44, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-2 left-[62px] h-36 w-7 origin-bottom rounded-full bg-gradient-to-r from-[#4b250f] via-[#d79b55] to-[#f9d38c] shadow-[0_18px_28px_-18px_rgba(0,0,0,0.86)]"
    >
      <span className="absolute bottom-0 left-1/2 h-10 w-4 -translate-x-1/2 rounded-full bg-slate-950" />
      <span className="absolute left-1 top-8 h-20 w-1 rounded-full bg-white/28" />
    </Motion.div>
  </div>
));

Batsman.displayName = "Batsman";

const getBallTrajectory = (event) => {
  if (!event) return null;

  if (event.isOut) {
    return {
      x: [130, 38, 2, -8],
      y: [-38, -20, -6, 3],
      scale: [0.82, 1, 0.84, 0.35],
      opacity: [1, 1, 1, 0],
      duration: 0.58,
    };
  }

  if (event.runs === 6) {
    return {
      x: [122, 30, 136, 260],
      y: [-36, -18, -165, -310],
      scale: [0.82, 1, 0.72, 0.32],
      opacity: [1, 1, 1, 0],
      duration: 1.16,
    };
  }

  if (event.runs === 4) {
    return {
      x: [122, 28, 148, 310],
      y: [-36, -15, -44, -78],
      scale: [0.82, 1, 0.84, 0.48],
      opacity: [1, 1, 1, 0],
      duration: 0.82,
    };
  }

  return {
    x: [122, 28, 76, 128],
    y: [-36, -12, -26, -18],
    scale: [0.82, 1, 0.86, 0.56],
    opacity: [1, 1, 1, 0],
    duration: 0.66,
  };
};

const BallAnimation = memo(({ event }) => {
  const trajectory = getBallTrajectory(event);
  if (!event || !trajectory) return null;

  return (
    <Motion.div
      key={`ball-${event.id}`}
      initial={{ x: 130, y: -38, scale: 0.82, opacity: 1 }}
      animate={{
        x: trajectory.x,
        y: trajectory.y,
        scale: trajectory.scale,
        opacity: trajectory.opacity,
      }}
      transition={{ duration: trajectory.duration, ease: event.runs === 6 ? "easeOut" : "circOut" }}
      className="absolute bottom-[34%] left-1/2 z-50 h-5 w-5 rounded-full bg-gradient-to-br from-red-400 via-red-700 to-red-950 shadow-[0_0_26px_rgba(248,113,113,0.95)]"
    >
      <span className="absolute left-1 top-1 h-3 w-0.5 rotate-45 rounded-full bg-white/70" />
      {!event.isOut && event.runs >= 4 ? (
        <span className="absolute right-3 top-2 h-1.5 w-28 rounded-full bg-gradient-to-l from-white/80 to-transparent blur-[1px]" />
      ) : null}
    </Motion.div>
  );
});

BallAnimation.displayName = "BallAnimation";

const SparkLayer = memo(({ event }) => {
  if (!event) return null;

  return (
    <div className="pointer-events-none absolute bottom-[32%] left-[48%] z-50 h-20 w-20">
      {SPARKS.slice(0, event.isOut ? 12 : event.runs >= 4 ? 18 : 9).map((spark) => (
        <Motion.span
          key={`${event.id}-spark-${spark.id}`}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.15 }}
          animate={{
            opacity: [0, 1, 0],
            x: Math.cos(spark.angle) * spark.distance,
            y: Math.sin(spark.angle) * (spark.distance * 0.75),
            scale: [0.15, 1, 0.08],
          }}
          transition={{ duration: 0.45, delay: spark.delay, ease: "easeOut" }}
          className={`absolute left-1/2 top-1/2 h-1.5 rounded-full ${
            event.isOut
              ? "w-10 bg-rose-300 shadow-[0_0_16px_rgba(251,113,133,0.9)]"
              : "w-8 bg-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.9)]"
          }`}
        />
      ))}
    </div>
  );
});

SparkLayer.displayName = "SparkLayer";

const ConfettiBurst = memo(({ event }) => {
  if (event?.runs !== 6) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[70] overflow-hidden">
      {CONFETTI.map((piece) => (
        <Motion.span
          key={`${event.id}-confetti-${piece.id}`}
          initial={{ opacity: 0, y: 80, rotate: 0, scale: 0.55 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [80, -130, -240],
            x: [0, piece.drift],
            rotate: piece.rotate,
            scale: [0.55, 1, 0.8],
          }}
          transition={{ duration: 1.22, delay: piece.delay, ease: "easeOut" }}
          className={`absolute top-[52%] h-3 w-1.5 rounded-sm ${piece.color}`}
          style={{ left: `${piece.left}%` }}
        />
      ))}
    </div>
  );
});

ConfettiBurst.displayName = "ConfettiBurst";

const ChoiceReveal = memo(({ event }) => {
  if (!event) return null;

  return (
    <Motion.div
      key={`reveal-${event.id}`}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="absolute inset-x-3 top-3 z-[65] grid grid-cols-2 gap-2 sm:inset-x-auto sm:left-1/2 sm:w-[390px] sm:-translate-x-1/2"
    >
      {[
        { label: event.batterName, sub: "Batter", value: event.batterPick, tone: "from-lime-300 to-cyan-300" },
        { label: event.bowlerName, sub: "Opponent", value: event.bowlerPick, tone: "from-amber-300 to-orange-400" },
      ].map((choice, index) => (
        <div
          key={choice.sub}
          className="rounded-lg border border-white/12 bg-slate-950/62 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl"
        >
          <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-white/48">
            {choice.sub}
          </p>
          <Motion.div
            initial={{ rotateY: -86, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.08 + index * 0.1, ease: "easeOut" }}
            className={`mx-auto mt-2 grid h-14 w-14 place-items-center rounded-lg bg-gradient-to-br ${choice.tone} text-3xl font-black text-slate-950 shadow-[0_0_28px_rgba(132,204,22,0.42)]`}
          >
            {choice.value}
          </Motion.div>
          <p className="mt-2 truncate text-xs font-bold text-white/72">{choice.label}</p>
        </div>
      ))}
    </Motion.div>
  );
});

ChoiceReveal.displayName = "ChoiceReveal";

const ResultSticker = memo(({ event }) => {
  if (!event) return null;

  const boundaryLabel = event.runs === 6 ? "SIX!" : event.runs === 4 ? "FOUR!" : `+${event.runs}`;

  return (
    <Motion.div
      key={`sticker-${event.id}`}
      initial={{ opacity: 0, scale: 0.42, y: 30, rotate: event.isOut ? -8 : -4 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.42, 1.18, 1, 0.92], y: [30, 0, -10, -46], rotate: [event.isOut ? -8 : -4, 3, 0, 4] }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: event.isOut ? 1.28 : event.runs === 6 ? 1.24 : 1.02, ease: "easeOut" }}
      className="pointer-events-none absolute inset-x-0 top-[31%] z-[80] flex justify-center px-4"
    >
      <div
        className={`rounded-lg px-7 py-4 text-center font-black leading-none ${
          event.isOut
            ? "bg-gradient-to-r from-red-400 via-rose-500 to-red-700 text-white shadow-[0_0_60px_rgba(244,63,94,0.9)]"
            : "bg-gradient-to-r from-amber-200 via-lime-300 to-cyan-300 text-slate-950 shadow-[0_0_52px_rgba(132,204,22,0.75)]"
        }`}
      >
        <span className="block text-5xl sm:text-7xl">{event.isOut ? "OUT!" : boundaryLabel}</span>
        <span className="mt-2 block text-xs uppercase tracking-[0.18em] text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.55)]">
          {event.isOut ? "Numbers matched" : `${event.batterPick} runs added`}
        </span>
      </div>
    </Motion.div>
  );
});

ResultSticker.displayName = "ResultSticker";

const PitchScene = memo(({ event, screenShake, complete }) => {
  const isOut = Boolean(event?.isOut);
  const isBoundary = Boolean(event && event.runs >= 4);

  return (
    <Motion.div
      animate={
        screenShake
          ? { x: [0, -9, 8, -6, 4, 0], rotate: [0, -0.35, 0.25, -0.15, 0] }
          : { x: 0, rotate: 0 }
      }
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative min-h-[500px] overflow-hidden rounded-lg border border-white/10 bg-slate-950 shadow-[0_34px_90px_-52px_rgba(0,0,0,0.95),inset_0_0_80px_rgba(255,255,255,0.04)] sm:min-h-[590px]"
    >
      <StadiumBackdrop event={event} />
      <ConfettiBurst event={event} />
      <ChoiceReveal event={event} />
      <ResultSticker event={event} />

      <AnimatePresence>
        {event ? (
          <Motion.div
            key={`flash-${event.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, event.isOut ? 0.5 : 0.28, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38, ease: "easeOut" }}
            className={`absolute inset-0 z-[55] ${event.isOut ? "bg-rose-500" : "bg-amber-200"}`}
          />
        ) : null}
      </AnimatePresence>

      <div className="absolute inset-x-[5%] bottom-[3%] h-[38%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(74,222,128,0.65),rgba(22,101,52,0.58)_46%,rgba(2,6,23,0)_74%)] blur-[1px]" />

      <Motion.div
        animate={event ? { scale: isBoundary ? [1, 1.035, 1] : [1, 1.018, 1] } : { scale: 1 }}
        transition={{ duration: isBoundary ? 0.82 : 0.42, ease: "easeOut" }}
        className="absolute inset-0 z-20"
      >
        <div
          className="absolute bottom-[5%] left-1/2 h-[56%] w-[42%] min-w-[178px] -translate-x-1/2 rounded-[50%] border border-amber-100/28 bg-[linear-gradient(180deg,rgba(205,151,88,0.94),rgba(151,96,50,0.95)_54%,rgba(91,54,32,0.98))] shadow-[0_0_80px_rgba(251,191,36,0.14)]"
          style={{ transform: "translateX(-50%) perspective(760px) rotateX(62deg)" }}
        >
          <div className="absolute inset-x-[45%] top-0 h-full border-x border-white/32" />
          <div className="absolute inset-x-[17%] top-[18%] h-px bg-white/45" />
          <div className="absolute inset-x-[17%] bottom-[18%] h-px bg-white/45" />
          <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12" />
        </div>

        <Stumps broken={isOut} />
        <Batsman swinging={Boolean(event)} out={isOut} />
        <SparkLayer event={event} />
        <BallAnimation event={event} />
      </Motion.div>

      <AnimatePresence>
        {event?.runs === 6 ? (
          <Motion.div
            key={`combo-six-${event.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: [0, 1, 1, 0], y: [12, 0, 0, -10] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="absolute left-4 top-4 z-[70] rounded-lg border border-amber-200/28 bg-black/36 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100 backdrop-blur"
          >
            Maximum
          </Motion.div>
        ) : null}
      </AnimatePresence>

      {complete ? <div className="absolute inset-0 z-[45] bg-slate-950/20 backdrop-blur-[1px]" /> : null}
    </Motion.div>
  );
});

PitchScene.displayName = "PitchScene";

const ModeToggle = memo(({ mode, onChange, disabled }) => (
  <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-slate-950/46 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md">
    {[
      { key: "bot", label: "Play Bot" },
      { key: "friend", label: "2 Player" },
    ].map((item) => (
      <Motion.button
        key={item.key}
        type="button"
        onClick={() => onChange(item.key)}
        disabled={disabled}
        whileTap={{ scale: 0.96 }}
        className={`rounded-md px-3 py-2 text-sm font-black transition ${
          mode === item.key
            ? "bg-gradient-to-r from-lime-300 to-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(132,204,22,0.55)]"
            : "text-white/62 hover:bg-white/8 hover:text-white"
        } disabled:cursor-not-allowed disabled:opacity-45`}
      >
        {item.label}
      </Motion.button>
    ))}
  </div>
));

ModeToggle.displayName = "ModeToggle";

const NumberPad = memo(({ onPick, disabled, activePrompt }) => (
  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-3">
    {BALL_CHOICES.map((value) => (
      <Motion.button
        key={value}
        type="button"
        onClick={() => onPick(value)}
        disabled={disabled}
        whileHover={disabled ? undefined : { y: -3, scale: 1.03 }}
        whileTap={disabled ? undefined : { scale: 0.92, y: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        aria-label={`${activePrompt}: choose ${value}`}
        className="group relative aspect-[1.18] min-h-20 overflow-hidden rounded-lg border border-lime-200/18 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.22),transparent_24%),linear-gradient(145deg,rgba(20,83,45,0.95),rgba(6,78,59,0.96)_50%,rgba(8,47,73,0.98))] text-left shadow-[0_20px_50px_-32px_rgba(34,211,238,0.9),inset_0_1px_0_rgba(255,255,255,0.14)] transition disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.2),transparent)] opacity-0 transition group-hover:opacity-100" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-lime-200 shadow-[0_0_14px_rgba(190,242,100,0.95)]" />
        <span className="absolute bottom-2 left-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/62">
          Run
        </span>
        <span className="absolute inset-0 grid place-items-center text-4xl font-black text-white drop-shadow-[0_5px_16px_rgba(0,0,0,0.5)]">
          {value}
        </span>
      </Motion.button>
    ))}
  </div>
));

NumberPad.displayName = "NumberPad";

const BallLog = memo(({ log }) => (
  <div className="rounded-lg border border-white/10 bg-slate-950/44 p-4 backdrop-blur-md">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/46">Ball log</p>
      <span className="text-xs font-black text-white/60">{log.length ? `${log.length} played` : "Ready"}</span>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      {log.length ? (
        log.slice(0, 10).map((entry) => (
          <Motion.span
            key={entry.id}
            initial={{ opacity: 0, y: 8, scale: 0.86 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`grid h-10 min-w-10 place-items-center rounded-md px-2 text-xs font-black ${
              entry.isOut
                ? "bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.5)]"
                : entry.runs >= 4
                ? "bg-amber-300 text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.42)]"
                : "bg-white/10 text-white"
            }`}
            title={`${entry.batterPick} vs ${entry.bowlerPick}`}
          >
            {entry.isOut ? "W" : entry.runs}
          </Motion.span>
        ))
      ) : (
        <span className="rounded-md border border-dashed border-white/12 px-3 py-2 text-sm font-bold text-white/44">
          First ball waiting
        </span>
      )}
    </div>
  </div>
));

BallLog.displayName = "BallLog";

const InningsBanner = memo(({ summary, players }) => {
  if (!summary) return null;

  return (
    <Motion.div
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="rounded-lg border border-amber-200/24 bg-amber-300/14 p-4 text-amber-50 shadow-[0_0_28px_rgba(251,191,36,0.16)]"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/64">
        Innings break
      </p>
      <p className="mt-1 text-lg font-black">
        {players[0]} made {summary.score}/{summary.out ? 1 : 0}. {players[1]} need {summary.target}.
      </p>
    </Motion.div>
  );
});

InningsBanner.displayName = "InningsBanner";

const FinalPanel = memo(({ game, players, onRestart }) => {
  if (!game.complete) return null;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ duration: 0.26, ease: "easeOut" }}
      className="rounded-lg border border-cyan-200/18 bg-slate-950/66 p-5 text-white shadow-[0_0_42px_rgba(34,211,238,0.16)] backdrop-blur-xl"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/58">
        Final score
      </p>
      <h3 className="mt-2 text-3xl font-black leading-tight">{game.winnerLabel || "Innings complete"}</h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {players.map((player, index) => (
          <div key={player} className="rounded-lg border border-white/10 bg-white/8 p-3">
            <p className="truncate text-xs font-black text-white/58">{player}</p>
            <p className="mt-1 text-3xl font-black text-amber-100">
              {game.scores[index]}/{game.outs[index]}
            </p>
          </div>
        ))}
      </div>
      <Motion.button
        type="button"
        onClick={onRestart}
        whileTap={{ scale: 0.96 }}
        className="mt-4 w-full rounded-lg bg-gradient-to-r from-lime-300 via-emerald-300 to-cyan-300 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_28px_rgba(132,204,22,0.48)]"
      >
        New Match
      </Motion.button>
    </Motion.div>
  );
});

FinalPanel.displayName = "FinalPanel";

const PlayerScoreCard = memo(({ name, active, score, out }) => (
  <div
    className={`rounded-lg border p-4 transition ${
      active
        ? "border-lime-200/35 bg-lime-300/12 shadow-[0_0_28px_rgba(132,204,22,0.18)]"
        : "border-white/10 bg-white/7"
    }`}
  >
    <div className="flex items-center justify-between gap-3">
      <p className="truncate text-sm font-black text-white">{name}</p>
      <span
        className={`rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
          active ? "bg-lime-300 text-slate-950" : "bg-white/10 text-white/50"
        }`}
      >
        {active ? "Batting" : "Waiting"}
      </span>
    </div>
    <Motion.p
      key={`${name}-${score}-${out}`}
      initial={{ scale: 0.94, opacity: 0.7 }}
      animate={{ scale: [1, 1.06, 1], opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="mt-3 text-4xl font-black text-amber-100"
    >
      {score}/{out}
    </Motion.p>
  </div>
));

PlayerScoreCard.displayName = "PlayerScoreCard";

const CricketMiniGame = ({ restaurants = [], onComplete = () => {} }) => {
  const [mode, setMode] = useState("bot");
  const [game, setGame] = useState(createInitialGame);
  const [fieldEvent, setFieldEvent] = useState(null);
  const [screenShake, setScreenShake] = useState(false);
  const [resolving, setResolving] = useState(false);
  const timeoutsRef = useRef([]);
  const arenaRef = useMovingStadiumLight();
  const { enabled: soundEnabled, setEnabled: setSoundEnabled, play, startAmbience } =
    useHandCricketAudio();

  const players = useMemo(() => MODE_PLAYERS[mode], [mode]);
  const battingIndex = game.innings;
  const bowlingIndex = game.innings === 0 ? 1 : 0;
  const battingName = players[battingIndex];
  const bowlingName = players[bowlingIndex];
  const chasing = game.innings === 1;
  const target = chasing ? game.target || game.scores[0] + 1 : null;
  const remaining = target ? Math.max(0, target - game.scores[1]) : null;
  const ballsLeft = Math.max(0, TOTAL_BALLS - game.balls);
  const currentBall = game.complete ? "-" : `${Math.min(TOTAL_BALLS, game.balls + 1)}/${TOTAL_BALLS}`;
  const prompt =
    mode === "bot"
      ? battingIndex === 0
        ? "Pick your batting run"
        : "Pick your bowling number"
      : game.phase === "bat-select"
      ? `${battingName} picks runs`
      : `${bowlingName} tries to match`;
  const lastMoveLabel = fieldEvent
    ? `${fieldEvent.batterPick} vs ${fieldEvent.bowlerPick}`
    : game.lastMove?.detail || "Start first ball";

  const queueTimeout = useCallback((callback, delay) => {
    const id = window.setTimeout(callback, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const clearQueuedTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => clearQueuedTimeouts, [clearQueuedTimeouts]);

  const restart = useCallback(
    (nextMode = mode) => {
      clearQueuedTimeouts();
      setMode(nextMode);
      setGame(createInitialGame());
      setFieldEvent(null);
      setResolving(false);
      setScreenShake(false);
      play("click");
      startAmbience();
    },
    [clearQueuedTimeouts, mode, play, startAmbience]
  );

  const submitFinalScore = useCallback(
    (finalGame, winnerIndex, meta = {}) => {
      const rewardScore = getRewardScore({
        scores: finalGame.scores,
        outs: finalGame.outs,
        balls: finalGame.balls,
        mode,
        winnerIndex,
      });
      const winnerLabel =
        winnerIndex === -1 ? "Match tied" : `${players[winnerIndex]} won`;

      queueTimeout(() => {
        onComplete({
          score: rewardScore,
          title: `${winnerLabel}: ${finalGame.scores[0]}/${finalGame.outs[0]} - ${finalGame.scores[1]}/${finalGame.outs[1]}`,
          restaurant: pickResultRestaurant(restaurants, finalGame.scores[0] + finalGame.scores[1]),
          meta: {
            mode,
            innings1: finalGame.scores[0],
            innings2: finalGame.scores[1],
            outs1: finalGame.outs[0],
            outs2: finalGame.outs[1],
            winner: winnerIndex === -1 ? "tie" : players[winnerIndex],
            ...meta,
          },
        });
      }, 760);
    },
    [mode, onComplete, players, queueTimeout, restaurants]
  );

  const finishMatch = useCallback(
    (nextGame, meta = {}) => {
      const [first, second] = nextGame.scores;
      const winnerIndex = first === second ? -1 : first > second ? 0 : 1;
      const winnerLabel = winnerIndex === -1 ? "Match tied" : `${players[winnerIndex]} won`;
      const finalGame = {
        ...nextGame,
        complete: true,
        phase: "complete",
        pendingBatPick: null,
        winnerLabel,
        lastMove: {
          title: winnerLabel,
          detail: `${nextGame.scores[0]}/${nextGame.outs[0]} - ${nextGame.scores[1]}/${nextGame.outs[1]}`,
        },
      };

      setGame(finalGame);
      submitFinalScore(finalGame, winnerIndex, meta);
    },
    [players, submitFinalScore]
  );

  const settleDelivery = useCallback(
    ({ batterPick, bowlerPick }) => {
      const ballNumber = game.balls + 1;
      const isOut = batterPick === bowlerPick;
      const runs = isOut ? 0 : batterPick;
      const nextScores = [...game.scores];
      const nextOuts = [...game.outs];
      const eventId = `${game.innings}-${ballNumber}-${batterPick}-${bowlerPick}-${Date.now()}`;

      if (isOut) {
        nextOuts[battingIndex] = 1;
      } else {
        nextScores[battingIndex] += runs;
      }

      const nextEvent = {
        id: eventId,
        innings: game.innings,
        ballNumber,
        batterName: battingName,
        bowlerName: bowlingName,
        batterPick,
        bowlerPick,
        runs,
        isOut,
      };
      const nextLogEntry = {
        id: eventId,
        innings: game.innings,
        ball: ballNumber,
        batter: battingName,
        bowler: bowlingName,
        batterPick,
        bowlerPick,
        runs,
        isOut,
        total: nextScores[battingIndex],
      };
      const nextLog = [nextLogEntry, ...game.log].slice(0, 10);

      setFieldEvent(nextEvent);
      play("bat");

      queueTimeout(() => {
        if (isOut) {
          play("wicket");
          setScreenShake(true);
          queueTimeout(() => setScreenShake(false), 320);
          return;
        }

        if (runs === 6) {
          play("six");
          return;
        }

        if (runs === 4) {
          play("cheer");
          return;
        }

        play("score");
      }, 85);

      queueTimeout(() => {
        const chaseWon = chasing && nextScores[1] >= (game.target || game.scores[0] + 1);
        const inningsEnded = isOut || ballNumber >= TOTAL_BALLS;
        const baseGame = {
          ...game,
          balls: ballNumber,
          scores: nextScores,
          outs: nextOuts,
          pendingBatPick: null,
          phase: "bat-select",
          log: nextLog,
          lastMove: {
            title: isOut ? `${battingName} is out` : `${battingName} +${runs}`,
            detail: isOut ? `${batterPick} matched ${bowlerPick}` : `${batterPick} vs ${bowlerPick}`,
          },
          inningsSummary: null,
          streak: isOut ? 0 : game.streak + 1,
        };

        if (chaseWon || (chasing && inningsEnded)) {
          finishMatch(baseGame, { chase: chaseWon, out: isOut, ball: ballNumber });
          return;
        }

        if (inningsEnded) {
          setGame({
            ...baseGame,
            innings: 1,
            balls: 0,
            target: nextScores[0] + 1,
            streak: 0,
            inningsSummary: {
              id: eventId,
              score: nextScores[0],
              out: isOut,
              target: nextScores[0] + 1,
              balls: ballNumber,
            },
            lastMove: {
              title: isOut ? `${battingName} out` : `${battingName} innings complete`,
              detail: `${players[1]} need ${nextScores[0] + 1}`,
            },
          });
          return;
        }

        setGame(baseGame);
      }, isOut ? 520 : 360);

      queueTimeout(() => setResolving(false), isOut ? 980 : runs === 6 ? 1120 : 760);
      queueTimeout(() => setFieldEvent(null), isOut ? 1400 : runs === 6 ? 1380 : 1120);
    },
    [
      battingIndex,
      battingName,
      bowlingName,
      chasing,
      finishMatch,
      game,
      play,
      players,
      queueTimeout,
    ]
  );

  const playNumber = useCallback(
    (value) => {
      if (resolving || game.complete) return;

      play("click");
      startAmbience();

      if (game.inningsSummary) {
        setGame((current) => ({ ...current, inningsSummary: null }));
      }

      if (mode === "friend" && game.phase === "bat-select") {
        setGame((current) => ({
          ...current,
          pendingBatPick: value,
          phase: "bowl-select",
          lastMove: {
            title: `${battingName} locked in`,
            detail: `${bowlingName} to bowl`,
          },
        }));
        return;
      }

      setResolving(true);
      setScreenShake(false);

      if (mode === "bot") {
        const botPick = getRandomNumber();
        if (battingIndex === 0) {
          settleDelivery({ batterPick: value, bowlerPick: botPick });
        } else {
          settleDelivery({ batterPick: botPick, bowlerPick: value });
        }
        return;
      }

      settleDelivery({
        batterPick: game.pendingBatPick || value,
        bowlerPick: value,
      });
    },
    [
      battingIndex,
      battingName,
      bowlingName,
      game.complete,
      game.inningsSummary,
      game.pendingBatPick,
      game.phase,
      mode,
      play,
      resolving,
      settleDelivery,
      startAmbience,
    ]
  );

  const toggleSound = useCallback(() => {
    setSoundEnabled((value) => !value);
  }, [setSoundEnabled]);

  return (
    <div
      ref={arenaRef}
      className="hc-arena relative overflow-hidden rounded-lg border border-white/10 bg-slate-950 p-3 text-white shadow-[0_36px_110px_-58px_rgba(15,23,42,0.95)] sm:p-4"
    >
      <HandCricketStyles />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(34,211,238,0.2),transparent_26%),radial-gradient(circle_at_88%_18%,rgba(251,191,36,0.16),transparent_24%),linear-gradient(135deg,#020617_0%,#051b2f_46%,#052e1a_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.1),transparent_22%,rgba(255,255,255,0.04)_50%,transparent_74%)]" />

      <div className="relative z-10 space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr,1fr,1fr,1fr,1.2fr,1fr]">
          <ScoreTile label="Total score" value={`${game.scores[battingIndex]}/${game.outs[battingIndex]}`} accent="text-amber-100" />
          <ScoreTile label="Balls left" value={ballsLeft} accent="text-cyan-100" />
          <ScoreTile label="Current ball" value={currentBall} />
          <ScoreTile label="Wickets" value={`${game.outs[battingIndex]}/1`} accent="text-rose-100" />
          <ScoreTile label="Last move" value={lastMoveLabel} compact />
          <ScoreTile label="Target" value={target || "Set"} accent="text-lime-100" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),360px]">
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-slate-950/48 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-100/62">
                    Floodlit hand cricket
                  </p>
                  <Motion.h3
                    key={game.lastMove?.title || prompt}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="mt-1 text-2xl font-black leading-tight text-white sm:text-3xl"
                  >
                    {game.lastMove?.title || prompt}
                  </Motion.h3>
                  <p className="mt-1 text-sm font-bold text-white/60">
                    {chasing && remaining !== null
                      ? `${battingName} need ${remaining} from ${ballsLeft} balls`
                      : game.phase === "bowl-select" && mode === "friend"
                      ? "Batter number is locked. Pass the device for the bowl pick."
                      : `${battingName} batting, ${bowlingName} trying to match.`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md border border-lime-200/20 bg-lime-300/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-lime-100">
                    Innings {game.innings + 1}
                  </span>
                  <AnimatePresence>
                    {game.streak >= 2 && !game.complete ? (
                      <Motion.span
                        key={game.streak}
                        initial={{ opacity: 0, scale: 0.8, y: 6 }}
                        animate={{ opacity: 1, scale: [1, 1.08, 1], y: 0 }}
                        exit={{ opacity: 0, scale: 0.88 }}
                        className="rounded-md bg-amber-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_22px_rgba(251,191,36,0.55)]"
                      >
                        Streak x{game.streak}
                      </Motion.span>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <PitchScene event={fieldEvent} screenShake={screenShake} complete={game.complete} />
          </div>

          <aside className="space-y-4">
            <ModeToggle mode={mode} onChange={restart} disabled={resolving} />

            <div className="grid grid-cols-2 gap-3">
              {players.map((player, index) => (
                <PlayerScoreCard
                  key={player}
                  name={player}
                  active={battingIndex === index && !game.complete}
                  score={game.scores[index]}
                  out={game.outs[index]}
                />
              ))}
            </div>

            <AnimatePresence>
              <InningsBanner summary={game.inningsSummary} players={players} />
            </AnimatePresence>

            <div className="rounded-lg border border-white/10 bg-slate-950/48 p-4 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/46">
                    Choose 1 to 6
                  </p>
                  <p className="mt-1 text-base font-black text-white">{prompt}</p>
                </div>
                {mode === "friend" && game.phase === "bowl-select" ? (
                  <Motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-md bg-cyan-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950"
                  >
                    Locked
                  </Motion.span>
                ) : null}
              </div>
              <NumberPad onPick={playNumber} disabled={resolving || game.complete} activePrompt={prompt} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Motion.button
                type="button"
                onClick={toggleSound}
                whileTap={{ scale: 0.96 }}
                className="rounded-lg border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-white transition hover:bg-white/12"
              >
                Audio {soundEnabled ? "On" : "Off"}
              </Motion.button>
              <Motion.button
                type="button"
                onClick={() => restart(mode)}
                whileTap={{ scale: 0.96 }}
                className="rounded-lg border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-white transition hover:bg-white/12"
              >
                Reset
              </Motion.button>
            </div>

            <BallLog log={game.log} />

            <AnimatePresence>
              <FinalPanel game={game} players={players} onRestart={() => restart(mode)} />
            </AnimatePresence>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CricketMiniGame;
