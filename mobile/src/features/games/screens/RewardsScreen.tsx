import React, { useCallback, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Loading,
  MeterRow,
  Modal,
  Screen,
  Section,
  StatGrid,
  StatTile,
} from "@/components";
import { gameApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { formatRelativeTime } from "@/utils/format";
import type { ClaimResult, GamesFeed } from "@/features/games/utils/types";

/**
 * Rewards and wallet.
 *
 * Coins, XP, level, streak and every reward's eligibility come from
 * `/games/feed` and `/games/claim`. Nothing on this screen is computed locally —
 * the claim button's enabled state mirrors the server's rule (today's score vs
 * the reward's minimum) purely so the player is not sent into a refusal, and
 * the server rejects the request regardless if it disagrees.
 */
export const RewardsScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();

  const { data, loading, error, refetch } = useApi(() => gameApi.feed(), []);
  const scoreQuery = useApi(() => gameApi.myScore(), []);

  const [claiming, setClaiming] = useState<"PLAY" | "TOP" | null>(null);
  const [claimed, setClaimed] = useState<ClaimResult | null>(null);

  /**
   * Tiers already claimed in this session.
   *
   * The backend has no duplicate-claim guard — it never writes the
   * `GameRewardClaim` record that would let it detect one (see
   * docs/phase6-inventory.md §4). This ref stops the app being the thing that
   * fires a second claim, but it cannot stop another client, so it is a
   * courtesy rather than a control.
   */
  const claimedTiers = useRef<Set<string>>(new Set());

  const todayScore = scoreQuery.data?.todayScore ?? 0;
  const myRank = scoreQuery.data?.myRank ?? null;

  const claim = useCallback(
    async (tier: "PLAY" | "TOP") => {
      if (claimedTiers.current.has(tier)) {
        toast.error("You've already claimed this one today");
        return;
      }

      setClaiming(tier);
      try {
        const result = await gameApi.claim(tier);
        claimedTiers.current.add(tier);
        setClaimed(result);
        await refetch();
        await scoreQuery.refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not claim this reward");
      } finally {
        setClaiming(null);
      }
    },
    [refetch, scoreQuery, toast]
  );

  if (loading && !data) return <Loading label="Loading rewards…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  const wallet = data?.wallet;
  const level = wallet?.level;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              void refetch();
              void scoreQuery.refetch();
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        <StatGrid>
          <StatTile label="NearCoins" value={wallet?.coins ?? 0} tone="warning" />
          <StatTile label="XP" value={wallet?.xp ?? 0} caption={level?.name} tone="info" />
          <StatTile
            label="Today's score"
            value={todayScore}
            caption={myRank ? `Rank #${myRank}` : "Not ranked yet"}
          />
          <StatTile
            label="Streak"
            value={`${wallet?.streak.current ?? 0}d`}
            caption={`Best ${wallet?.streak.longest ?? 0}d`}
            tone="success"
          />
        </StatGrid>

        {level?.nextLevel ? (
          <Card style={{ marginTop: 12 }}>
            <MeterRow
              label={`${level.name} → ${level.nextLevel}`}
              value={level.progress}
              total={100}
              caption={`${level.xpToNext} XP to go`}
            />
          </Card>
        ) : null}

        {/* ── Claimable tiers ─────────────────────────────────────────── */}
        <Section title="Claim today">
          <View style={{ gap: 12 }}>
            <ClaimTier
              tier="PLAY"
              title="Player reward"
              requirement="Score 120+ today"
              met={todayScore >= 120}
              alreadyClaimed={claimedTiers.current.has("PLAY")}
              busy={claiming === "PLAY"}
              onClaim={() => claim("PLAY")}
            />
            <ClaimTier
              tier="TOP"
              title="Champion reward"
              requirement="Score 600+ today and hold rank #1"
              met={todayScore >= 600 && myRank === 1}
              alreadyClaimed={claimedTiers.current.has("TOP")}
              busy={claiming === "TOP"}
              onClaim={() => claim("TOP")}
            />
          </View>
        </Section>

        {/* ── Live game rewards ───────────────────────────────────────── */}
        <Section title="Available game rewards">
          {data?.rewards?.length ? (
            <View style={{ gap: 10 }}>
              {data.rewards.map((reward) => (
                <RewardCard key={reward._id} reward={reward} todayScore={todayScore} />
              ))}
            </View>
          ) : (
            <Card>
              <Text style={{ color: theme.colors.textMuted }}>
                No game rewards are live right now.
              </Text>
            </Card>
          )}
        </Section>

        {/* ── Earned ──────────────────────────────────────────────────── */}
        <Section title="Recently earned">
          {wallet?.history?.length ? (
            <Card padded={false}>
              {wallet.history.map((row, index, list) => (
                <View
                  key={row._id}
                  style={[
                    styles.historyRow,
                    {
                      borderBottomWidth: index === list.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "600" }}>
                      {row.description}
                    </Text>
                    <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 2 }}>
                      {formatRelativeTime(row.createdAt)} · {row.source}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    {row.coins ? (
                      <Text style={{ color: theme.colors.warning, fontWeight: "800" }}>
                        {row.coins > 0 ? "+" : ""}
                        {row.coins}
                      </Text>
                    ) : null}
                    {row.xp ? (
                      <Text style={{ color: theme.colors.info, fontSize: 12, fontWeight: "700" }}>
                        +{row.xp} XP
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          ) : (
            <Card>
              <Text style={{ color: theme.colors.textMuted }}>
                Play a game to start earning coins and XP.
              </Text>
            </Card>
          )}
        </Section>

        {/* ── Missions ────────────────────────────────────────────────── */}
        {data?.missions?.length ? (
          <Section title="Daily missions">
            <Card>
              {data.missions.map((mission) => (
                <MeterRow
                  key={mission.key}
                  label={mission.title}
                  value={Math.min(mission.progress, mission.target)}
                  total={mission.target}
                  caption={mission.reward.label}
                  tone={mission.completed ? theme.colors.success : undefined}
                />
              ))}
            </Card>
          </Section>
        ) : null}
      </ScrollView>

      {/* ── Claim result ──────────────────────────────────────────────── */}
      <Modal visible={Boolean(claimed)} onClose={() => setClaimed(null)} title="Reward claimed">
        {claimed ? (
          <>
            <View style={styles.claimFigures}>
              <Text style={{ color: theme.colors.warning, fontSize: 26, fontWeight: "800" }}>
                +{claimed.coins}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>coins</Text>
              <Text style={{ color: theme.colors.info, fontSize: 26, fontWeight: "800", marginLeft: 18 }}>
                +{claimed.xp}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>XP</Text>
            </View>

            <View
              style={[
                styles.code,
                { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
              ]}
            >
              <Text style={{ color: theme.colors.primaryText, fontSize: 20, fontWeight: "800", letterSpacing: 1.5 }}>
                {claimed.promo.code}
              </Text>
              <Text style={{ color: theme.colors.primaryText, fontSize: 12, marginTop: 4 }}>
                {claimed.promo.discountType === "PERCENTAGE"
                  ? `${claimed.promo.value}% off`
                  : `₹${claimed.promo.value} off`}
                {claimed.promo.minOrderValue ? ` above ₹${claimed.promo.minOrderValue}` : ""}
                {claimed.promo.restaurant?.name ? ` · ${claimed.promo.restaurant.name}` : ""}
              </Text>
            </View>

            <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 12, lineHeight: 17 }}>
              Enter this code at checkout. It's already saved to your account.
            </Text>

            <Button
              label="Done"
              fullWidth
              onPress={() => setClaimed(null)}
              style={{ marginTop: 18 }}
            />
          </>
        ) : null}
      </Modal>
    </Screen>
  );
};

const ClaimTier: React.FC<{
  tier: "PLAY" | "TOP";
  title: string;
  requirement: string;
  met: boolean;
  alreadyClaimed: boolean;
  busy: boolean;
  onClaim: () => void;
}> = ({ tier, title, requirement, met, alreadyClaimed, busy, onClaim }) => {
  const { theme } = useTheme();

  return (
    <Card>
      <View style={styles.tierHead}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 16 }}>{title}</Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 3 }}>
            {requirement}
          </Text>
        </View>
        <Badge label={tier} tone={tier === "TOP" ? "warning" : "info"} />
      </View>

      <Button
        label={alreadyClaimed ? "Claimed today" : met ? "Claim" : "Not unlocked yet"}
        size="sm"
        variant={met && !alreadyClaimed ? "primary" : "secondary"}
        disabled={!met || alreadyClaimed || busy}
        loading={busy}
        onPress={onClaim}
        style={{ marginTop: 14, alignSelf: "flex-start" }}
      />
    </Card>
  );
};

const RewardCard: React.FC<{ reward: GamesFeed["rewards"][number]; todayScore: number }> = ({
  reward,
  todayScore,
}) => {
  const { theme } = useTheme();
  const unlocked = todayScore >= reward.gameMinScore;

  return (
    <Card>
      <View style={styles.tierHead}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 16 }}>
            {reward.discountType === "PERCENTAGE" ? `${reward.value}% off` : `₹${reward.value} off`}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 3 }}>
            {reward.restaurant?.name ?? "Any NearBitez restaurant"}
            {reward.minOrderValue ? ` · above ₹${reward.minOrderValue}` : ""}
          </Text>
        </View>
        <Badge label={reward.gameRewardTier} tone={reward.gameRewardTier === "TOP" ? "warning" : "info"} />
      </View>

      <MeterRow
        label={`Score ${reward.gameMinScore} to unlock`}
        value={Math.min(todayScore, reward.gameMinScore)}
        total={reward.gameMinScore}
        caption={unlocked ? "Unlocked" : `${reward.gameMinScore - todayScore} to go`}
        tone={unlocked ? theme.colors.success : undefined}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  tierHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  claimFigures: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  code: { padding: 16, alignItems: "center", marginTop: 18 },
});
