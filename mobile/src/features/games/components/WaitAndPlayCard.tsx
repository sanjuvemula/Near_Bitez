import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Card } from "@/components";
import { gameApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { PLAYABLE_GAMES } from "@/features/games/data/catalog";
import type { OrderStatus } from "@/types/models";
import type { CustomerStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

/** Statuses where the customer is waiting with nothing to do. */
const WAITING: OrderStatus[] = ["PLACED", "ACCEPTED", "PREPARING", "READY"];

/**
 * Wait & Play.
 *
 * Offered on the tracking screen while the kitchen works, and only then — once
 * the order is on its way the customer wants the map, not a game, so this
 * disappears rather than competing with live tracking.
 *
 * It renders inline and navigates away to play; it never takes over the
 * tracking screen or holds the socket, so status updates keep arriving
 * underneath exactly as before.
 */
export const WaitAndPlayCard: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();

  // Only fetched while the card is actually shown.
  const active = WAITING.includes(status);
  const { data } = useApi(() => (active ? gameApi.myScore() : Promise.resolve(null)), [active]);

  if (!active) return null;

  const games = PLAYABLE_GAMES.slice(0, 3);

  return (
    <Card style={{ marginTop: 16 }}>
      <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "800" }}>
        Play while you wait
      </Text>
      <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 19 }}>
        {status === "READY"
          ? "Your order is packed and waiting for pickup."
          : "Your order is being prepared. Earn coins in the meantime."}
      </Text>

      {data ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 10 }}>
          {data.todayScore} points today
          {data.myRank ? ` · rank #${data.myRank}` : ""}
        </Text>
      ) : null}

      <View style={styles.row}>
        {games.map((game) => (
          <Pressable
            key={game.key}
            onPress={() => {
              if (game.key === "bite-catcher") navigation.navigate("BiteCatcher");
              else if (game.key === "food-memory") navigation.navigate("FoodMemory");
              else if (game.key === "tray-shuffle") navigation.navigate("TrayShuffle");
              else if (game.key === "snakes-sprint") navigation.navigate("SnakesSprint");
            }}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: game.hue,
                borderRadius: theme.radius.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={styles.chipGlyph}>{game.glyph}</Text>
            <Text style={styles.chipLabel} numberOfLines={1}>
              {game.short}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.links}>
        <Pressable onPress={() => navigation.navigate("Leaderboard")} hitSlop={6}>
          <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 13 }}>
            Leaderboard
          </Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Rewards")} hitSlop={6}>
          <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 13 }}>
            Rewards
          </Text>
        </Pressable>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginTop: 14 },
  chip: { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 6 },
  chipGlyph: { color: "#ffffff", fontWeight: "800", fontSize: 14, letterSpacing: 0.5 },
  chipLabel: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "700", marginTop: 3 },
  links: { flexDirection: "row", gap: 20, marginTop: 16 },
});
