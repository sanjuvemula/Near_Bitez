import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  DetailRow,
  EmptyState,
  ErrorState,
  FilterChips,
  Input,
  Loading,
  Modal,
  Screen,
  StatGrid,
  StatTile,
} from "@/components";
import { adminApi } from "@/services/api";
import { useAdmin } from "@/hooks/useAdmin";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatRelativeTime } from "@/utils/format";
import { PAYOUT_NEXT, PAYOUT_TONE, refName, shortId, titleCase } from "@/utils/admin";
import type { Payout, PayoutStatus } from "@/types/admin";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Requested", value: "REQUESTED" },
  { label: "Approved", value: "APPROVED" },
  { label: "Paid", value: "PAID" },
  { label: "Rejected", value: "REJECTED" },
];

/**
 * Platform money.
 *
 * The totals come straight from the stats and subscription-analytics
 * aggregations; nothing is summed on the device. Payout state changes go
 * through the server, which stamps who resolved it and when.
 */
export const AdminFinanceScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const { stats, analytics, refresh } = useAdmin();

  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Payout | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; run: () => Promise<void> }>(null);

  const { data, loading, error, refetch } = useApi(() => adminApi.payouts(status), [status]);

  const payouts = data ?? [];

  const byStatus = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const row of stats?.finance.payoutsByStatus ?? []) {
      map.set(row.status, { count: row.count, amount: row.amount });
    }
    return map;
  }, [stats]);

  const act = useCallback(
    async (payout: Payout, next: PayoutStatus) => {
      setBusy(true);
      try {
        const updated = await adminApi.updatePayoutStatus(payout._id, next, note.trim() || undefined);
        setSelected(updated);
        setNote("");
        toast.success(`Marked ${titleCase(next).toLowerCase()}`);
        await refetch();
        void refresh({ silent: true });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update payout");
      } finally {
        setBusy(false);
        setConfirm(null);
      }
    },
    [note, refetch, refresh, toast]
  );

  const renderItem = useCallback(
    ({ item }: { item: Payout }) => (
      <PayoutRow
        item={item}
        onPress={() => {
          setNote(item.note ?? "");
          setSelected(item);
        }}
      />
    ),
    []
  );

  if (loading && !data) return <Loading label="Loading finance…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <FlatList
        data={payouts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={payouts.length ? styles.list : undefined}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <StatGrid>
              <StatTile
                label="Order value"
                value={formatCurrency(stats?.revenue.total ?? 0)}
                caption="Delivered, all time"
              />
              <StatTile
                label="Commission"
                value={formatCurrency(analytics?.totals.commissionRevenue ?? 0)}
                caption="Last 30 days"
                tone="success"
              />
              <StatTile
                label="Subscriptions"
                value={formatCurrency(analytics?.totals.monthlyRecurringRevenue ?? 0)}
                caption="Monthly recurring"
                tone="info"
              />
              <StatTile
                label="Held for payout"
                value={formatCurrency(stats?.finance.openPayoutAmount ?? 0)}
                caption={`${stats?.finance.pendingPayouts ?? 0} requests`}
                tone="warning"
              />
            </StatGrid>

            {stats?.finance.payoutsByStatus.length ? (
              <Card style={{ marginTop: 14 }}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Payouts by state</Text>
                {stats.finance.payoutsByStatus.map((row) => (
                  <DetailRow
                    key={row.status}
                    label={`${titleCase(row.status)} · ${row.count}`}
                    value={formatCurrency(row.amount)}
                  />
                ))}
              </Card>
            ) : null}

            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
              PAYOUT REQUESTS
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No payout requests"
            message={
              status === "all"
                ? "Restaurants have not requested any payouts yet."
                : `Nothing is ${titleCase(status).toLowerCase()}.`
            }
            style={{ paddingVertical: 40 }}
          />
        }
      />

      <View style={[styles.filterBar, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <FilterChips
          options={FILTERS.map((filter) => ({
            ...filter,
            badge: filter.value === "all" ? undefined : byStatus.get(filter.value)?.count,
          }))}
          value={status}
          onChange={setStatus}
        />
      </View>

      {/* ── Payout sheet ──────────────────────────────────────────────── */}
      <BottomSheet
        visible={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${formatCurrency(selected.amount)} payout` : undefined}
      >
        {selected ? (
          <>
            <DetailRow label="Request" value={shortId(selected._id)} />
            <DetailRow label="Restaurant" value={refName(selected.restaurant)} />
            <DetailRow label="Owner" value={refName(selected.vendor)} />
            <DetailRow
              label="Owner email"
              value={typeof selected.vendor === "object" ? selected.vendor?.email : undefined}
            />
            <DetailRow label="Requested" value={formatRelativeTime(selected.createdAt)} />
            <DetailRow label="State" value={titleCase(selected.status)} />
            {selected.resolvedAt ? (
              <DetailRow
                label="Resolved"
                value={`${formatRelativeTime(selected.resolvedAt)} by ${refName(selected.resolvedBy, "admin")}`}
              />
            ) : null}

            {PAYOUT_NEXT[selected.status].length ? (
              <>
                <Input
                  label="Note"
                  hint="Optional, saved with the decision"
                  value={note}
                  onChangeText={setNote}
                  multiline
                  containerStyle={{ marginTop: 16 }}
                />
                <View style={styles.actions}>
                  {PAYOUT_NEXT[selected.status].map((next) => (
                    <Button
                      key={next}
                      label={`Mark ${titleCase(next).toLowerCase()}`}
                      variant={next === "REJECTED" ? "danger" : "primary"}
                      size="sm"
                      disabled={busy}
                      onPress={() =>
                        setConfirm({
                          title: `Mark ${titleCase(next).toLowerCase()}?`,
                          body:
                            next === "PAID"
                              ? `Confirms ${formatCurrency(selected.amount)} has been transferred to ${refName(selected.restaurant, "the restaurant")}. This is final.`
                              : next === "REJECTED"
                                ? "The request is declined and the restaurant keeps the balance. This is final."
                                : "The request moves forward for transfer.",
                          run: () => act(selected, next),
                        })
                      }
                    />
                  ))}
                </View>
              </>
            ) : (
              <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 16 }}>
                This request is settled — no further action is possible.
              </Text>
            )}
          </>
        ) : null}
      </BottomSheet>

      <Modal visible={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm?.title}>
        <Text style={{ color: theme.colors.textMuted, lineHeight: 20 }}>{confirm?.body}</Text>
        <View style={styles.modalActions}>
          <Button label="Cancel" variant="secondary" onPress={() => setConfirm(null)} />
          <Button label="Confirm" loading={busy} onPress={() => void confirm?.run()} />
        </View>
      </Modal>
    </Screen>
  );
};

const PayoutRow = React.memo<{ item: Payout; onPress: () => void }>(({ item, onPress }) => {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.colors.surface : theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700", fontSize: 15 }}>
          {refName(item.restaurant, "Restaurant")}
        </Text>
        <Text numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
          {refName(item.vendor, "Owner")} · {formatRelativeTime(item.createdAt)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 5 }}>
        <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 16 }}>
          {formatCurrency(item.amount)}
        </Text>
        <Badge label={titleCase(item.status)} tone={PAYOUT_TONE[item.status]} />
      </View>
    </Pressable>
  );
});
PayoutRow.displayName = "PayoutRow";

const styles = StyleSheet.create({
  header: { padding: 16, paddingBottom: 0 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginTop: 24, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, padding: 14 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap" },
  filterBar: { borderTopWidth: StyleSheet.hairlineWidth },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
});
