import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  EmptyState,
  ErrorState,
  FilterChips,
  Input,
  Loading,
  Screen,
} from "@/components";
import { adminApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useDebounced } from "@/hooks/useDebounced";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { SOCKET_EVENTS } from "@/services/socket";
import { formatRelativeTime } from "@/utils/format";
import type { AdminChat } from "@/types/admin";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Support", value: "support" },
  { label: "Restaurant", value: "restaurant" },
  { label: "Unread", value: "unread" },
];

/**
 * Every conversation on the platform.
 *
 * Customer↔restaurant threads and support threads land in the same list; the
 * type badge says which. Live updates arrive on the shared socket, so nothing
 * here polls.
 */
export const AdminMessagesScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<AdminChat | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const search = useDebounced(query, 250).trim().toLowerCase();
  const { data, loading, error, refetch } = useApi(() => adminApi.chats(), []);

  useSocketEvent(SOCKET_EVENTS.newMessage, () => void refetch());
  useSocketEvent(SOCKET_EVENTS.messageReceived, () => void refetch());

  /**
   * Filtering runs locally because the admin chat route returns the whole
   * (capped at 200) list with no query support — adding one would mean editing
   * the backend.
   */
  const chats = useMemo(() => {
    let rows = data ?? [];

    if (filter === "unread") rows = rows.filter((chat) => (chat.adminUnread ?? 0) > 0);
    else if (filter !== "all") rows = rows.filter((chat) => chat.chatType === filter);

    if (search) {
      rows = rows.filter((chat) =>
        [chat.customer?.name, chat.vendor?.name, chat.restaurant?.name, chat.lastMessage]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    return rows;
  }, [data, filter, search]);

  const send = useCallback(async () => {
    if (!open || !draft.trim()) return;
    setSending(true);
    try {
      await adminApi.sendMessage(open._id, draft.trim());
      setDraft("");
      setOpen(null);
      await refetch();
      toast.success("Message sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }, [draft, open, refetch, toast]);

  const title = useCallback((chat: AdminChat) => {
    if (chat.chatType === "support") {
      return chat.initiatedBy?.name ?? chat.customer?.name ?? "Support request";
    }
    return chat.restaurant?.name ?? chat.customer?.name ?? "Conversation";
  }, []);

  if (loading && !data) return <Loading label="Loading messages…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search people or messages"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

      <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={chats.length ? undefined : styles.empty}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setDraft("");
              setOpen(item);
            }}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: theme.colors.border,
                backgroundColor: pressed ? theme.colors.surface : "transparent",
              },
            ]}
          >
            <Avatar name={title(item)} size={44} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700" }}>
                {title(item)}
              </Text>
              <Text
                numberOfLines={1}
                style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 2 }}
              >
                {item.lastMessage || "No messages yet"}
              </Text>
              {item.chatType === "restaurant" && item.customer?.name ? (
                <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 2 }}>
                  with {item.customer.name}
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: "flex-end", gap: 5 }}>
              <Text style={{ color: theme.colors.textFaint, fontSize: 11 }}>
                {formatRelativeTime(item.lastMessageAt)}
              </Text>
              <Badge
                label={item.chatType === "support" ? "Support" : "Order"}
                tone={item.chatType === "support" ? "warning" : "info"}
              />
              {item.adminUnread ? <Badge label={String(item.adminUnread)} tone="error" /> : null}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No conversations"
            message={
              search || filter !== "all"
                ? "Nothing matches this search or filter."
                : "Messages between customers and restaurants appear here."
            }
          />
        }
      />

      {/* ── Thread ────────────────────────────────────────────────────── */}
      <BottomSheet
        visible={Boolean(open)}
        onClose={() => {
          setOpen(null);
          setDraft("");
        }}
        title={open ? title(open) : undefined}
      >
        <View style={styles.thread}>
          {(open?.messages ?? []).slice(-8).map((message, index) => {
            const fromAdmin = message.sender === "admin";
            return (
              <View
                key={message._id ?? index}
                style={[
                  styles.bubble,
                  {
                    alignSelf: fromAdmin ? "flex-end" : "flex-start",
                    backgroundColor: fromAdmin ? theme.colors.primary : theme.colors.surface,
                    borderRadius: theme.radius.md,
                  },
                ]}
              >
                {!fromAdmin ? (
                  <Text style={{ color: theme.colors.textFaint, fontSize: 10, fontWeight: "700", marginBottom: 2 }}>
                    {(message.sender ?? "user").toUpperCase()}
                  </Text>
                ) : null}
                <Text style={{ color: fromAdmin ? theme.colors.onPrimary : theme.colors.text }}>
                  {message.text}
                </Text>
              </View>
            );
          })}
          {!open?.messages?.length ? (
            <Text style={{ color: theme.colors.textFaint, textAlign: "center", paddingVertical: 20 }}>
              No messages yet
            </Text>
          ) : null}
        </View>

        <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 12 }}>
          Replying here posts as NearBitez support — both the customer and the restaurant see it.
        </Text>

        <Input
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a reply"
          multiline
          containerStyle={{ marginTop: 10 }}
        />
        <Button
          label="Send"
          fullWidth
          size="lg"
          loading={sending}
          disabled={!draft.trim()}
          onPress={send}
          style={{ marginTop: 12 }}
        />
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 16, paddingTop: 10 },
  empty: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thread: { maxHeight: 260, gap: 8 },
  bubble: { maxWidth: "82%", paddingHorizontal: 13, paddingVertical: 9 },
});
