import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Badge, EmptyState, ErrorState, FilterChips, Input, Loading, Screen } from "@/components";
import { adminApi } from "@/services/api";
import { useDebounced } from "@/hooks/useDebounced";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useTheme } from "@/hooks/useTheme";
import { SOCKET_EVENTS } from "@/services/socket";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, formatCurrency, formatRelativeTime } from "@/utils/format";
import { refName, shortId } from "@/utils/admin";
import type { AdminOrder } from "@/types/admin";
import type { AdminScreenNavigation } from "@/types/navigation";


const PAGE_SIZE = 30;

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Placed", value: "PLACED" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Preparing", value: "PREPARING" },
  { label: "Ready", value: "READY" },
  { label: "On the way", value: "OUT_FOR_DELIVERY" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "REJECTED" },
  { label: "Scheduled", value: "SCHEDULED" },
];

/**
 * Platform-wide order list.
 *
 * Paginated by request rather than loaded whole — the backend caps a page at
 * 150 and reports `total`, so the list appends a page at a time as the admin
 * scrolls. A live order event only refreshes page one; it never resets a scroll
 * position deeper in the list.
 */
export const AdminOrdersScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<AdminScreenNavigation>();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useDebounced(query, 350).trim();

  /**
   * Guards against an out-of-order response overwriting a newer one — a slow
   * page-1 request must not clobber results from a filter the admin has since
   * changed.
   */
  const requestId = useRef(0);

  const load = useCallback(
    async (nextPage: number, mode: "replace" | "append") => {
      const id = ++requestId.current;
      if (mode === "append") setLoadingMore(true);
      else setLoading(true);

      try {
        const result = await adminApi.orders({
          status: status === "all" ? undefined : status,
          search: search || undefined,
          page: nextPage,
          limit: PAGE_SIZE,
        });
        if (id !== requestId.current) return;

        setOrders((prev) => (mode === "append" ? [...prev, ...result.data] : result.data));
        setTotal(result.total ?? result.data.length);
        setPage(nextPage);
        // The server slices the page *before* applying `search`, so a filtered
        // page can be short or empty while more pages still exist. Paging stops
        // only once a request covers the end of the unfiltered collection.
        setExhausted(nextPage * PAGE_SIZE >= (result.total ?? result.data.length));
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Could not load orders");
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [search, status]
  );

  useEffect(() => {
    void load(1, "replace");
  }, [load]);

  // A new order or a status change refreshes the top of the list only.
  const refreshFirstPage = useCallback(() => {
    if (page === 1) void load(1, "replace");
  }, [load, page]);

  useSocketEvent(SOCKET_EVENTS.newOrder, refreshFirstPage);
  useSocketEvent(SOCKET_EVENTS.orderStatusUpdate, refreshFirstPage);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || exhausted) return;
    void load(page + 1, "append");
  }, [exhausted, load, loading, loadingMore, page]);

  const renderItem = useCallback(
    ({ item }: { item: AdminOrder }) => (
      <OrderRow
        item={item}
        // The row already holds the full order, and the admin API has no
        // fetch-by-id route, so it is handed over rather than re-queried.
        onPress={() => navigation.navigate("AdminOrderDetail", { orderId: item._id, order: item })}
      />
    ),
    [navigation]
  );

  if (loading && !orders.length) return <Loading label="Loading orders…" />;
  if (error && !orders.length) {
    return <ErrorState title="Couldn't load" message={error} onAction={() => load(1, "replace")} />;
  }

  return (
    <Screen padded={false} edges={["bottom"]}>
      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search order, customer or restaurant"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <FilterChips options={FILTERS} value={status} onChange={setStatus} />

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        initialNumToRender={12}
        windowSize={9}
        removeClippedSubviews
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={orders.length ? styles.list : styles.empty}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => load(1, "replace")}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          orders.length ? (
            <Text style={[styles.count, { color: theme.colors.textMuted }]}>
              Showing {orders.length} of {total}
            </Text>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="No orders"
            message={
              search || status !== "all"
                ? "Nothing matches this search or filter."
                : "No orders have been placed yet."
            }
          />
        }
      />
    </Screen>
  );
};

const OrderRow = React.memo<{ item: AdminOrder; onPress: () => void }>(({ item, onPress }) => {
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
      <View style={styles.rowHead}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700", fontSize: 15 }}>
            {shortId(item._id)} · {refName(item.restaurant, "Restaurant")}
          </Text>
          <Text numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
            {refName(item.customer, "Customer")} · {item.items?.length ?? 0} item
            {item.items?.length === 1 ? "" : "s"}
          </Text>
        </View>
        <Badge label={ORDER_STATUS_LABEL[item.status]} tone={ORDER_STATUS_TONE[item.status]} />
      </View>

      <View style={[styles.rowFoot, { borderTopColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.textFaint, fontSize: 12 }}>
          {formatRelativeTime(item.createdAt)}
        </Text>
        <View style={styles.rowFootRight}>
          {item.freeOrderApplied ? <Badge label="Free order" tone="info" /> : null}
          <Badge
            label={item.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
            tone={item.paymentStatus === "PAID" ? "success" : "warning"}
          />
          <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 15 }}>
            {formatCurrency(item.grandTotal)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});
OrderRow.displayName = "OrderRow";

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 16, paddingTop: 10 },
  list: { padding: 16, paddingTop: 4, gap: 12 },
  empty: { flexGrow: 1 },
  count: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  row: { borderWidth: 1, padding: 14 },
  rowHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  rowFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
    gap: 8,
  },
  rowFootRight: { flexDirection: "row", alignItems: "center", gap: 8 },
});
