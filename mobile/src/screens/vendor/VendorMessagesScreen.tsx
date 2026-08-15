import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Avatar, Badge, BottomSheet, Button, EmptyState, ErrorState, Input, Loading, Screen } from "@/components";
import { vendorApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useDebounced } from "@/hooks/useDebounced";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { SOCKET_EVENTS } from "@/services/socket";
import { formatRelativeTime } from "@/utils/format";
import type { VendorChat } from "@/types/vendor";

/**
 * Vendor messaging.
 *
 * Conversation list plus a reply sheet. New messages arrive on the shared
 * socket (`new_message`), so the list stays current without polling.
 */
export const VendorMessagesScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [openChat, setOpenChat] = useState<VendorChat | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const search = useDebounced(query, 250).trim().toLowerCase();
  const { data, loading, error, refetch } = useApi(() => vendorApi.chats(), []);

  useSocketEvent(SOCKET_EVENTS.newMessage, () => void refetch());
  useSocketEvent(SOCKET_EVENTS.messageReceived, () => void refetch());

  const send = useCallback(async () => {
    if (!openChat || !draft.trim()) return;
    setSending(true);
    try {
      const updated = await vendorApi.sendMessage(openChat._id, draft.trim());
      setDraft("");
      setOpenChat(updated ?? openChat);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }, [draft, openChat, refetch, toast]);

  if (loading && !data) return <Loading label="Loading messages…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  const chats = (data ?? []).filter((chat) => {
    if (!search) return true;
    return (chat.customer?.name ?? "").toLowerCase().includes(search);
  });

  const lastMessage = (chat: VendorChat) =>
    chat.messages?.length ? chat.messages[chat.messages.length - 1] : undefined;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <View style={styles.searchWrap}>
        <Input value={query} onChangeText={setQuery} placeholder="Search customers" autoCorrect={false} />
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={chats.length ? undefined : styles.empty}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        renderItem={({ item }) => {
          const last = lastMessage(item);
          return (
            <Pressable
              onPress={() => setOpenChat(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  borderBottomColor: theme.colors.border,
                  backgroundColor: pressed ? theme.colors.surface : "transparent",
                },
              ]}
            >
              <Avatar name={item.customer?.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700" }}>
                  {item.customer?.name ?? "Customer"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 2 }}
                >
                  {last?.text ?? "No messages yet"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={{ color: theme.colors.textFaint, fontSize: 11 }}>
                  {formatRelativeTime(last?.createdAt ?? item.updatedAt)}
                </Text>
                {item.unreadCount ? <Badge label={String(item.unreadCount)} tone="error" /> : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No conversations"
            message="Messages from customers will appear here."
          />
        }
      />

      <BottomSheet
        visible={Boolean(openChat)}
        onClose={() => {
          setOpenChat(null);
          setDraft("");
        }}
        title={openChat?.customer?.name ?? "Conversation"}
      >
        <View style={styles.thread}>
          {(openChat?.messages ?? []).slice(-8).map((message, index) => {
            const fromVendor = message.senderRole === "vendor";
            return (
              <View
                key={message._id ?? index}
                style={[
                  styles.bubble,
                  {
                    alignSelf: fromVendor ? "flex-end" : "flex-start",
                    backgroundColor: fromVendor ? theme.colors.primary : theme.colors.surface,
                    borderRadius: theme.radius.md,
                  },
                ]}
              >
                <Text style={{ color: fromVendor ? theme.colors.onPrimary : theme.colors.text }}>
                  {message.text}
                </Text>
              </View>
            );
          })}
          {!openChat?.messages?.length ? (
            <Text style={{ color: theme.colors.textFaint, textAlign: "center", paddingVertical: 20 }}>
              No messages yet
            </Text>
          ) : null}
        </View>

        <Input
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a reply"
          multiline
          containerStyle={{ marginTop: 12 }}
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
  searchWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  empty: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thread: { maxHeight: 260, gap: 8 },
  bubble: { maxWidth: "82%", paddingHorizontal: 13, paddingVertical: 9 },
});
