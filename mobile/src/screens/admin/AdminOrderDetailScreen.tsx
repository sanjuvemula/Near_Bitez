import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  DetailRow,
  ErrorState,
  Loading,
  Modal,
  Screen,
  Section,
} from "@/components";
import { adminApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  formatCurrency,
  formatRelativeTime,
} from "@/utils/format";
import { refName, shortId, titleCase } from "@/utils/admin";
import { ORDER_STATUSES } from "@/types/admin";
import type { AdminOrder } from "@/types/admin";
import type { OrderStatus } from "@/types/models";
import type { AdminStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<AdminStackParamList>;
type Route = RouteProp<AdminStackParamList, "AdminOrderDetail">;

/**
 * One order, end to end.
 *
 * The commission and free-order figures shown here are the snapshot the server
 * wrote when the order was placed — they are displayed as stored, never
 * recalculated, so this screen always agrees with what the restaurant was
 * actually charged.
 */
export const AdminOrderDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const [statusSheet, setStatusSheet] = useState(false);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; run: () => Promise<void> }>(null);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<AdminOrder | null>(params.order ?? null);

  /**
   * There is no GET /admin/orders/:id, and the list route applies `search`
   * only within the page it already sliced — so an older order is not
   * reachable by id. The caller therefore hands over the row it loaded, and
   * this request exists to refresh it. It finds recent orders; when it can't,
   * the handed-over copy still renders.
   */
  const { data, loading, error, refetch } = useApi(
    () => adminApi.orders({ search: params.orderId, limit: 150 }),
    [params.orderId]
  );

  const fetched = useMemo(
    () => data?.data.find((row) => row._id === params.orderId) ?? null,
    [data, params.orderId]
  );

  // Prefer whichever copy is freshest: a local write, then the refetch, then
  // what navigation supplied.
  const current = order ?? fetched ?? params.order ?? null;

  const changeStatus = useCallback(
    async (status: OrderStatus) => {
      setBusy(true);
      try {
        const updated = await adminApi.updateOrderStatus(params.orderId, status);
        // `updated` is the raw order document with unpopulated refs, so it is
        // merged over the populated copy rather than replacing it — otherwise
        // the customer and restaurant names would fall back to ids.
        setOrder((prev) => ({ ...(prev ?? fetched ?? params.order), ...updated }) as AdminOrder);
        setStatusSheet(false);
        setConfirm(null);
        toast.success(`Moved to ${ORDER_STATUS_LABEL[status]}`);
        void refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update status");
      } finally {
        setBusy(false);
      }
    },
    [fetched, params.order, params.orderId, refetch, toast]
  );

  const removeOrder = useCallback(async () => {
    setBusy(true);
    try {
      await adminApi.deleteOrder(params.orderId);
      toast.success("Order deleted");
      navigation.goBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete order");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }, [navigation, params.orderId, toast]);

  if (loading && !current) return <Loading label="Loading order…" />;
  if (error && !current) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;
  if (!current) return <ErrorState title="Order not found" onAction={refetch} />;

  const timeline = current.statusTimeline ?? [];

  return (
    <Screen padded={false} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
      >
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "800" }}>
              {shortId(current._id)}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 3 }}>
              {formatRelativeTime(current.createdAt)} · {refName(current.restaurant, "Restaurant")}
            </Text>
          </View>
          <Badge label={ORDER_STATUS_LABEL[current.status]} tone={ORDER_STATUS_TONE[current.status]} />
        </View>

        {/* A missing delivery phone makes the Order document fail validation, so
            every status write is rejected until it is filled in. Warn up front
            rather than letting the admin hit an opaque server error. */}
        {!current.deliveryPhone ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: theme.colors.errorSoft, borderRadius: theme.radius.md },
            ]}
          >
            <Text style={{ color: theme.colors.error, fontWeight: "700", fontSize: 13 }}>
              This order has no delivery phone
            </Text>
            <Text style={{ color: theme.colors.error, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
              The order record requires one, so status changes will be rejected until it is set —
              from this app and from the web dashboard alike.
            </Text>
          </View>
        ) : null}

        <Button
          label="Change status"
          fullWidth
          onPress={() => setStatusSheet(true)}
          style={{ marginTop: 14 }}
        />

        {/* ── Items ───────────────────────────────────────────────────── */}
        <Section title="Items">
          <Card padded={false}>
            {(current.items ?? []).map((item, index) => (
              <View
                key={`${item.menuItem}-${index}`}
                style={[
                  styles.item,
                  {
                    borderBottomWidth:
                      index === (current.items?.length ?? 0) - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.textMuted, fontWeight: "700", width: 32 }}>
                  {item.quantity}×
                </Text>
                <Text numberOfLines={2} style={{ color: theme.colors.text, flex: 1, fontWeight: "600" }}>
                  {item.name}
                </Text>
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                  {formatCurrency(item.price * item.quantity)}
                </Text>
              </View>
            ))}
          </Card>
        </Section>

        {/* ── Bill ────────────────────────────────────────────────────── */}
        <Section title="Bill">
          <Card>
            <DetailRow label="Items" value={formatCurrency(current.itemTotal)} />
            <DetailRow label="Delivery" value={formatCurrency(current.deliveryFee)} />
            <DetailRow label="Platform fee" value={formatCurrency(current.platformFee)} />
            <DetailRow label="GST" value={formatCurrency(current.gst)} />
            {current.promoDiscount ? (
              <DetailRow
                label={`Promo ${current.promoCode ?? ""}`.trim()}
                value={`− ${formatCurrency(current.promoDiscount)}`}
                tone={theme.colors.success}
              />
            ) : null}
            {current.loyaltyDiscount ? (
              <DetailRow
                label="Loyalty discount"
                value={`− ${formatCurrency(current.loyaltyDiscount)}`}
                tone={theme.colors.success}
              />
            ) : null}
            <DetailRow label="Total" value={formatCurrency(current.grandTotal)} />
            <DetailRow
              label="Payment"
              value={`${titleCase(current.paymentMethod)} · ${current.paymentStatus === "PAID" ? "Paid" : "Unpaid"}`}
              tone={current.paymentStatus === "PAID" ? theme.colors.success : theme.colors.warning}
            />
          </Card>
        </Section>

        {/* ── Commission snapshot ─────────────────────────────────────── */}
        <Section title="Platform earnings">
          <Card>
            <DetailRow label="Plan at order time" value={current.vendorPlanName || current.subscriptionPlanName} />
            <DetailRow
              label="Commission rate"
              value={current.commissionPercent != null ? `${current.commissionPercent}%` : undefined}
            />
            <DetailRow
              label="Commission charged"
              value={current.commissionAmount != null ? formatCurrency(current.commissionAmount) : undefined}
              tone={theme.colors.success}
            />
            <DetailRow
              label="Restaurant receives"
              value={current.vendorNetAmount != null ? formatCurrency(current.vendorNetAmount) : undefined}
            />
            {current.freeOrderApplied ? (
              <DetailRow
                label="Free order"
                value={`Yes · ${current.freeOrdersRemainingAfter ?? 0} left after this`}
                tone={theme.colors.info}
              />
            ) : (
              <DetailRow label="Free order" value="No" />
            )}
            {current.quotaTotalAtOrder ? (
              <DetailRow
                label="Quota at order time"
                value={`${current.quotaUsedAtOrder ?? 0} / ${current.quotaTotalAtOrder}`}
              />
            ) : null}
          </Card>
        </Section>

        {/* ── Delivery ────────────────────────────────────────────────── */}
        <Section title="Delivery">
          <Card>
            <DetailRow label="Customer" value={refName(current.customer, "Customer")} />
            <DetailRow
              label="Phone"
              value={current.deliveryPhone}
              tone={current.deliveryPhone ? undefined : theme.colors.error}
            />
            <DetailRow label="Address" value={current.deliveryAddress} />
            {current.deliveryInstructions ? (
              <DetailRow label="Instructions" value={current.deliveryInstructions} />
            ) : null}
            {current.scheduledFor ? (
              <DetailRow label="Scheduled for" value={formatRelativeTime(current.scheduledFor)} />
            ) : null}
          </Card>
        </Section>

        {/* ── Lifecycle ───────────────────────────────────────────────── */}
        {timeline.length ? (
          <Section title="Lifecycle">
            <Card>
              {timeline.map((event, index) => (
                <View key={`${event.status}-${index}`} style={styles.timeline}>
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor:
                          index === timeline.length - 1 ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  />
                  <Text style={{ color: theme.colors.text, flex: 1, fontWeight: "600" }}>
                    {ORDER_STATUS_LABEL[event.status]}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {formatRelativeTime(event.changedAt)}
                  </Text>
                </View>
              ))}
            </Card>
          </Section>
        ) : null}

        <Button
          label="Delete order"
          variant="danger"
          fullWidth
          onPress={() =>
            setConfirm({
              title: "Delete this order?",
              body: "The order record is removed permanently. Revenue and commission reporting will no longer include it. This cannot be undone.",
              run: removeOrder,
            })
          }
          style={{ marginTop: 28 }}
        />
      </ScrollView>

      {/* ── Status picker ─────────────────────────────────────────────── */}
      <BottomSheet visible={statusSheet} onClose={() => setStatusSheet(false)} title="Set order status">
        <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 14 }}>
          Admin status changes skip the restaurant's normal order flow. Cancelling returns the free
          order to the restaurant's quota.
        </Text>
        <View style={styles.statusGrid}>
          {ORDER_STATUSES.map((option) => (
            <Button
              key={option}
              label={ORDER_STATUS_LABEL[option]}
              size="sm"
              variant={option === current.status ? "primary" : "secondary"}
              disabled={option === current.status || busy}
              onPress={() =>
                option === "REJECTED"
                  ? setConfirm({
                      title: "Cancel this order?",
                      body: "The customer's order is rejected and the free-order slot, if one was used, is returned to the restaurant.",
                      run: () => changeStatus(option),
                    })
                  : void changeStatus(option)
              }
            />
          ))}
        </View>
      </BottomSheet>

      <Modal visible={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm?.title}>
        <Text style={{ color: theme.colors.textMuted, lineHeight: 20 }}>{confirm?.body}</Text>
        <View style={styles.modalActions}>
          <Button label="Cancel" variant="secondary" onPress={() => setConfirm(null)} />
          <Button label="Confirm" variant="danger" loading={busy} onPress={() => void confirm?.run()} />
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  notice: { padding: 13, marginTop: 14 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  timeline: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  timelineDot: { width: 9, height: 9, borderRadius: 5 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
});
