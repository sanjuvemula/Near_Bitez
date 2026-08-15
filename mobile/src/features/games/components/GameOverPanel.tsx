import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components";
import { useTheme } from "@/hooks/useTheme";
import type { ScoreSubmission } from "@/features/games/utils/types";
import type { SubmitState } from "@/features/games/hooks/useGameSession";

/**
 * The end-of-run screen.
 *
 * The score on the left is what the player earned in the game. Everything on
 * the reward side is quoted from the server's response and is only shown once
 * the server has answered — an unconfirmed run says so plainly instead of
 * displaying a reward that may never be granted.
 */
export const GameOverPanel: React.FC<{
  score: number;
  best: number;
  isNewBest: boolean;
  status: SubmitState;
  award: ScoreSubmission | null;
  error: string | null;
  offline: boolean;
  onRetry: () => void;
  onPlayAgain: () => void;
  onExit: () => void;
  /** Per-game closing line, e.g. "Best combo x12". */
  detail?: string;
}> = ({
  score,
  best,
  isNewBest,
  status,
  award,
  error,
  offline,
  onRetry,
  onPlayAgain,
  onExit,
  detail,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.wrap, { backgroundColor: theme.colors.overlay }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.raised, borderRadius: theme.radius.xl },
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          <Text style={[styles.eyebrow, { color: theme.colors.textMuted }]}>
            {isNewBest ? "NEW PERSONAL BEST" : "ROUND COMPLETE"}
          </Text>

          <Text style={[styles.score, { color: theme.colors.text }]}>{score}</Text>

          <View style={styles.metaRow}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              Best {Math.max(best, score)}
            </Text>
            {detail ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{detail}</Text>
            ) : null}
          </View>

          {/* ── Reward, straight from the server ────────────────────────── */}
          <View
            style={[
              styles.reward,
              { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg },
            ]}
          >
            {status === "sending" ? (
              <View style={styles.center}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 10 }}>
                  Confirming your score…
                </Text>
              </View>
            ) : status === "confirmed" && award ? (
              <>
                <View style={styles.rewardHead}>
                  <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 15 }}>
                    You earned
                  </Text>
                  {award.reward.luckyHour ? <Badge label="Lucky hour ×2" tone="warning" /> : null}
                </View>

                <View style={styles.rewardRow}>
                  <RewardFigure label="Coins" value={`+${award.reward.coins}`} tone={theme.colors.warning} />
                  <RewardFigure label="XP" value={`+${award.reward.xp}`} tone={theme.colors.info} />
                  <RewardFigure
                    label="Rank"
                    value={award.myRank ? `#${award.myRank}` : "—"}
                    tone={theme.colors.success}
                  />
                </View>

                <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 12 }}>
                  Today's total {award.todayScore} · {award.reward.level.name}
                  {award.reward.streak > 1 ? ` · ${award.reward.streak}-day streak` : ""}
                </Text>

                {award.badges?.length ? (
                  <View style={styles.badges}>
                    {award.badges.map((badge) => (
                      <Badge key={badge.type} label={badge.name} tone="primary" />
                    ))}
                  </View>
                ) : null}
              </>
            ) : status === "failed" ? (
              <>
                <Text style={{ color: theme.colors.error, fontWeight: "700", fontSize: 14 }}>
                  {offline ? "Not saved yet — you're offline" : "Score not saved"}
                </Text>
                <Text
                  style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 17 }}
                >
                  {offline
                    ? "Your run is safe on this device. It'll count once the server confirms it — no reward is granted until then."
                    : error ?? "Something went wrong saving this run."}
                </Text>
                <Pressable
                  onPress={onRetry}
                  style={({ pressed }) => [
                    styles.retry,
                    {
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.md,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 13 }}>
                    Try again
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                Waiting for the server…
              </Text>
            )}
          </View>

          <Pressable
            onPress={onPlayAgain}
            style={({ pressed }) => [
              styles.primary,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: "800", fontSize: 15 }}>
              Play again
            </Text>
          </Pressable>

          <Pressable onPress={onExit} hitSlop={8} style={styles.quiet}>
            <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 14 }}>
              Back to NearBitez
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
};

const RewardFigure: React.FC<{ label: string; value: string; tone: string }> = ({
  label,
  value,
  tone,
}) => {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: tone, fontSize: 21, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: theme.colors.textFaint, fontSize: 10, fontWeight: "700", marginTop: 2 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", padding: 22, zIndex: 50 },
  card: { width: "100%", maxWidth: 380, maxHeight: "88%", padding: 24 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1, textAlign: "center" },
  score: { fontSize: 60, fontWeight: "800", textAlign: "center", marginTop: 4, letterSpacing: -2 },
  metaRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 2 },
  reward: { padding: 16, marginTop: 20 },
  rewardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rewardRow: { flexDirection: "row", marginTop: 14 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  center: { alignItems: "center", paddingVertical: 10 },
  retry: { alignSelf: "flex-start", borderWidth: 1, paddingHorizontal: 16, paddingVertical: 9, marginTop: 14 },
  primary: { alignItems: "center", paddingVertical: 15, marginTop: 20 },
  quiet: { alignItems: "center", marginTop: 12, padding: 6 },
});
