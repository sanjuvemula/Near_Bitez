import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Screen } from "@/components";
import { useTheme } from "@/hooks/useTheme";
import { GameHeader, PauseOverlay } from "@/features/games/components/GameShell";
import { GameOverPanel } from "@/features/games/components/GameOverPanel";
import { useAppActive } from "@/features/games/hooks/useGameLoop";
import { useBestScore } from "@/features/games/hooks/useBestScore";
import { useGameSession } from "@/features/games/hooks/useGameSession";
import { useHaptics } from "@/features/games/hooks/useHaptics";

const ROUND_SECONDS = 60;
const PAIRS = 8;
const MATCH_POINTS = 25;
const STREAK_BONUS = 10;
const MISMATCH_PENALTY = 5;
/** How long a wrong pair stays face-up before flipping back. */
const PEEK_MS = 700;

/** Card faces, drawn as coloured tiles — the web game used no image assets either. */
const FACES = [
  { label: "Biryani", hue: "#f59e0b" },
  { label: "Pizza", hue: "#ef4444" },
  { label: "Dosa", hue: "#eab308" },
  { label: "Momos", hue: "#22c55e" },
  { label: "Burger", hue: "#f97316" },
  { label: "Noodles", hue: "#06b6d4" },
  { label: "Paneer", hue: "#a855f7" },
  { label: "Thali", hue: "#ec4899" },
];

interface CardState {
  id: number;
  faceIndex: number;
  matched: boolean;
  flipped: boolean;
}

const buildDeck = (): CardState[] => {
  const cards: CardState[] = [];
  for (let i = 0; i < PAIRS; i += 1) {
    cards.push({ id: i * 2, faceIndex: i, matched: false, flipped: false });
    cards.push({ id: i * 2 + 1, faceIndex: i, matched: false, flipped: false });
  }
  // Fisher–Yates: an unbiased shuffle, unlike sort() with a random comparator.
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
};

type Phase = "ready" | "playing" | "paused" | "over";

/**
 * Food Memory.
 *
 * Turn-based, so unlike Bite Catcher it needs no frame loop — a one-second
 * interval drives the clock and React handles the rest. Consecutive matches
 * build a streak that raises what each pair is worth, which is what made the
 * web version worth replaying.
 */
