import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  makeMutable,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { Screen } from "@/components";
import { useTheme } from "@/hooks/useTheme";
import { GameHeader, PauseOverlay } from "@/features/games/components/GameShell";
import { GameOverPanel } from "@/features/games/components/GameOverPanel";
import { useAppActive, useGameLoop } from "@/features/games/hooks/useGameLoop";
import { useBestScore } from "@/features/games/hooks/useBestScore";
import { useGameSession } from "@/features/games/hooks/useGameSession";
import { useHaptics } from "@/features/games/hooks/useHaptics";
import {
  BITE_CATCHER_RULES,
  ROUND_SECONDS,
  createWorld,
  setTarget,
  step,
  type Bounds,
  type World,
} from "@/features/games/engines/biteCatcher";

/**
 * Item colours by sprite frame; index 3 is the chilli hazard.
 *
 * Module-level and plain, so the style worklet can capture it.
 */
const SKIN_BODY = ["#fbbf24", "#fb7185", "#4ade80", "#ef4444"];
const SKIN_EDGE = ["#b45309", "#9f1239", "#15803d", "#7f1d1d"];

const POOL_SIZE = 14;
type Phase = "ready" | "playing" | "paused" | "over";

interface Slot {
  x: SharedValue<number>;
  y: SharedValue<number>;
  on: SharedValue<number>;
  skin: SharedValue<number>;
}

/**
 * Bite Catcher.
 *
 * A genuine React Native build, not the Phaser game in a WebView. The rules
 * live in `engines/biteCatcher.ts`; this screen owns rendering and input.
 *
 * The loop writes geometry into Reanimated shared values, which the UI thread
 * consumes directly — React re-renders only when the phase changes or the HUD
 * ticks, eight times a second rather than sixty.
 */
