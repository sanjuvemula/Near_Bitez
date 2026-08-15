import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

/**
 * The chrome every game shares: a stat bar, a pause control, and a pause
 * overlay.
 *
 * Deliberately sparse. During play the screen shows the numbers that change and
 * nothing else — a game that carries the app's normal navigation furniture
 * stops feeling like a game.
 *
 * These are theme-aware rather than dark-only: the play surface is a deep
 * arcade colour in both themes by design, but the panels around it follow the
 * user's choice, so nothing is ever an inverted version of itself.
 */

export const GameStat: React.FC<{ label: string; value: string | number; tone?: string }> = ({
  label,
  value,
  tone,
}) => {
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: theme.colors.textFaint }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.statValue, { color: tone ?? theme.colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

/**
 * Top bar during play.
 *
 * `timeTone` turns the clock red for the final seconds — the one piece of
 * urgency worth encoding in colour, and it is paired with the number itself so
 * it never depends on colour alone.
 */
export const GameHeader: React.FC<{
  score: number;
  timeLeft?: number;
  lives?: number;
  extra?: { label: string; value: string | number };
  paused: boolean;
  onTogglePause: () => void;
}> = ({ score, timeLeft, lives, extra, paused, onTogglePause }) => {
  const { theme } = useTheme();
  const urgent = timeLeft !== undefined && timeLeft <= 5;

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
      ]}
    >
      <GameStat label="Score" value={score} />
      {timeLeft !== undefined ? (
        <GameStat
          label="Time"
          value={`${Math.max(0, Math.ceil(timeLeft))}s`}
          tone={urgent ? theme.colors.error : undefined}
        />
      ) : null}
      {lives !== undefined ? (
        <GameStat label="Lives" value={"●".repeat(Math.max(0, lives)) || "—"} />
      ) : null}
      {extra ? <GameStat label={extra.label} value={extra.value} /> : null}

      <Pressable
        onPress={onTogglePause}
        accessibilityRole="button"
        accessibilityLabel={paused ? "Resume" : "Pause"}
        hitSlop={12}
        style={({ pressed }) => [
          styles.pause,
          {
            backgroundColor: pressed ? theme.colors.border : theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "800" }}>
          {paused ? "▶" : "❚❚"}
        </Text>
      </Pressable>
    </View>
  );
};

/** Covers the play area while paused so nothing can be watched or tapped. */
export const PauseOverlay: React.FC<{
  visible: boolean;
  onResume: () => void;
  onQuit: () => void;
}> = ({ visible, onResume, onQuit }) => {
  const { theme } = useTheme();
  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.overlay, { backgroundColor: theme.colors.overlay }]}>
      <View
        style={[
          styles.panel,
          { backgroundColor: theme.colors.raised, borderRadius: theme.radius.xl },
        ]}
      >
        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "800" }}>Paused</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 6, textAlign: "center" }}>
          The clock is stopped. Nothing is lost.
        </Text>

        <Pressable
          onPress={onResume}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: "800", fontSize: 15 }}>
            Resume
          </Text>
        </Pressable>

        <Pressable onPress={onQuit} hitSlop={8} style={styles.quiet}>
          <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 14 }}>
            End this run
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 16,
    margin: 12,
    marginBottom: 8,
  },
  stat: { flex: 1, minWidth: 0 },
  statLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  statValue: { fontSize: 19, fontWeight: "800", marginTop: 1 },
  pause: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  overlay: { alignItems: "center", justifyContent: "center", padding: 28, zIndex: 40 },
  panel: { width: "100%", maxWidth: 340, alignItems: "center", padding: 26 },
  primaryButton: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 22,
  },
  quiet: { marginTop: 14, padding: 6 },
});
