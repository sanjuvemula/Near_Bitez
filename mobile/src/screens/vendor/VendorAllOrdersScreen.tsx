import React, { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Badge, EmptyState, ErrorState, Input, Loading, Screen } from "@/components";
import { useDebounced } from "@/hooks/useDebounced";
import { useTheme } from "@/hooks/useTheme";
import { useVendor } from "@/hooks/useVendor";
import {
  formatCurrency,
  formatRelativeTime,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  orderReference,
} from "@/utils/format";
import type { Order, OrderStatus } from "@/types/models";
import type { VendorStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<VendorStackParamList>;

const FILTERS: { id: "ALL" | OrderStatus; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "PLACED", label: "Pending" },
  { id: "PREPARING", label: "Preparing" },
  { id: "DELIVERED", label: "Completed" },
  { id: "REJECTED", label: "Cancelled" },
];

/**
 * Full order history with filter and search.
 *
 * Reads the same list VendorContext already holds, so opening this screen
 * costs no extra request. The backend returns the vendor's orders unpaginated
 * today; if a `page` param is added later this is the one place to wire it.
 */
export const VendorAllOrdersScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const { orders, loading, refreshing, error, refresh } = useVendor();

  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [query, setQuery] = useState("");
  const search = useDebounced(query, 250).trim().toLowerCase();

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      if (filter !== "ALL" && order.status !== filter) return false;
      if (!search) return true;

      const haystack = [
        order._id,
        order.deliveryPhone,
        order.deliveryAddress,
        typeof order.customer === "object" ? order.customer?.name : "",
        ...order.items.map((line) => line.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [filter, orders, search]);

  if (loading && orders.length === 0) return <Loading label="Loading orders…" />;

  if (error && orders.length === 0) {
    return <ErrorState title="Couldn't load" message={error} onAction={() => refresh()} />;
  }

  const renderOrder = ({ item }: { item: Order }) => (
    <Pressable
      onPress={() => navigation.navigate("VendorOrderDetail", { orderId: item._id })}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
            {orderReference(item._id)}
          </Text>
          <Text style={{ color: theme.colors.textFaint, fontSize: 12, marginTop: 2 }}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
        <Badge label={ORDER_STATUS_LABEL[item.status]} tone={ORDER_STATUS_TONE[item.status]} />
      </View>

      <Text numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 8 }}>
        {item.items.map((line) => `${line.quantity}× ${line.name}`).join(", ")}
      </Text>

      <View style={[styles.foot, { borderTopColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{item.deliveryPhone}</Text>
        <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
          {formatCurrency(item.grandTotal)}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <Screen padded={false} edges={["top"]}>
      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search by order, phone or item"
          autoCorrect={false}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((option) => {
          const active = filter === option.id;
          const count =
            option.id === "ALL"
              ? orders.length
              : orders.filter((o) => o.status === option.id).length;

          return (
            <Pressable
              key={option.id}
              onPress={() => setFilter(option.id)}
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
                {option.label} {count > 0 ? count : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={filtered.length ? styles.list : styles.listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh({ silent: true })}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title={search ? "No matches" : "No orders"}
            message={
              search
                ? `Nothing matches "${query}".`
                : "Orders will appear here once customers start ordering."
            }
          />
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 16, paddingTop: 8 },
  filters: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  listEmpty: { flexGrow: 1 },
  card: { borderWidth: 1, padding: 14, marginBottom: 10 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  foot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 10,
  },
});
