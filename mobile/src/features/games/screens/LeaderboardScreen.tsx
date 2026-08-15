import React, { useCallback, useEffect } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Avatar, Badge, Card, EmptyState, ErrorState, Loading, Screen } from "@/components";
import { gameApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useTheme } from "@/hooks/useTheme";
import { SOCKET_EVENTS, emit } from "@/services/socket";
import type { LeaderboardPayload, LeaderboardRow } from "@/features/games/utils/types";

/**
 * Today's leaderboard.
 *
 * The backend keys scores by IST date and returns the top 20 plus the caller's
 * own row, so a player outside the top 20 still sees where they stand. It has
 * no deeper pages — 20 is the whole list it will serve — so the list is
 * windowed rather than paged.
 *
 * Updates arrive on `leaderboard:update` over the shared socket. Joining
 * `games:today` is what subscribes this device; without it the server has
 * nowhere to send them.
 */
export const LeaderboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();

  const { data, loading, error, refetch } = useApi(() => gameApi.leaderboard(), []);
  const [live, setLive] = React.useState<LeaderboardPayload | null>(null);

  useEffect(() => {
    if (!user?._id) return;
    emit("game:join", { userId: user._id });
    return () => emit("game:leave");
  }, [user?._id]);

  useSocketEvent<LeaderboardPayload>(
    SOCKET_EVENTS.leaderboardUpdate,
    useCallback((payload) => {
      if (payload?.leaderboard) setLive(payload);
    }, [])
  );

  const payload = live ?? data;
  const rows = payload?.leaderboard ?? [];
  const me = payload?.currentUser ?? null;

  // The caller's row is only appended when they are outside the served top 20.
  const meInList = me && rows.some((row) => String(row.userId ?? row._id) === String(me.userId ?? me._id));

  if (loading && !data) return <Loading label="Loading leaderboard…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <FlatList
        data={rows}
        keyExtractor={(item, index) => String(item.userId ?? item._id ?? index)}
        initialNumToRender={15}
        windowSize={9}
        removeClippedSubviews
        contentContainerStyle={rows.length ? styles.list : styles.empty}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              Resets daily at midnight IST
            </Text>
            {me ? (
              <Card style={{ marginTop: 12 }}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.7 }}>
                  YOUR STANDING
                </Text>
                <View style={styles.meRow}>
                  <Text style={{ color: theme.colors.text, fontSize: 30, fontWeight: "800" }}>
                    {me.rank ? `#${me.rank}` : "—"}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                      {me.totalScore} points today
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {me.gamesPlayed ?? 0} game{me.gamesPlayed === 1 ? "" : "s"} played
                    </Text>
                  </View>
                </View>
              </Card>
            ) : (
              <Card style={{ marginTop: 12 }}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                  Play a game today to take a place on the board.
                </Text>
              </Card>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <LeaderRow row={item} position={index + 1} highlight={Boolean(item.isCurrentUser)} />
        )}
        ListFooterComponent={
          me && !meInList ? (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.divider, { color: theme.colors.textFaint }]}>· · ·</Text>
              <LeaderRow row={me} position={me.rank ?? 0} highlight />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="Nobody has played yet"
            message="Be the first on today's board."
          />
        }
      />
    </Screen>
  );
};

const LeaderRow: React.FC<{ row: LeaderboardRow; position: number; highlight: boolean }> = React.memo(
  ({ row, position, highlight }) => {
    const { theme } = useTheme();

    // Only the top three get a medal tone; beyond that rank is just a number.
    const medal =
      position === 1
        ? theme.colors.warning
        : position === 2
          ? theme.colors.textMuted
          : position === 3
            ? theme.colors.primaryText
            : theme.colors.textFaint;

    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor: highlight ? theme.colors.primarySoft : theme.colors.card,
            borderColor: highlight ? theme.colors.primary : theme.colors.border,
            borderRadius: theme.radius.lg,
          },
        ]}
      >
        <Text style={[styles.position, { color: medal }]}>{position || "—"}</Text>
        <Avatar name={row.name} size={36} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700" }}>
            {row.name}
            {highlight ? " · you" : ""}
          </Text>
          {row.gamesPlayed ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 1 }}>
              {row.gamesPlayed} game{row.gamesPlayed === 1 ? "" : "s"}
            </Text>
          ) : null}
        </View>
        <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 16 }}>
          {row.totalScore}
        </Text>
      </View>
    );
  }
);
LeaderRow.displayName = "LeaderRow";

const styles = StyleSheet.create({
  header: { paddingBottom: 8 },
  list: { padding: 16, gap: 10 },
  empty: { flexGrow: 1 },
  meRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, padding: 12 },
  position: { fontSize: 16, fontWeight: "800", width: 26, textAlign: "center" },
  divider: { textAlign: "center", fontSize: 16, letterSpacing: 3, paddingVertical: 6 },
});
