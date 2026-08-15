import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Screen } from "@/components";
import { useTheme } from "@/hooks/useTheme";
import { GameOverPanel } from "@/features/games/components/GameOverPanel";
import { useBestScore } from "@/features/games/hooks/useBestScore";
import { useGameSession } from "@/features/games/hooks/useGameSession";
import { useHaptics } from "@/features/games/hooks/useHaptics";

/**
 * Board data copied verbatim from the web game
 * (`ReactGamePlayPage.jsx`), so the two versions are the same race.
 */
const SNAKES: Record<number, number> = { 28: 11, 24: 7, 19: 5, 14: 3 };
const LADDERS: Record<number, number> = { 2: 12, 6: 17, 10: 21, 16: 27, 22: 29 };
const FINISH = 30;

/**
 * The web game's scoring, preserved exactly:
 * `max(win ? 56 : 34, min(100, 84 − rolls × 4 + position))`.
 *
 * Winning in few rolls scores highest; losing still pays a floor of 34.
 */
const finalScore = (playerWon: boolean, rolls: number, position: number) =>
  Math.max(playerWon ? 56 : 34, Math.min(100, 84 - rolls * 4 + position));

type Phase = "ready" | "playing" | "over";
type Mover = "you" | "bot";

interface Move {
  by: Mover;
  roll: number;
  from: number;
  to: number;
  kind: "move" | "ladder" | "snake" | "finish";
}

const applyBoard = (square: number): { landing: number; kind: Move["kind"] } => {
  if (square >= FINISH) return { landing: FINISH, kind: "finish" };
  if (LADDERS[square]) return { landing: LADDERS[square], kind: "ladder" };
  if (SNAKES[square]) return { landing: SNAKES[square], kind: "snake" };
  return { landing: square, kind: "move" };
};

/**
 * Snakes Sprint.
 *
 * Turn-based against a bot, so there is no animation loop — a short timeout
 * paces the bot's turn so its move is readable rather than instant.
 */
