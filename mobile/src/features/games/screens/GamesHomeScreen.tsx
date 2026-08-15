import React, { useCallback } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Badge, Card, ErrorState, Loading, MeterRow, Screen, Section, StatGrid, StatTile } from "@/components";
import { gameApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { GAME_CATALOG } from "@/features/games/data/catalog";
import type { GameMeta } from "@/features/games/utils/types";
import type { CustomerStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

/**
 * The game zone.
 *
 * Wallet, level and streak all come from `/games/feed` — the app never derives
 * a coin or XP total of its own. Games that exist on the web but have no mobile
 * build are listed and marked rather than hidden, so the catalogue stays honest
 * about what a player can actually open here.
 */
export const GamesHomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();

  const { data, loading, error, refetch } = useApi(() => gameApi.feed(), []);

  // Coming back from a run should show the coins it earned.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  if (loading && !data) return <Loading label="Loading the game zone…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  const wallet = data?.wallet;
  const level = wallet?.level;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
      >
        {/* ── Wallet ──────────────────────────────────────────────────── */}
        <StatGrid>
          <StatTile label="NearCoins" value={wallet?.coins ?? 0} tone="warning" />
          <StatTile
            label="XP"
            value={wallet?.xp ?? 0}
            caption={level?.name}
            tone="info"
            onPress={() => navigation.navigate("Rewards")}
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

        {data?.seasonalEvent?.active ? (
          <View
            style={[
              styles.banner,
              { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.lg },
            ]}
          >
            <Text style={{ color: theme.colors.warning, fontWeight: "800", fontSize: 14 }}>
              {data.seasonalEvent.title}
            </Text>
            <Text style={{ color: theme.colors.warning, fontSize: 12, marginTop: 3, lineHeight: 17 }}>
              {data.seasonalEvent.description}
            </Text>
          </View>
        ) : null}

        {wallet?.streak?.current ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 12 }}>
            {wallet.streak.current}-day streak · best {wallet.streak.longest}
          </Text>
        ) : null}

        {/* ── Games ───────────────────────────────────────────────────── */}
        <Section
          title="Play"
          action={
            <Pressable onPress={() => navigation.navigate("Leaderboard")}>
              <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 13 }}>
                Leaderboard
              </Text>
            </Pressable>
          }
        >
          <View style={{ gap: 12 }}>
            {GAME_CATALOG.map((game) => (
              <GameTile
                key={game.key}
                game={game}
                onPress={() => {
                  if (game.key === "bite-catcher") navigation.navigate("BiteCatcher");
                  else if (game.key === "food-memory") navigation.navigate("FoodMemory");
                  else if (game.key === "tray-shuffle") navigation.navigate("TrayShuffle");
                  else if (game.key === "snakes-sprint") navigation.navigate("SnakesSprint");
                }}
              />
            ))}
          </View>
        </Section>

        {/* ── Wheel ───────────────────────────────────────────────────── */}
        <Section title="Can't decide?">
          <Card onPress={() => navigation.navigate("CravingWheel")}>
            <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "800" }}>
              Craving Wheel
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 19 }}>
              Spin to land on a restaurant that's open near you right now.
            </Text>
          </Card>
        </Section>

        {/* ── Rewards ─────────────────────────────────────────────────── */}
        <Section
          title="Rewards"
          action={
            <Pressable onPress={() => navigation.navigate("Rewards")}>
              <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 13 }}>
                See all
              </Text>
            </Pressable>
          }
        >
          <Card padded={false}>
            {(data?.rewards ?? []).slice(0, 3).map((reward, index, list) => (
              <View
                key={reward._id}
                style={[
                  styles.rewardRow,
                  {
                    borderBottomWidth: index === list.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                    {reward.discountType === "PERCENTAGE"
                      ? `${reward.value}% off`
                      : `₹${reward.value} off`}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    Score {reward.gameMinScore}+ today · {reward.restaurant?.name ?? "NearBitez"}
                  </Text>
                </View>
                <Badge label={reward.gameRewardTier} tone={reward.gameRewardTier === "TOP" ? "warning" : "info"} />
              </View>
            ))}
            {!data?.rewards?.length ? (
              <Text style={{ color: theme.colors.textMuted, padding: 16 }}>
                No game rewards are live right now.
              </Text>
            ) : null}
          </Card>
        </Section>
      </ScrollView>
    </Screen>
  );
};

const GameTile: React.FC<{ game: GameMeta; onPress: () => void }> = ({ game, onPress }) => {
  const { theme } = useTheme();
  const playable = game.status === "playable";

  return (
    <Pressable
      onPress={playable ? onPress : undefined}
      disabled={!playable}
      accessibilityRole="button"
      accessibilityState={{ disabled: !playable }}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: pressed ? theme.colors.surface : theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          opacity: playable ? 1 : 0.6,
        },
      ]}
    >
      <View style={[styles.glyph, { backgroundColor: game.hue, borderRadius: theme.radius.md }]}>
        <Text style={styles.glyphText}>{game.glyph}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.tileHead}>
          <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 15 }}>
            {game.title}
          </Text>
          {!playable ? <Badge label="Web only" tone="neutral" /> : null}
        </View>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 3, lineHeight: 17 }}>
          {playable ? game.tagline : "Not available in the app yet"}
        </Text>
        <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 4, fontWeight: "700" }}>
          {game.difficulty.toUpperCase()} · {game.rewardType.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  banner: { padding: 14, marginTop: 12 },
  tile: { flexDirection: "row", alignItems: "center", gap: 13, borderWidth: 1, padding: 13 },
  glyph: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  glyphText: { color: "#ffffff", fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
  tileHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
});