export const BiteCatcherScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const haptics = useHaptics();

  const [phase, setPhase] = useState<Phase>("ready");
  const [hud, setHud] = useState({ score: 0, time: ROUND_SECONDS, combo: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [summary, setSummary] = useState({ score: 0, bestCombo: 0 });
  const [isNewBest, setIsNewBest] = useState(false);

  const { best, record } = useBestScore("bite-catcher");
  const session = useGameSession("bite-catcher");

  /** Identifies this run so it is submitted exactly once. */
  const runId = useRef("");
  const worldRef = useRef<World | null>(null);

  /* ── Geometry ───────────────────────────────────────────────────────────
     Everything derives from the measured play area, so the game fits any
     screen size or aspect ratio instead of assuming a phone width. */
  const bounds = useMemo<Bounds>(() => {
    const scale = Math.max(0.75, Math.min(1.25, size.width / 390));
    const catcherWidth = 104 * scale;
    return {
      width: size.width,
      height: size.height,
      catcherY: size.height - 62 * scale,
      catcherHalfWidth: catcherWidth / 2,
      catcherHalfHeight: 15 * scale,
      itemRadius: 21 * scale,
    };
  }, [size]);

  /* ── Animated bindings ──────────────────────────────────────────────────
     Allocated once with makeMutable rather than a loop of useSharedValue,
     which would be a hook call per iteration. */
  const catcherX = useSharedValue(0);
  const pool = useMemo<Slot[]>(
    () =>
      Array.from({ length: POOL_SIZE }, () => ({
        x: makeMutable(0),
        y: makeMutable(-999),
        on: makeMutable(0),
        skin: makeMutable(0),
      })),
    []
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const start = useCallback(() => {
    if (!bounds.width) return;

    const world = createWorld(bounds);
    worldRef.current = world;
    runId.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    catcherX.value = world.catcherX;
    for (const slot of pool) {
      slot.on.value = 0;
      slot.y.value = -999;
    }

    setIsNewBest(false);
    setSummary({ score: 0, bestCombo: 0 });
    setHud({ score: 0, time: ROUND_SECONDS, combo: 0 });
    session.reset();
    setPhase("playing");
  }, [bounds, catcherX, pool, session]);

  const finish = useCallback(() => {
    const world = worldRef.current;
    if (!world || phase === "over") return;

    world.finished = true;
    setSummary({ score: world.score, bestCombo: world.bestCombo });
    setPhase("over");
    haptics.success();
    setIsNewBest(record(world.score));

    // Submitted once per run id; a repeat call is a no-op inside the session.
    session.submit(runId.current, {
      score: world.score,
      meta: { bestCombo: world.bestCombo, caught: world.caught, missed: world.missed },
    });
  }, [haptics, phase, record, session]);

  /* ── Frame loop ─────────────────────────────────────────────────────── */
  const hudAccumulator = useRef(0);

  const onFrame = useCallback(
    (dt: number) => {
      const world = worldRef.current;
      if (!world) return;

      step(world, dt, bounds);

      catcherX.value = world.catcherX;
      for (let i = 0; i < POOL_SIZE; i += 1) {
        const item = world.items[i];
        const slot = pool[i];
        if (item.active) {
          // Set before showing, so a recycled slot never flashes at its old
          // position or in the previous item's colour.
          slot.x.value = item.x;
          slot.y.value = item.y;
          slot.skin.value = item.frame;
          slot.on.value = 1;
        } else if (slot.on.value !== 0) {
          slot.on.value = 0;
        }
      }

      if (world.events.length) {
        // One pulse per frame at most; the hook rate-limits further.
        if (world.events.some((event) => event.hazard)) haptics.warn();
        else haptics.light();
        world.events.length = 0;
      }

      // HUD at ~8 Hz: readable numbers, quiet React.
      hudAccumulator.current += dt;
      if (hudAccumulator.current >= 0.125) {
        hudAccumulator.current = 0;
        setHud({ score: world.score, time: Math.max(0, world.timeLeft), combo: world.combo });
      }

      if (world.finished) finish();
    },
    [bounds, catcherX, finish, haptics, pool]
  );

  useGameLoop(onFrame, phase === "playing" && bounds.width > 0);

  // A call or a notification pauses the run instead of losing it.
  useAppActive(
    useCallback(() => {
      setPhase((prev) => (prev === "playing" ? "paused" : prev));
    }, [])
  );

  // Leaving mid-run must not leave a loop or a stale world behind.
  useEffect(
    () =>
      navigation.addListener("beforeRemove", () => {
        worldRef.current = null;
      }),
    [navigation]
  );

  /* ── Input ──────────────────────────────────────────────────────────── */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          const world = worldRef.current;
          if (world) setTarget(world, event.x, bounds);
        })
        .onUpdate((event) => {
          const world = worldRef.current;
          if (world) setTarget(world, event.x, bounds);
        })
        // The engine mutates a plain ref, so these run on the JS thread rather
        // than as worklets.
        .runOnJS(true),
    [bounds]
  );

  const catcherStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: catcherX.value - bounds.catcherHalfWidth }],
  }));

  return (
    <Screen padded={false} edges={["top", "bottom"]}>
      <GameHeader
        score={hud.score}
        timeLeft={hud.time}
        extra={{ label: "Combo", value: `×${hud.combo}` }}
        paused={phase === "paused"}
        onTogglePause={() =>
          setPhase((prev) => (prev === "playing" ? "paused" : prev === "paused" ? "playing" : prev))
        }
      />

      <GestureDetector gesture={pan}>
        <View
          onLayout={onLayout}
          style={[styles.field, { borderRadius: theme.radius.lg }]}
          collapsable={false}
        >
          <View style={[styles.rail, styles.railTop]} />
          <View style={[styles.rail, styles.railBottom]} />

          {pool.map((slot, index) => (
            <FallingItem key={index} slot={slot} radius={bounds.itemRadius} />
          ))}

          {bounds.width > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.catcher,
                catcherStyle,
                {
                  width: bounds.catcherHalfWidth * 2,
                  height: bounds.catcherHalfHeight * 2,
                  top: bounds.catcherY - bounds.catcherHalfHeight,
                },
              ]}
            >
              <View style={styles.catcherLip} />
              <View style={styles.catcherBody} />
            </Animated.View>
          ) : null}

          {phase === "ready" ? (
            <View style={styles.intro}>
              <Text style={styles.introTitle}>Bite Catcher</Text>
              {BITE_CATCHER_RULES.map((rule) => (
                <Text key={rule} style={styles.introRule}>
                  · {rule}
                </Text>
              ))}
              <Pressable
                onPress={start}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.startButton,
                  { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={{ color: theme.colors.onPrimary, fontWeight: "800", fontSize: 16 }}>
                  Start round
                </Text>
              </Pressable>
              {best > 0 ? <Text style={styles.introBest}>Your best {best}</Text> : null}
            </View>
          ) : null}

          <PauseOverlay
            visible={phase === "paused"}
            onResume={() => setPhase("playing")}
            onQuit={finish}
          />

          {phase === "over" ? (
            <GameOverPanel
              score={summary.score}
              best={best}
              isNewBest={isNewBest}
              status={session.status}
              award={session.award}
              error={session.error}
              offline={session.offline}
              detail={`Best combo ×${summary.bestCombo}`}
              onRetry={session.retry}
              onPlayAgain={start}
              onExit={() => navigation.goBack()}
            />
          ) : null}
        </View>
      </GestureDetector>
    </Screen>
  );
};