export const SnakesSprintScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const haptics = useHaptics();

  const [phase, setPhase] = useState<Phase>("ready");
  const [positions, setPositions] = useState({ you: 1, bot: 1 });
  const [rolls, setRolls] = useState(0);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Move[]>([]);
  const [result, setResult] = useState({ score: 0, won: false });
  const [isNewBest, setIsNewBest] = useState(false);

  const { best, record } = useBestScore("snakes-sprint");
  const session = useGameSession("snakes-sprint");
  const runId = useRef("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    []
  );

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const start = useCallback(() => {
    runId.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPositions({ you: 1, bot: 1 });
    setRolls(0);
    setLog([]);
    setBusy(false);
    setIsNewBest(false);
    session.reset();
    setPhase("playing");
  }, [session]);

  const finish = useCallback(
    (playerWon: boolean, totalRolls: number, position: number) => {
      const score = finalScore(playerWon, totalRolls, position);
      setResult({ score, won: playerWon });
      setIsNewBest(record(score));
      haptics.success();
      session.submit(runId.current, {
        score,
        meta: { won: playerWon, rolls: totalRolls, position },
      });
      setPhase("over");
    },
    [haptics, record, session]
  );

  /** One player's turn. Returns the square they end on. */
  const takeTurn = useCallback(
    (mover: Mover, from: number): { to: number; move: Move } => {
      const roll = 1 + Math.floor(Math.random() * 6);
      const raw = from + roll;
      const { landing, kind } = applyBoard(raw);
      return { to: landing, move: { by: mover, roll, from, to: landing, kind } };
    },
    []
  );

  const roll = useCallback(() => {
    if (phase !== "playing" || busy) return;
    setBusy(true);
    haptics.light();

    const you = takeTurn("you", positions.you);
    const nextRolls = rolls + 1;
    setRolls(nextRolls);
    setPositions((prev) => ({ ...prev, you: you.to }));
    setLog((prev) => [you.move, ...prev].slice(0, 6));

    if (you.to >= FINISH) {
      later(() => finish(true, nextRolls, you.to), 500);
      return;
    }

    // The bot answers after a beat so its move can be followed.
    later(() => {
      const bot = takeTurn("bot", positions.bot);
      setPositions((prev) => ({ ...prev, bot: bot.to }));
      setLog((prev) => [bot.move, ...prev].slice(0, 6));

      if (bot.to >= FINISH) {
        later(() => finish(false, nextRolls, you.to), 500);
        return;
      }
      setBusy(false);
    }, 620);
  }, [busy, finish, haptics, later, phase, positions, rolls, takeTurn]);

  const lastMove = log[0];

  return (
    <Screen padded={false} edges={["top", "bottom"]}>
      <View style={styles.head}>
        <Racer label="You" position={positions.you} tone={theme.colors.primary} />
        <Racer label="Bot" position={positions.bot} tone={theme.colors.info} />
      </View>

      <ScrollView contentContainerStyle={styles.boardWrap} showsVerticalScrollIndicator={false}>
        <View style={styles.board}>
          {/* Rendered high-to-low so square 30 sits at the top, as on the web. */}
          {Array.from({ length: FINISH }, (_, index) => FINISH - index).map((square) => {
            const ladder = LADDERS[square];
            const snake = SNAKES[square];
            const you = positions.you === square;
            const bot = positions.bot === square;

            return (
              <View
                key={square}
                style={[
                  styles.cell,
                  {
                    backgroundColor: you
                      ? theme.colors.primarySoft
                      : bot
                        ? theme.colors.infoSoft
                        : theme.colors.card,
                    borderColor: you
                      ? theme.colors.primary
                      : bot
                        ? theme.colors.info
                        : theme.colors.border,
                    borderRadius: theme.radius.sm,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.textFaint, fontSize: 10, fontWeight: "700" }}>
                  {square}
                </Text>
                {ladder ? (
                  <Text style={[styles.hint, { color: theme.colors.success }]}>↑{ladder}</Text>
                ) : snake ? (
                  <Text style={[styles.hint, { color: theme.colors.error }]}>↓{snake}</Text>
                ) : null}
                {you || bot ? (
                  <Text style={{ color: theme.colors.text, fontSize: 10, fontWeight: "800" }}>
                    {you && bot ? "You+Bot" : you ? "You" : "Bot"}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13, minHeight: 18 }}>
          {lastMove
            ? `${lastMove.by === "you" ? "You" : "Bot"} rolled ${lastMove.roll}` +
              (lastMove.kind === "ladder"
                ? ` — ladder to ${lastMove.to}`
                : lastMove.kind === "snake"
                  ? ` — snake down to ${lastMove.to}`
                  : ` → ${lastMove.to}`)
            : "First to 30 wins."}
        </Text>

        <Pressable
          onPress={roll}
          disabled={phase !== "playing" || busy}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.rollButton,
            {
              backgroundColor:
                phase === "playing" && !busy ? theme.colors.primary : theme.colors.border,
              borderRadius: theme.radius.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: phase === "playing" && !busy ? theme.colors.onPrimary : theme.colors.textFaint,
              fontWeight: "800",
              fontSize: 16,
            }}
          >
            {busy ? "Bot's turn…" : `Roll · ${rolls} used`}
          </Text>
        </Pressable>
      </View>

      {phase === "ready" ? (
        <View style={[styles.intro, { backgroundColor: theme.colors.background }]}>
          <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: "800" }}>
            Snakes Sprint
          </Text>
          <Text style={[styles.introBody, { color: theme.colors.textMuted }]}>
            Race the bot to square {FINISH}. Ladders jump you forward, snakes drag you back.
            Fewer rolls means a higher score, so a fast win beats a slow one.
          </Text>
          <Pressable
            onPress={start}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: "800", fontSize: 16 }}>
              Start race
            </Text>
          </Pressable>
          {best > 0 ? (
            <Text style={{ color: theme.colors.textFaint, fontSize: 12, marginTop: 14, fontWeight: "700" }}>
              Your best {best}
            </Text>
          ) : null}
        </View>
      ) : null}

      {phase === "over" ? (
        <GameOverPanel
          score={result.score}
          best={best}
          isNewBest={isNewBest}
          status={session.status}
          award={session.award}
          error={session.error}
          offline={session.offline}
          detail={result.won ? `Won in ${rolls} rolls` : "Bot reached 30 first"}
          onRetry={session.retry}
          onPlayAgain={start}
          onExit={() => navigation.goBack()}
        />
      ) : null}
    </Screen>
  );
};

const Racer: React.FC<{ label: string; position: number; tone: string }> = ({
  label,
  position,
  tone,
}) => {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.colors.textFaint, fontSize: 10, fontWeight: "800" }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ color: tone, fontSize: 24, fontWeight: "800" }}>{position}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  head: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  boardWrap: { paddingHorizontal: 12, paddingBottom: 12 },
  board: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  // Percentage width gives five columns on any device width.
  cell: {
    width: "18%",
    aspectRatio: 1,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  hint: { fontSize: 9, fontWeight: "800" },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, gap: 10 },
  rollButton: { alignItems: "center", paddingVertical: 15 },
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
