import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { Badge, Button, ErrorState, Loading, Screen } from "@/components";
import { vendorApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { useVendor } from "@/hooks/useVendor";
import {
  formatCurrency,
  formatRelativeTime,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  orderReference,
} from "@/utils/format";
import { NEXT_ACTIONS } from "@/utils/vendorOrders";
import type { VendorStackParamList } from "@/types/navigation";

type DetailRoute = RouteProp<VendorStackParamList, "VendorOrderDetail">;

/** Full order view with the same status actions as the live workspace. */
export const VendorOrderDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { params } = useRoute<DetailRoute>();
  const { updateOrderStatus, pendingOrderId } = useVendor();

  const { data: order, loading, error, refetch } = useApi(
    () => vendorApi.orderById(params.orderId),
    [params.orderId]
  );

  if (loading && !order) return <Loading label="Loading order…" />;
  if (error && !order) {
    return <ErrorState title="Couldn't load order" message={error} onAction={refetch} />;
  }
  if (!order) return null;

  const actions = NEXT_ACTIONS[order.status] ?? [];
  const busy = pendingOrderId === order._id;
  const customerName = typeof order.customer === "object" ? order.customer?.name : undefined;

  const line = (label: string, value: number, strong = false) => (
    <View key={label} style={styles.row}>
      <Text
        style={{
          color: strong ? theme.colors.text : theme.colors.textMuted,
          fontWeight: strong ? "800" : "500",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: strong ? theme.colors.text : theme.colors.textMuted,
          fontWeight: strong ? "800" : "600",
        }}
      >
        {formatCurrency(value)}
      </Text>
    </View>
  );

  const card = (title: string, children: React.ReactNode) => (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.lg },
      ]}
    >
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{title}</Text>
      {children}
    </View>
  );

  return (
    <Screen padded={false} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 21, fontWeight: "800" }}>
              {orderReference(order._id)}
            </Text>
            <Text style={{ color: theme.colors.textFaint, fontSize: 13, marginTop: 3 }}>
              {formatRelativeTime(order.createdAt)}
            </Text>
          </View>
          <Badge label={ORDER_STATUS_LABEL[order.status]} tone={ORDER_STATUS_TONE[order.status]} />
        </View>

        {card(
          "Items",
          <>
            {order.items.map((item) => (
              <View key={`${item.menuItem}-${item.name}`} style={styles.itemRow}>
                <Text style={{ color: theme.colors.textMuted, width: 32 }}>{item.quantity}×</Text>
                <Text style={{ color: theme.colors.text, flex: 1 }}>{item.name}</Text>
                <Text style={{ color: theme.colors.textMuted }}>
                  {formatCurrency(item.price * item.quantity)}
                </Text>
              </View>
            ))}
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            {line("Item total", order.itemTotal)}
            {line("Delivery", order.deliveryFee)}
            {line("Platform fee", order.platformFee)}
            {line("Taxes", order.gst)}
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            {line("Order total", order.grandTotal, true)}
          </>
        )}

        {card(
          "Customer",
          <>
            {customerName ? (
              <Text style={{ color: theme.colors.text, fontWeight: "700", marginBottom: 6 }}>
                {customerName}
              </Text>
            ) : null}
            <Text style={{ color: theme.colors.textMuted }}>{order.deliveryPhone}</Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 6, lineHeight: 20 }}>
              {order.deliveryAddress}
            </Text>
            {order.deliveryInstructions ? (
              <Text style={{ color: theme.colors.textFaint, marginTop: 8, fontStyle: "italic" }}>
                “{order.deliveryInstructions}”
              </Text>
            ) : null}
            <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
              <Badge
                label={order.paymentStatus === "PAID" ? "Paid" : "Cash on delivery"}
                tone={order.paymentStatus === "PAID" ? "success" : "neutral"}
              />
            </View>
          </>
        )}
      </ScrollView>

      {actions.length ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
          ]}
        >
          {actions.map((action) => (
            <Button
              key={action.status}
              label={action.label}
              size="lg"
              variant={action.status === "REJECTED" ? "secondary" : "primary"}
              loading={busy}
              style={{ flex: 1 }}
              onPress={async () => {
                await updateOrderStatus(order._id, action.status);
                await refetch();
                if (action.status === "REJECTED") navigation.goBack();
              }}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 16 },
  card: { borderWidth: 1, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5, gap: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
