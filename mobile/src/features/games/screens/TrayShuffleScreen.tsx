import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  makeMutable,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Screen } from "@/components";
import { useTheme } from "@/hooks/useTheme";
import { GameHeader, PauseOverlay } from "@/features/games/components/GameShell";
import { GameOverPanel } from "@/features/games/components/GameOverPanel";
import { useAppActive } from "@/features/games/hooks/useGameLoop";
import { useBestScore } from "@/features/games/hooks/useBestScore";
import { useGameSession } from "@/features/games/hooks/useGameSession";
import { useHaptics } from "@/features/games/hooks/useHaptics";

const TRAYS = 3;
const LIVES = 3;
const BASE_POINTS = 30;
const ROUND_BONUS = 10;
/** Swap animation length at round 1; shrinks as rounds go up. */
const BASE_SWAP_MS = 460;
const MIN_SWAP_MS = 170;
const PEEK_MS = 900;

type Phase = "ready" | "peek" | "shuffling" | "choosing" | "reveal" | "paused" | "over";

/**
 * Tray Shuffle.
 *
 * Watch which tray covers the dish, follow it through the shuffle, then tap it.
 * Each cleared round adds a swap and shortens the animation, so difficulty
 * comes from speed rather than from hiding information.
 *
 * The trays' on-screen order lives in a ref and their positions are animated
 * shared values; a swap therefore costs one timing animation per tray and no
 * React render at all.
 */
export const TrayShuffleScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const haptics = useHaptics();
  const { width } = useWindowDimensions();

  const [phase, setPhase] = useState<Phase>("ready");
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [revealIndex, setRevealIndex] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const { best, record } = useBestScore("tray-shuffle");
  const session = useGameSession("tray-shuffle");
  const runId = useRef("");

  /* ── Layout ─────────────────────────────────────────────────────────── */
  const slotWidth = useMemo(() => Math.min(112, (width - 64) / TRAYS), [width]);
  const gap = 14;
  const slotX = useCallback(
    (slot: number) => slot * (slotWidth + gap),
    [slotWidth]
  );

  /**
   * `order[trayId] = slot`. The dish is tied to a tray id, so it travels with
   * that tray through every swap.
   */
  const order = useRef<number[]>([0, 1, 2]);
  const dishTray = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scoreRef = useRef(0);
  const roundRef = useRef(1);
  scoreRef.current = score;
  roundRef.current = round;

  const offsets = useMemo<SharedValue<number>[]>(
    () => Array.from({ length: TRAYS }, (_, index) => makeMutable(index * (112 + 14))),
    []
  );

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const finish = useCallback(
    (endScore: number) => {
      clearTimers();
      setFinalScore(endScore);
      setIsNewBest(record(endScore));
      haptics.success();
      session.submit(runId.current, { score: endScore, meta: { rounds: roundRef.current } });
      setPhase("over");
    },
    [clearTimers, haptics, record, session]
  );

  /* ── Round flow ─────────────────────────────────────────────────────── */
  const runShuffle = useCallback(
    (roundNumber: number) => {
      const swaps = 3 + roundNumber;
      const duration = Math.max(MIN_SWAP_MS, BASE_SWAP_MS - (roundNumber - 1) * 40);
      setPhase("shuffling");

      for (let i = 0; i < swaps; i += 1) {
        later(() => {
          // Pick two distinct trays and exchange their slots.
          const a = Math.floor(Math.random() * TRAYS);
          let b = Math.floor(Math.random() * TRAYS);
          if (b === a) b = (b + 1) % TRAYS;

          const slotA = order.current[a];
          const slotB = order.current[b];
          order.current[a] = slotB;
          order.current[b] = slotA;

          offsets[a].value = withTiming(slotX(slotB), { duration });
          offsets[b].value = withTiming(slotX(slotA), { duration });
        }, i * duration);
      }

      later(() => setPhase("choosing"), swaps * duration + 120);
    },
    [later, offsets, slotX]
  );

  const beginRound = useCallback(
    (roundNumber: number) => {
      clearTimers();
      setRevealIndex(null);

      order.current = [0, 1, 2];
      dishTray.current = Math.floor(Math.random() * TRAYS);
      offsets.forEach((offset, index) => {
        offset.value = withTiming(slotX(index), { duration: 200 });
      });

      setPhase("peek");
      later(() => runShuffle(roundNumber), PEEK_MS);
    },
    [clearTimers, later, offsets, runShuffle, slotX]
  );

  const start = useCallback(() => {
    runId.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setScore(0);
    setRound(1);
    setLives(LIVES);
    setFinalScore(0);
    setIsNewBest(false);
    session.reset();
    beginRound(1);
  }, [beginRound, session]);

  const choose = useCallback(
    (trayId: number) => {
      if (phase !== "choosing") return;

      const correct = trayId === dishTray.current;
      setRevealIndex(dishTray.current);
      setWasCorrect(correct);
      setPhase("reveal");

      if (correct) {
        haptics.light();
        const gained = BASE_POINTS + (round - 1) * ROUND_BONUS;
        const nextScore = scoreRef.current + gained;
        setScore(nextScore);
        later(() => {
          setRound((prev) => {
            beginRound(prev + 1);
            return prev + 1;
          });
        }, 900);
        return;
      }

      haptics.warn();
      setLives((prev) => {
        const remaining = prev - 1;
        if (remaining <= 0) later(() => finish(scoreRef.current), 900);
        else later(() => beginRound(roundRef.current), 900);
        return remaining;
      });
    },
    [beginRound, finish, haptics, later, phase, round]
  );

  useAppActive(
    useCallback(() => {
      setPhase((prev) => {
        if (prev === "choosing") return "paused";
        return prev;
      });
    }, [])
  );

  const dishVisible = phase === "peek" || phase === "reveal";

  return (
    <Screen padded={false} edges={["top", "bottom"]}>
      <GameHeader
        score={score}
        lives={lives}
        extra={{ label: "Round", value: round }}
        paused={phase === "paused"}
        onTogglePause={() =>
          setPhase((prev) =>
            prev === "choosing" ? "paused" : prev === "paused" ? "choosing" : prev
          )
        }
      />

      <View style={styles.body}>
        <Text style={[styles.prompt, { color: theme.colors.textMuted }]}>
          {phase === "peek"
            ? "Remember which tray"
            : phase === "shuffling"
              ? "Follow it…"
              : phase === "choosing"
                ? "Tap the tray with the dish"
                : phase === "reveal"
                  ? wasCorrect
                    ? "Correct"
                    : "Not that one"
                  : " "}
        </Text>

        <View style={[styles.stage, { width: slotWidth * TRAYS + gap * (TRAYS - 1) }]}>
          {offsets.map((offset, trayId) => (
            <Tray
              key={trayId}
              offset={offset}
              width={slotWidth}
              hasDish={trayId === dishTray.current}
              showDish={dishVisible && trayId === dishTray.current}
              wrong={phase === "reveal" && !wasCorrect && revealIndex !== trayId}
              disabled={phase !== "choosing"}
              onPress={() => choose(trayId)}
            />
          ))}
        </View>
      </View>

      {phase === "ready" ? (
        <View style={[styles.intro, { backgroundColor: theme.colors.background }]}>
          <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: "800" }}>
            Tray Shuffle
          </Text>
          <Text style={[styles.introBody, { color: theme.colors.textMuted }]}>
            One tray hides the dish. Watch where it goes, then tap it once the shuffling stops.
            Every round adds a swap and speeds things up. You have {LIVES} lives.
          </Text>
          <Pressable
            onPress={start}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: "800", fontSize: 16 }}>
              Start
            </Text>
          </Pressable>
          {best > 0 ? (
            <Text style={{ color: theme.colors.textFaint, fontSize: 12, marginTop: 14, fontWeight: "700" }}>
              Your best {best}
            </Text>
          ) : null}
        </View>
      ) : null}

      <PauseOverlay
        visible={phase === "paused"}
        onResume={() => setPhase("choosing")}
        onQuit={() => finish(score)}
      />

      {phase === "over" ? (
        <GameOverPanel
          score={finalScore}
          best={best}
          isNewBest={isNewBest}
          status={session.status}
          award={session.award}
          error={session.error}
          offline={session.offline}
          detail={`Reached round ${round}`}
          onRetry={session.retry}
          onPlayAgain={start}
          onExit={() => navigation.goBack()}
        />
      ) : null}
    </Screen>
  );
};

