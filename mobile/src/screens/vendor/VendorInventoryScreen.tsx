import React, { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from "react-native";
import { Badge, EmptyState, ErrorState, Loading, Screen } from "@/components";
import { vendorApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/utils/format";
import type { MenuItem } from "@/types/models";

type Filter = "ALL" | "IN_STOCK" | "OUT_OF_STOCK";

/**
 * Stock control.
 *
 * The MenuItem model tracks availability as a boolean, not a numeric count —
 * there is no quantity field on the backend. So this screen manages what
 * actually exists: whether each dish is live or sold out. Inventing a quantity
 * here would show numbers nothing else honours.
 */
export const VendorInventoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, loading, error, isNetworkError, refetch } = useApi(() => vendorApi.menu(), []);

  const items = data ?? [];
  const outOfStock = items.filter((i) => !i.isAvailable);

  const filtered = useMemo(() => {
    if (filter === "IN_STOCK") return items.filter((i) => i.isAvailable);
    if (filter === "OUT_OF_STOCK") return outOfStock;
    return items;
  }, [filter, items, outOfStock]);

  const toggle = async (item: MenuItem) => {
    setPendingId(item._id);
    try {
      await vendorApi.toggleAvailability(item._id, !item.isAvailable);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    } finally {
      setPendingId(null);
    }
  };

  if (loading && !data) return <Loading label="Loading stock…" />;

  if (error && !data) {
    return (
      <ErrorState
        title="Couldn't load"
        message={error}
        isNetworkError={isNetworkError}
        onAction={refetch}
      />
    );
  }

  const summary = (label: string, value: number, tint: string) => (
    <View
      key={label}
      style={[
        styles.summary,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.md },
      ]}
    >
      <Text style={{ color: tint, fontSize: 21, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: "700", marginTop: 2 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );

  return (
    <Screen padded={false} edges={["bottom"]}>
      <View style={styles.summaries}>
        {summary("Total", items.length, theme.colors.text)}
        {summary("Live", items.length - outOfStock.length, theme.colors.success)}
        {summary("Sold out", outOfStock.length, theme.colors.error)}
      </View>

      {outOfStock.length > 0 ? (
        <View
          style={[
            styles.warning,
            { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={{ color: theme.colors.warning, fontWeight: "700" }}>
            {outOfStock.length} {outOfStock.length === 1 ? "item is" : "items are"} sold out
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
            Customers can't order these until you mark them live.
          </Text>
        </View>
      ) : null}

      <View style={styles.filters}>
        {(["ALL", "IN_STOCK", "OUT_OF_STOCK"] as Filter[]).map((option) => {
          const active = filter === option;
          const label =
            option === "ALL" ? "All" : option === "IN_STOCK" ? "Live" : "Sold out";
          return (
            <Pressable
              key={option}
              onPress={() => setFilter(option)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.card,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                  borderRadius: theme.radius.pill,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? theme.colors.onPrimary : theme.colors.textMuted,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        initialNumToRender={10}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={filtered.length ? styles.list : styles.listEmpty}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.card,
                borderColor: item.isAvailable ? theme.colors.border : theme.colors.error,
                borderRadius: theme.radius.md,
                opacity: pendingId === item._id ? 0.6 : 1,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700" }}>
                {item.name}
              </Text>
              <View style={styles.rowMeta}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                  {formatCurrency(item.price)}
                </Text>
                {!item.isAvailable ? <Badge label="Sold out" tone="error" /> : null}
              </View>
            </View>
            <Switch
              value={item.isAvailable}
              disabled={pendingId === item._id}
              onValueChange={() => void toggle(item)}
              trackColor={{ true: theme.colors.success, false: theme.colors.border }}
              thumbColor="#fff"
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title={filter === "OUT_OF_STOCK" ? "Nothing sold out" : "No items"}
            message={
              filter === "OUT_OF_STOCK"
                ? "Every dish on your menu is available."
                : "Add dishes from the Menu tab first."
            }
          />
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  summaries: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 8 },
  summary: { flex: 1, borderWidth: 1, padding: 14, alignItems: "center" },
  warning: { marginHorizontal: 16, marginTop: 8, padding: 13 },
  filters: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  listEmpty: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
});