/**
 * One pooled item.
 *
 * Renders once and is then driven entirely from shared values — position and
 * colour both. Reading the skin inside the worklet avoids the per-item timer an
 * earlier version needed to keep React in sync.
 */
const FallingItem: React.FC<{ slot: Slot; radius: number }> = React.memo(({ slot, radius }) => {
  const style = useAnimatedStyle(() => {
    const index = Math.min(3, Math.max(0, Math.round(slot.skin.value)));
    return {
      opacity: slot.on.value,
      backgroundColor: SKIN_BODY[index],
      borderColor: SKIN_EDGE[index],
      transform: [
        { translateX: slot.x.value - radius },
        { translateY: slot.y.value - radius },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.item,
        style,
        { width: radius * 2, height: radius * 2, borderRadius: radius },
      ]}
    >
      <View style={[styles.itemGloss, { width: radius * 0.7, height: radius * 0.3 }]} />
    </Animated.View>
  );
});
FallingItem.displayName = "FallingItem";

const styles = StyleSheet.create({
  // The play surface stays a deep arcade blue in both themes; it is the game's
  // own world, not a panel that should follow the app's background.
  field: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: "#07111f",
  },
  rail: { position: "absolute", left: 0, right: 0 },
  railTop: { top: 0, height: 4, backgroundColor: "#22d3ee", opacity: 0.35 },
  railBottom: { bottom: 0, height: 6, backgroundColor: "#f97316", opacity: 0.4 },
  item: { position: "absolute", left: 0, top: 0, borderWidth: 2, alignItems: "center" },
  itemGloss: {
    position: "absolute",
    top: "22%",
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  catcher: { position: "absolute", left: 0, alignItems: "center", justifyContent: "flex-end" },
  catcherLip: { width: "100%", height: 6, borderRadius: 3, backgroundColor: "#f8fafc" },
  catcherBody: {
    width: "84%",
    flex: 1,
    marginTop: 2,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: "#f97316",
  },
  intro: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,10,22,0.93)",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    zIndex: 30,
  },
  introTitle: { color: "#f8fafc", fontSize: 26, fontWeight: "800", marginBottom: 16 },
  introRule: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 4,
    maxWidth: 320,
  },
  startButton: { marginTop: 26, paddingHorizontal: 34, paddingVertical: 15, borderRadius: 14 },
  introBest: { color: "#64748b", fontSize: 12, marginTop: 14, fontWeight: "700" },
});