const Tray: React.FC<{
  offset: SharedValue<number>;
  width: number;
  hasDish: boolean;
  showDish: boolean;
  wrong: boolean;
  disabled: boolean;
  onPress: () => void;
}> = React.memo(({ offset, width, showDish, wrong, disabled, onPress }) => {
  const { theme } = useTheme();

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <Animated.View style={[styles.tray, style, { width }]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Tray"
        style={({ pressed }) => [
          styles.trayBody,
          {
            backgroundColor: showDish ? theme.colors.warningSoft : theme.colors.card,
            borderColor: showDish
              ? theme.colors.warning
              : wrong
                ? theme.colors.border
                : theme.colors.borderStrong,
            borderRadius: theme.radius.md,
            opacity: pressed && !disabled ? 0.8 : wrong ? 0.5 : 1,
          },
        ]}
      >
        {showDish ? (
          <View style={[styles.dish, { backgroundColor: theme.colors.warning }]} />
        ) : (
          <View style={[styles.lid, { backgroundColor: theme.colors.borderStrong }]} />
        )}
      </Pressable>
    </Animated.View>
  );
});
Tray.displayName = "Tray";

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  prompt: { fontSize: 14, fontWeight: "700", marginBottom: 28, minHeight: 20 },
  stage: { height: 130 },
  tray: { position: "absolute", left: 0, top: 0, height: 110 },
  trayBody: { flex: 1, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dish: { width: 42, height: 42, borderRadius: 21 },
  lid: { width: "68%", height: 8, borderRadius: 4 },
  intro: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    zIndex: 30,
  },
  introBody: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 14, maxWidth: 330 },
  startButton: { marginTop: 26, paddingHorizontal: 34, paddingVertical: 15, borderRadius: 14 },
});
