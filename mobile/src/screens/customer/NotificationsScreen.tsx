import React from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { EmptyState, ErrorState, Loading, Screen } from "@/components";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { formatRelativeTime } from "@/utils/format";

/**
 * Notification list.
 *
 * Content is pushed live by the shared socket via NotificationContext, so this
 * screen only renders and marks items read.
 */
export const NotificationsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { items, unreadCount, loading, error, refresh, markRead, markAllRead, clearAll } =
    useNotifications();

  if (loading && items.length === 0) return <Loading label="Loading…" />;

  if (error && items.length === 0) {
    return <ErrorState title="Couldn't load" message={error} onAction={refresh} />;
  }

  return (
    <Screen padded={false} edges={["bottom"]}>
      {items.length > 0 ? (
        <View style={[styles.bar, { borderBottomColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </Text>
          <View style={styles.barActions}>
            {unreadCount > 0 ? (
              <Pressable onPress={() => void markAllRead()} hitSlop={8}>
                <Text style={{ color: theme.colors.primaryText, fontWeight: "700" }}>
                  Mark all read
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => void clearAll()} hitSlop={8}>
              <Text style={{ color: theme.colors.textFaint }}>Clear</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        initialNumToRender={10}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={items.length ? undefined : styles.emptyContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => !item.read && void markRead(item._id)}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: theme.colors.border,
                // Unread rows get a faint tint rather than a loud badge.
                backgroundColor: pressed
                  ? theme.colors.surface
                  : item.read
                  ? "transparent"
                  : theme.colors.primarySoft,
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: item.read ? "transparent" : theme.colors.primary,
                },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: item.read ? "600" : "800",
                  fontSize: 15,
                }}
              >
                {item.title}
              </Text>
              <Text style={{ color: theme.colors.textMuted, marginTop: 3, lineHeight: 19 }}>
                {item.message}
              </Text>
              <Text style={{ color: theme.colors.textFaint, fontSize: 12, marginTop: 6 }}>
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No notifications"
            message="Order updates and offers will show up here."
          />
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barActions: { flexDirection: "row", gap: 16 },
  emptyContent: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
});
