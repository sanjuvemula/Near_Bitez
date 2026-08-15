import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  Badge,
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
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency } from "@/utils/format";
import { PLAN_STATUS_TONE, refName, titleCase } from "@/utils/admin";
import type { AdminRestaurant } from "@/types/admin";
import type { AdminScreenNavigation } from "@/types/navigation";


const FILTERS = [
  { label: "All", value: "all" },
  { label: "Open", value: "active" },
  { label: "Closed", value: "paused" },
  { label: "Tiffin", value: "tiffin" },
];

/**
 * Restaurant directory.
 *
 * Search and status filtering run on the server (`?search=&status=`) so the app
 * never pulls the full collection to filter it locally.
 */
export const AdminRestaurantsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<AdminScreenNavigation>();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const search = useDebounced(query, 300).trim();

  const { data, loading, error, refetch } = useApi(
    () => adminApi.restaurants({ search, status: status === "all" ? undefined : status }),
    [search, status]
  );

  // Coming back from a detail screen should reflect any status change made
  // there, without a full remount.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const restaurants = data ?? [];

  const renderItem = useCallback(
    ({ item }: { item: AdminRestaurant }) => (
      <RestaurantRow
        item={item}
        onPress={() =>
          navigation.navigate("AdminRestaurantDetail", {
            restaurantId: item._id,
            name: item.name,
          })
        }
      />
    ),
    [navigation]
  );

  if (loading && !data) return <Loading label="Loading restaurants…" />;
  if (error && !data) {
    return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;
  }

  return (
    <Screen padded={false} edges={["bottom"]}>
      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, category or address"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <FilterChips options={FILTERS} value={status} onChange={setStatus} />

      <FlatList
        data={restaurants}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={restaurants.length ? styles.list : styles.empty}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          restaurants.length ? (
            <Text style={[styles.count, { color: theme.colors.textMuted }]}>
              {restaurants.length} restaurant{restaurants.length === 1 ? "" : "s"}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="No restaurants"
            message={
              search || status !== "all"
                ? "Nothing matches this search or filter."
                : "No restaurants have been added yet."
            }
          />
        }
      />
    </Screen>
  );
};

/** Memoised so typing in the search box doesn't re-render every row. */
const RestaurantRow = React.memo<{ item: AdminRestaurant; onPress: () => void }>(
  ({ item, onPress }) => {
    const { theme } = useTheme();

    const planTone = useMemo(
      () => (item.planStatus ? PLAN_STATUS_TONE[item.planStatus] : "neutral"),
      [item.planStatus]
    );

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
              {item.name}
            </Text>
            <Text numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
              {titleCase(item.category)} · {refName(item.vendor, "No owner")}
            </Text>
          </View>
          <Badge
            label={item.isActive ? "Open" : "Closed"}
            tone={item.isActive ? "success" : "error"}
          />
        </View>

        <View style={[styles.metrics, { borderTopColor: theme.colors.border }]}>
          <Metric label="Orders" value={String(item.orderCount)} />
          <Metric label="Revenue" value={formatCurrency(item.totalRevenue)} />
          <Metric label="Menu" value={`${item.activeMenuCount}/${item.menuCount}`} />
        </View>

        <View style={styles.tags}>
          <Badge label={item.subscriptionPlanName || "No plan"} tone="primary" />
          {item.planStatus && item.planStatus !== "ACTIVE" ? (
            <Badge label={titleCase(item.planStatus)} tone={planTone} />
          ) : null}
          {item.tiffinAvailable ? (
            <Badge label={`Tiffin · ${item.activeTiffinSubscriptions}`} tone="info" />
          ) : null}
        </View>
      </Pressable>
    );
  }
);
RestaurantRow.displayName = "RestaurantRow";

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.colors.textFaint, fontSize: 10, fontWeight: "700" }}>
        {label.toUpperCase()}
      </Text>
      <Text numberOfLines={1} style={{ color: theme.colors.text, fontSize: 14, fontWeight: "700", marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 16, paddingTop: 10 },
  list: { padding: 16, paddingTop: 4, gap: 12 },
  empty: { flexGrow: 1 },
  count: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  row: { borderWidth: 1, padding: 14 },
  rowHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  metrics: { flexDirection: "row", gap: 12, borderTopWidth: 1, marginTop: 12, paddingTop: 10 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
});
