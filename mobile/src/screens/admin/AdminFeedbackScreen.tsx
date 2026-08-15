import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import {
  Badge,
  BottomSheet,
  Button,
  DetailRow,
  EmptyState,
  ErrorState,
  FilterChips,
  Input,
  Loading,
  Screen,
} from "@/components";
import { adminApi } from "@/services/api";
import { useAdmin } from "@/hooks/useAdmin";
import { useApi } from "@/hooks/useApi";
import { useDebounced } from "@/hooks/useDebounced";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { formatRelativeTime } from "@/utils/format";
import { FEEDBACK_TONE, PRIORITY_TONE, refName, titleCase } from "@/utils/admin";
import { FEEDBACK_PRIORITIES, FEEDBACK_STATUSES } from "@/types/admin";
import type { AdminFeedback } from "@/types/admin";

const FILTERS = [
  { label: "All", value: "all" },
  ...FEEDBACK_STATUSES.map((status) => ({ label: titleCase(status), value: status })),
];

/**
 * Reported issues.
 *
 * Everything a customer or restaurant sent through the feedback form, with the
 * status and priority workflow the backend already models.
 */
export const AdminFeedbackScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const { refresh } = useAdmin();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<AdminFeedback | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const search = useDebounced(query, 300).trim();

  const { data, loading, error, refetch } = useApi(
    () =>
      adminApi.feedback({
        status: status === "all" ? undefined : status,
        search: search || undefined,
      }),
    [status, search]
  );

  const update = useCallback(
    async (item: AdminFeedback, payload: { status?: string; priority?: string; adminNote?: string }) => {
      setBusy(true);
      try {
        const updated = await adminApi.updateFeedback(item._id, payload);
        setSelected(updated);
        toast.success("Issue updated");
        await refetch();
        // The dashboard's open-issue count comes from the same collection.
        void refresh({ silent: true });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update issue");
      } finally {
        setBusy(false);
      }
    },
    [refetch, refresh, toast]
  );

  if (loading && !data) return <Loading label="Loading issues…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  const items = data?.data ?? [];

  return (
    <Screen padded={false} edges={["bottom"]}>
      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search title or message"
          autoCorrect={false}
        />
      </View>

      <FilterChips options={FILTERS} value={status} onChange={setStatus} />

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={items.length ? styles.list : styles.empty}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setNote(item.adminNote ?? "");
              setSelected(item);
            }}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? theme.colors.surface : theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
              },
            ]}
          >
            <View style={styles.rowHead}>
              <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700", flex: 1 }}>
                {item.title}
              </Text>
              <Badge label={titleCase(item.status)} tone={FEEDBACK_TONE[item.status] ?? "neutral"} />
            </View>
            <Text numberOfLines={2} style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 6 }}>
              {item.message}
            </Text>
            <View style={styles.tags}>
              <Badge label={titleCase(item.type)} tone="info" />
              <Badge label={titleCase(item.priority)} tone={PRIORITY_TONE[item.priority] ?? "neutral"} />
              <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginLeft: "auto" }}>
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            title="Nothing reported"
            message={
              search || status !== "all"
                ? "Nothing matches this search or filter."
                : "No issues have been reported."
            }
          />
        }
      />

      <BottomSheet
        visible={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title}
      >
        {selected ? (
          <>
            <Text style={{ color: theme.colors.text, lineHeight: 20, marginBottom: 14 }}>
              {selected.message}
            </Text>
            <DetailRow label="From" value={refName(selected.user, "Unknown")} />
            <DetailRow label="Role" value={titleCase(selected.userRole)} />
            <DetailRow label="Type" value={titleCase(selected.type)} />
            <DetailRow label="Restaurant" value={refName(selected.restaurant, "—")} />
            <DetailRow label="Reported" value={formatRelativeTime(selected.createdAt)} />

            <Text style={[styles.sheetLabel, { color: theme.colors.textMuted }]}>STATUS</Text>
            <View style={styles.actions}>
              {FEEDBACK_STATUSES.map((option) => (
                <Button
                  key={option}
                  label={titleCase(option)}
                  size="sm"
                  variant={selected.status === option ? "primary" : "secondary"}
                  disabled={selected.status === option || busy}
                  onPress={() => void update(selected, { status: option })}
                />
              ))}
            </View>

            <Text style={[styles.sheetLabel, { color: theme.colors.textMuted }]}>PRIORITY</Text>
            <View style={styles.actions}>
              {FEEDBACK_PRIORITIES.map((option) => (
                <Button
                  key={option}
                  label={titleCase(option)}
                  size="sm"
                  variant={selected.priority === option ? "primary" : "secondary"}
                  disabled={selected.priority === option || busy}
                  onPress={() => void update(selected, { priority: option })}
                />
              ))}
            </View>

            <Input
              label="Internal note"
              value={note}
              onChangeText={setNote}
              multiline
              containerStyle={{ marginTop: 18 }}
            />
            <Button
              label="Save note"
              fullWidth
              loading={busy}
              onPress={() => void update(selected, { adminNote: note })}
              style={{ marginTop: 12 }}
            />
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 16, paddingTop: 10 },
  list: { padding: 16, paddingTop: 4, gap: 12 },
  empty: { flexGrow: 1 },
  row: { borderWidth: 1, padding: 14 },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  tags: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  sheetLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
});
