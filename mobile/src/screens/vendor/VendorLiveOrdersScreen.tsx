import React, { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeIn, Layout } from "react-native-reanimated";
import { Badge, Button, EmptyState, ErrorState, Loading, Modal, Screen } from "@/components";
import { useTheme } from "@/hooks/useTheme";
import { useVendor } from "@/hooks/useVendor";
import { formatCurrency, formatRelativeTime, orderReference } from "@/utils/format";
import { LIVE_SECTIONS, NEXT_ACTIONS } from "@/utils/vendorOrders";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from "@/utils/format";
import type { Order, OrderStatus } from "@/types/models";
import type { VendorStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<VendorStackParamList>;

/**
 * The vendor's main workspace.
 *
 * Orders are grouped by stage so the kitchen can see the whole pipeline at a
 * glance, with the primary action on each card. Only transitions valid for the
 * current status are offered, mirroring the web app's rules.
 */
export const VendorLiveOrdersScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const { orders, loading, refreshing, error, refresh, pendingOrderId, updateOrderStatus } =
    useVendor();

  // Rejecting is destructive and irreversible — always confirm.
  const [rejecting, setRejecting] = useState<Order | null>(null);

  const grouped = useMemo(() => {
    const map: Partial<Record<OrderStatus, Order[]>> = {};
    for (const order of orders) {
      (map[order.status] ||= []).push(order);
    }
    return map;
  }, [orders]);

  const liveCount = LIVE_SECTIONS.reduce(
    (sum, section) => sum + (grouped[section.key]?.length ?? 0),
    0
  );

  if (loading && orders.length === 0) return <Loading label="Loading orders…" />;

  if (error && orders.length === 0) {
    return <ErrorState title="Couldn't load orders" message={error} onAction={() => refresh()} />;
  }

  const card = (order: Order) => {
    const actions = NEXT_ACTIONS[order.status] ?? [];
    const busy = pendingOrderId === order._id;
    const itemCount = order.items.reduce((sum, line) => sum + line.quantity, 0);

    return (
      <Animated.View
        key={order._id}
        layout={Layout.springify()}
        entering={FadeIn.duration(200)}
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderColor:
              order.status === "PLACED" ? theme.colors.primary : theme.colors.border,
            borderRadius: theme.radius.lg,
            opacity: busy ? 0.6 : 1,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.navigate("VendorOrderDetail", { orderId: order._id })}
        >
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 15 }}>
                {orderReference(order._id)}
              </Text>
              <Text style={{ color: theme.colors.textFaint, fontSize: 12, marginTop: 2 }}>
                {formatRelativeTime(order.createdAt)} · {itemCount}{" "}
                {itemCount === 1 ? "item" : "items"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 16 }}>
                {formatCurrency(order.grandTotal)}
              </Text>
              <Badge
                label={order.paymentStatus === "PAID" ? "Paid" : "COD"}
                tone={order.paymentStatus === "PAID" ? "success" : "neutral"}
              />
            </View>
          </View>

          <Text
            numberOfLines={2}
            style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 10 }}
          >
            {order.items.map((line) => `${line.quantity}× ${line.name}`).join(", ")}
          </Text>

          <Text
            numberOfLines={1}
            style={{ color: theme.colors.textFaint, fontSize: 12, marginTop: 6 }}
          >
            {order.deliveryPhone} · {order.deliveryAddress}
          </Text>
        </Pressable>

        {actions.length ? (
          <View style={[styles.actions, { borderTopColor: theme.colors.border }]}>
            {actions.map((action) => (
              <Button
                key={action.status}
                label={action.label}
                size="sm"
                variant={action.status === "REJECTED" ? "secondary" : "primary"}
                loading={busy}
                onPress={() => {
                  if (action.status === "REJECTED") setRejecting(order);
                  else void updateOrderStatus(order._id, action.status);
                }}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        ) : null}
      </Animated.View>
    );
  };

  return (
    <Screen padded={false} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "800" }}>
          Live orders
        </Text>
        <Badge
          label={liveCount > 0 ? `${liveCount} active` : "All clear"}
          tone={liveCount > 0 ? "warning" : "success"}
        />
      </View>

      <ScrollView
        contentContainerStyle={liveCount ? styles.content : styles.contentEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh({ silent: true })}
            tintColor={theme.colors.primary}
          />
        }
      >
        {liveCount === 0 ? (
          <EmptyState
            title="No live orders"
            message="New orders appear here the moment they're placed."
          />
        ) : (
          LIVE_SECTIONS.map((section) => {
            const items = grouped[section.key] ?? [];
            if (!items.length) return null;

            return (
              <View key={section.key} style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {section.title}
                  </Text>
                  <Badge label={String(items.length)} tone={ORDER_STATUS_TONE[section.key]} />
                </View>
                {items.map(card)}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title="Reject this order?"
      >
        <Text style={{ color: theme.colors.textMuted, lineHeight: 20 }}>
          {rejecting ? orderReference(rejecting._id) : ""} will be cancelled and the customer
          notified. This can't be undone.
        </Text>
        <View style={styles.modalActions}>
          <Button label="Keep" variant="secondary" onPress={() => setRejecting(null)} />
          <Button
            label="Reject"
            variant="danger"
            onPress={() => {
              const order = rejecting;
              setRejecting(null);
              if (order) void updateOrderStatus(order._id, "REJECTED");
            }}
          />
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: { padding: 16, paddingBottom: 32 },
  contentEmpty: { flexGrow: 1 },
  section: { marginBottom: 22 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  card: { borderWidth: 1.5, padding: 14, marginBottom: 10 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  actions: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 12,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
});
