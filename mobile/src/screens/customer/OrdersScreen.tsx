import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Badge, EmptyState, ErrorState, Loading, Screen } from "@/components";
import { orderApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useTheme } from "@/hooks/useTheme";
import { SOCKET_EVENTS } from "@/services/socket";
import {
  formatCurrency,
  formatRelativeTime,
  isActiveOrder,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  orderReference,
} from "@/utils/format";
import type { CustomerStackParamList } from "@/types/navigation";
import type { Order } from "@/types/models";

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
type Tab = "active" | "history";

/**
 * Order list, split into Active and History.
 *
 * Refetches on focus and on a socket status update, so an order that moves
 * while the user is elsewhere is current when they come back.
 */
export const OrdersScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>("active");

  const { data, loading, error, isNetworkError, refetch } = useApi(
    () => orderApi.list(),
    []
  );

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  useSocketEvent(SOCKET_EVENTS.orderStatusUpdate, () => void refetch());

  const { active, history } = useMemo(() => {
    const orders = data ?? [];
    return {
      active: orders.filter((o) => isActiveOrder(o.status)),
      history: orders.filter((o) => !isActiveOrder(o.status)),
    };
  }, [data]);

  const list = tab === "active" ? active : history;

  if (loading && !data) return <Loading label="Loading your orders…" />;

  if (error && !data) {
    return (
      <ErrorState
        title="Couldn't load orders"
        message={error}
        isNetworkError={isNetworkError}
        onAction={refetch}
      />
    );
  }

  const renderOrder = ({ item }: { item: Order }) => {
    const restaurantName =
      typeof item.restaurant === "object" ? item.restaurant?.name : "Restaurant";
    const itemCount = item.items.reduce((sum, line) => sum + line.quantity, 0);

    return (
      <Pressable
        onPress={() => navigation.navigate("OrderTracking", { orderId: item._id })}
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
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[styles.restaurant, { color: theme.colors.text }]}>
              {restaurantName}
            </Text>
            <Text style={{ color: theme.colors.textFaint, fontSize: 12, marginTop: 2 }}>
              {orderReference(item._id)} · {formatRelativeTime(item.createdAt)}
            </Text>
          </View>
          <Badge
            label={ORDER_STATUS_LABEL[item.status]}
            tone={ORDER_STATUS_TONE[item.status]}
          />
        </View>

        <Text
          numberOfLines={2}
          style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 10 }}
        >
          {item.items.map((line) => `${line.quantity}× ${line.name}`).join(", ")}
        </Text>

        <View style={[styles.cardFoot, { borderTopColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </Text>
          <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 15 }}>
            {formatCurrency(item.grandTotal)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen padded={false} edges={["top"]}>
      <View style={styles.tabs}>
        {(["active", "history"] as Tab[]).map((option) => {
          const selected = tab === option;
          const count = option === "active" ? active.length : history.length;
          return (
            <Pressable
              key={option}
              onPress={() => setTab(option)}
              style={[
                styles.tab,
                {
                  borderBottomColor: selected ? theme.colors.primary : "transparent",
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: selected ? "800" : "600",
                  color: selected ? theme.colors.text : theme.colors.textMuted,
                }}
              >
                {option === "active" ? "Active" : "History"}
                {count > 0 ? `  ${count}` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={
          list.length ? styles.listContent : styles.listContentEmpty
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title={tab === "active" ? "No active orders" : "No past orders"}
            message={
              tab === "active"
                ? "Orders you place will show up here while they're on the way."
                : "Your completed and cancelled orders will appear here."
            }
            actionLabel={tab === "active" ? "Browse restaurants" : undefined}
            onAction={
              tab === "active"
                ? () => navigation.navigate("Tabs", { screen: "Home" })
                : undefined
            }
          />
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", paddingHorizontal: 16 },
  tab: { paddingVertical: 14, paddingHorizontal: 4, marginRight: 24, borderBottomWidth: 2 },
  listContent: { padding: 16, paddingBottom: 28 },
  listContentEmpty: { flexGrow: 1 },
  card: { borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  restaurant: { fontSize: 16, fontWeight: "700" },
  cardFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 12,
  },
});
