import React, { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Badge, ErrorState, Loading, Screen } from "@/components";
import { orderApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useTheme } from "@/hooks/useTheme";
import { SOCKET_EVENTS } from "@/services/socket";
import {
  formatCurrency,
  formatDate,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  orderReference,
} from "@/utils/format";
import { ORDER_FLOW, type OrderStatus } from "@/types/models";
import { WaitAndPlayCard } from "@/features/games/components/WaitAndPlayCard";
import type { CustomerStackParamList } from "@/types/navigation";

type TrackRoute = RouteProp<CustomerStackParamList, "OrderTracking">;

/**
 * Live order tracking.
 *
 * Listens on the app's shared socket for `order_status_update`, which the
 * vendor controller emits into `customer_<id>`. Only events for this order
 * trigger a refetch, so the timeline advances without a manual refresh and
 * without polling.
 */
export const OrderTrackingScreen: React.FC = () => {
  const { theme } = useTheme();
  const { params } = useRoute<TrackRoute>();

  const { data: order, loading, error, isNetworkError, refetch } = useApi(
    () => orderApi.byId(params.orderId),
    [params.orderId]
  );

  const onStatusEvent = useCallback(
    (payload: { orderId?: string; _id?: string } | undefined) => {
      const id = payload?.orderId ?? payload?._id;
      // The server sometimes emits without an id; refetch rather than miss it.
      if (!id || id === params.orderId) void refetch();
    },
    [params.orderId, refetch]
  );

  useSocketEvent(SOCKET_EVENTS.orderStatusUpdate, onStatusEvent);
  useSocketEvent(SOCKET_EVENTS.orderOutForDelivery, onStatusEvent);

  if (loading && !order) return <Loading label="Loading order…" />;

  if (error && !order) {
    return (
      <ErrorState
        title="Couldn't load order"
        message={error}
        isNetworkError={isNetworkError}
        onAction={refetch}
      />
    );
  }
  if (!order) return null;

  const rejected = order.status === "REJECTED";
  const currentIndex = ORDER_FLOW.indexOf(order.status as OrderStatus);
  const restaurantName =
    typeof order.restaurant === "object" ? order.restaurant?.name : "Restaurant";

  const stampFor = (status: OrderStatus) =>
    order.statusTimeline?.find((entry) => entry.status === status)?.changedAt;

  const row = (label: string, value: number, strong = false) => (
    <View style={styles.row} key={label}>
      <Text
        style={{
          color: strong ? theme.colors.text : theme.colors.textMuted,
          fontWeight: strong ? "800" : "500",
          fontSize: strong ? 16 : 14,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: strong ? theme.colors.text : theme.colors.textMuted,
          fontWeight: strong ? "800" : "600",
          fontSize: strong ? 16 : 14,
        }}
      >
        {formatCurrency(value)}
      </Text>
    </View>
  );

  return (
    <Screen padded={false} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.restaurant, { color: theme.colors.text }]}>
              {restaurantName}
            </Text>
            <Text style={{ color: theme.colors.textFaint, fontSize: 13, marginTop: 3 }}>
              {orderReference(order._id)} · {formatDate(order.createdAt)}
            </Text>
          </View>
          <Badge
            label={ORDER_STATUS_LABEL[order.status]}
            tone={ORDER_STATUS_TONE[order.status]}
          />
        </View>

        {rejected ? (
          <View
            style={[
              styles.rejected,
              { backgroundColor: theme.colors.errorSoft, borderRadius: theme.radius.lg },
            ]}
          >
            <Text style={{ color: theme.colors.error, fontWeight: "700", fontSize: 15 }}>
              This order was cancelled
            </Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 4, fontSize: 13 }}>
              The restaurant couldn't accept it. You have not been charged.
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
              },
            ]}
          >
            {ORDER_FLOW.map((status, index) => {
              const done = index <= currentIndex;
              const isCurrent = index === currentIndex;
              const stamp = stampFor(status);

              return (
                <View key={status} style={styles.step}>
                  <View style={styles.stepRail}>
                    <Animated.View
                      entering={done ? FadeIn.duration(250) : undefined}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: done ? theme.colors.primary : theme.colors.border,
                          // The live step gets a ring so it stands out.
                          borderColor: isCurrent ? theme.colors.primary : "transparent",
                          borderWidth: isCurrent ? 4 : 0,
                        },
                      ]}
                    />
                    {index < ORDER_FLOW.length - 1 ? (
                      <View
                        style={[
                          styles.line,
                          {
                            backgroundColor:
                              index < currentIndex ? theme.colors.primary : theme.colors.border,
                          },
                        ]}
                      />
                    ) : null}
                  </View>

                  <View style={styles.stepBody}>
                    <Text
                      style={{
                        color: done ? theme.colors.text : theme.colors.textFaint,
                        fontWeight: isCurrent ? "800" : "600",
                        fontSize: 15,
                      }}
                    >
                      {ORDER_STATUS_LABEL[status]}
                    </Text>
                    {stamp ? (
                      <Text
                        style={{ color: theme.colors.textFaint, fontSize: 12, marginTop: 2 }}
                      >
                        {new Date(stamp).toLocaleTimeString("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Offered only while the kitchen has the order; it hides itself once
            the rider is moving so it never competes with live tracking. */}
        <WaitAndPlayCard status={order.status} />

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Items</Text>
          {order.items.map((line) => (
            <View key={`${line.menuItem}-${line.name}`} style={styles.itemRow}>
              <Text style={{ color: theme.colors.textMuted, width: 30 }}>
                {line.quantity}×
              </Text>
              <Text style={{ color: theme.colors.text, flex: 1 }} numberOfLines={2}>
                {line.name}
              </Text>
              <Text style={{ color: theme.colors.textMuted }}>
                {formatCurrency(line.price * line.quantity)}
              </Text>
            </View>
          ))}

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          {row("Item total", order.itemTotal)}
          {row("Delivery fee", order.deliveryFee)}
          {row("Platform fee", order.platformFee)}
          {row("Taxes", order.gst)}
          {order.promoDiscount ? row("Promo discount", -order.promoDiscount) : null}
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          {row("Total paid", order.grandTotal, true)}
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Delivering to</Text>
          <Text style={{ color: theme.colors.textMuted, lineHeight: 20 }}>
            {order.deliveryAddress}
          </Text>
          <Text style={{ color: theme.colors.textMuted, marginTop: 6 }}>
            {order.deliveryPhone}
          </Text>
          {order.deliveryInstructions ? (
            <Text style={{ color: theme.colors.textFaint, marginTop: 8, fontStyle: "italic" }}>
              “{order.deliveryInstructions}”
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 16 },
  restaurant: { fontSize: 20, fontWeight: "800" },
  rejected: { padding: 16, marginBottom: 14 },
  card: { borderWidth: 1, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  step: { flexDirection: "row", gap: 14 },
  stepRail: { alignItems: "center", width: 20 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  line: { width: 2, flex: 1, minHeight: 26 },
  stepBody: { flex: 1, paddingBottom: 20 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5, gap: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
});