export const FoodMemoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const haptics = useHaptics();

  const [phase, setPhase] = useState<Phase>("ready");
  const [deck, setDeck] = useState<CardState[]>(buildDeck);
  const [picked, setPicked] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const { best, record } = useBestScore("food-memory");
  const session = useGameSession("food-memory");
  const runId = useRef("");
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Score and streak mirrored into refs.
   *
   * The one-second clock needs the values as they are when it fires, not as
   * they were when the interval was created — reading them through nested
   * state setters worked but made the timeout path hard to follow.
   */
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  scoreRef.current = score;
  streakRef.current = streak;
  bestStreakRef.current = bestStreak;

  const finish = useCallback(
    (endScore: number, endStreak: number) => {
      setPhase((prev) => {
        if (prev === "over") return prev;
        setFinalScore(endScore);
        setBestStreak(endStreak);
        setIsNewBest(record(endScore));
        haptics.success();
        session.submit(runId.current, { score: endScore, meta: { bestStreak: endStreak } });
        return "over";
      });
    },
    [haptics, record, session]
  );

  /* ── Clock ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== "playing") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finish(scoreRef.current, bestStreakRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [finish, phase]);

  useEffect(() => () => (peekTimer.current ? clearTimeout(peekTimer.current) : undefined), []);

  useAppActive(
    useCallback(() => setPhase((prev) => (prev === "playing" ? "paused" : prev)), [])
  );

  const start = useCallback(() => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    runId.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setDeck(buildDeck());
    setPicked([]);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setFinalScore(0);
    setTimeLeft(ROUND_SECONDS);
    setIsNewBest(false);
    session.reset();
    setPhase("playing");
  }, [session]);

  const flip = useCallback(
    (cardId: number) => {
      if (phase !== "playing" || picked.length >= 2) return;

      const card = deck.find((item) => item.id === cardId);
      if (!card || card.matched || card.flipped) return;

      const nextPicked = [...picked, cardId];
      setDeck((prev) =>
        prev.map((item) => (item.id === cardId ? { ...item, flipped: true } : item))
      );
      setPicked(nextPicked);

      if (nextPicked.length < 2) {
        haptics.light();
        return;
      }

      const [firstId, secondId] = nextPicked;
      const first = deck.find((item) => item.id === firstId);
      const isMatch = first?.faceIndex === card.faceIndex;

      if (isMatch) {
        haptics.light();
        const nextStreak = streak + 1;
        const gained = MATCH_POINTS + (nextStreak - 1) * STREAK_BONUS;

        setStreak(nextStreak);
        setBestStreak((prev) => Math.max(prev, nextStreak));
        setPicked([]);
        setDeck((prev) => {
          const updated = prev.map((item) =>
            item.id === firstId || item.id === secondId
              ? { ...item, matched: true, flipped: true }
              : item
          );

          // Board cleared: end immediately with a bonus for the time left.
          if (updated.every((item) => item.matched)) {
            const bonus = timeLeft * 2;
            const total = score + gained + bonus;
            setScore(total);
            finish(total, Math.max(bestStreak, nextStreak));
          }
          return updated;
        });
        setScore((prev) => prev + gained);
        return;
      }

      haptics.warn();
      setStreak(0);
      setScore((prev) => Math.max(0, prev - MISMATCH_PENALTY));
      peekTimer.current = setTimeout(() => {
        setDeck((prev) =>
          prev.map((item) =>
            item.id === firstId || item.id === secondId
              ? { ...item, flipped: item.matched }
              : item
          )
        );
        setPicked([]);
      }, PEEK_MS);
    },
    [bestStreak, deck, finish, haptics, phase, picked, score, streak, timeLeft]
  );

  const matched = useMemo(() => deck.filter((card) => card.matched).length / 2, [deck]);

  return (
    <Screen padded={false} edges={["top", "bottom"]}>
      <GameHeader
        score={score}
        timeLeft={timeLeft}
        extra={{ label: "Streak", value: `×${streak}` }}
        paused={phase === "paused"}
        onTogglePause={() =>
          setPhase((prev) => (prev === "playing" ? "paused" : prev === "paused" ? "playing" : prev))
        }
      />

      <View style={styles.body}>
        <Text style={[styles.progress, { color: theme.colors.textMuted }]}>
          {matched} of {PAIRS} pairs found
        </Text>

        <View style={styles.grid}>
          {deck.map((card) => (
            <MemoryCard
              key={card.id}
              card={card}
              disabled={phase !== "playing"}
              onPress={() => flip(card.id)}
            />
          ))}
        </View>
      </View>

      {phase === "ready" ? (
        <View style={[styles.intro, { backgroundColor: theme.colors.background }]}>
          <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: "800" }}>
            Food Memory
          </Text>
          <Text style={[styles.introBody, { color: theme.colors.textMuted }]}>
            Find all {PAIRS} pairs in {ROUND_SECONDS} seconds. Each match in a row is worth{" "}
            {STREAK_BONUS} more than the last; a wrong pair costs {MISMATCH_PENALTY} points and
            breaks the streak. Clear the board early and the time you saved becomes bonus points.
          </Text>
          <Pressable
            onPress={start}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: "800", fontSize: 16 }}>
              Start round
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
        onResume={() => setPhase("playing")}
        onQuit={() => finish(score, bestStreak)}
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
          detail={`Best streak ×${bestStreak}`}
          onRetry={session.retry}
          onPlayAgain={start}
          onExit={() => navigation.goBack()}
        />
      ) : null}
    </Screen>
  );
};

const MemoryCard: React.FC<{ card: CardState; disabled: boolean; onPress: () => void }> = React.memo(
  ({ card, disabled, onPress }) => {
    const { theme } = useTheme();
    const face = FACES[card.faceIndex];
    const revealed = card.flipped || card.matched;

    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || revealed}
        accessibilityRole="button"
        accessibilityLabel={revealed ? face.label : "Hidden card"}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: revealed ? face.hue : theme.colors.card,
            borderColor: card.matched ? face.hue : theme.colors.border,
            borderRadius: theme.radius.md,
            opacity: card.matched ? 0.55 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {revealed ? (
          <Animated.Text entering={FadeIn.duration(140)} style={styles.cardLabel}>
            {face.label}
          </Animated.Text>
        ) : (
          <Text style={{ color: theme.colors.textFaint, fontSize: 20, fontWeight: "800" }}>?</Text>
        )}
      </Pressable>
    );
  }
);
MemoryCard.displayName = "MemoryCard";

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 12 },
  progress: { fontSize: 12, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  // Percentage width keeps four columns on any screen instead of a fixed size.
  card: {
    width: "22.5%",
    aspectRatio: 0.78,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    padding: 4,
  },
  cardLabel: { color: "#ffffff", fontSize: 11, fontWeight: "800", textAlign: "center" },
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
