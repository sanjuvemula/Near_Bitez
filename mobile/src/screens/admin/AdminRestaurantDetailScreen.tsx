import React, { useCallback, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  DetailRow,
  ErrorState,
  Input,
  Loading,
  MeterRow,
  Modal,
  Screen,
  Section,
  StatGrid,
  StatTile,
} from "@/components";
import { adminApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDate } from "@/utils/format";
import { PLAN_STATUS_TONE, refName, titleCase } from "@/utils/admin";
import type { AdminPlan, AdminSubscriptionState, SubscriptionAction } from "@/types/admin";
import type { AdminStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<AdminStackParamList>;
type Route = RouteProp<AdminStackParamList, "AdminRestaurantDetail">;

/** Which action sheet is open. */
type Sheet = "plan" | "extend" | "quota" | "commission" | null;

/**
 * Everything the platform knows about one restaurant, plus the subscription
 * controls.
 *
 * Every mutation returns the recomputed subscription state from the server and
 * that response replaces local state — the app never predicts what a quota or
 * commission change will produce.
 */
export const AdminRestaurantDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { restaurantId } = params;

  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; run: () => Promise<void> }>(null);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<AdminSubscriptionState | null>(null);

  const [days, setDays] = useState("30");
  const [quota, setQuota] = useState("10");
  const [rate, setRate] = useState("");

  const { data, loading, error, refetch } = useApi(
    () => adminApi.subscriptionDetail(restaurantId),
    [restaurantId]
  );

  const { data: plans } = useApi(() => adminApi.plans(), []);

  const restaurant = data?.restaurant;
  const live = state ?? data?.state ?? null;

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: params.name ?? restaurant?.name ?? "Restaurant" });
  }, [navigation, params.name, restaurant?.name]);

  /** Wraps a mutation with the busy flag, toast and state replacement. */
  const run = useCallback(
    async (action: () => Promise<AdminSubscriptionState>, success: string) => {
      setBusy(true);
      try {
        const next = await action();
        setState(next);
        setSheet(null);
        setConfirm(null);
        toast.success(success);
        // Pull the surrounding detail again so history and audit stay in sync.
        void refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [refetch, toast]
  );

  const toggleOpen = useCallback(async () => {
    setBusy(true);
    try {
      await adminApi.toggleRestaurant(restaurantId);
      toast.success(restaurant?.isActive ? "Restaurant closed" : "Restaurant opened");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change status");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }, [refetch, restaurant?.isActive, restaurantId, toast]);

  if (loading && !data) return <Loading label="Loading restaurant…" />;
  if (error && !data) {
    return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;
  }
  if (!restaurant) return <ErrorState title="Not found" onAction={refetch} />;

  const planOptions: AdminPlan[] = plans ?? [];
  const q = live?.quota;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
      >
        {/* ── Identity ────────────────────────────────────────────────── */}
        {restaurant.imageUrl ? (
          <Image
            source={{ uri: restaurant.imageUrl }}
            style={[styles.hero, { borderRadius: theme.radius.lg }]}
          />
        ) : null}

        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "800" }}>
              {restaurant.name}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 3 }}>
              {titleCase(restaurant.category)} · {restaurant.address}
            </Text>
          </View>
          <Badge
            label={restaurant.isActive ? "Open" : "Closed"}
            tone={restaurant.isActive ? "success" : "error"}
          />
        </View>

        <Button
          label={restaurant.isActive ? "Close this restaurant" : "Open this restaurant"}
          variant={restaurant.isActive ? "secondary" : "primary"}
          fullWidth
          loading={busy}
          onPress={() =>
            setConfirm({
              title: restaurant.isActive ? "Close restaurant?" : "Open restaurant?",
              body: restaurant.isActive
                ? "Customers will not be able to place new orders from this restaurant."
                : "This restaurant will start appearing to customers again.",
              run: toggleOpen,
            })
          }
          style={{ marginTop: 14 }}
        />

        {/* ── Activity ────────────────────────────────────────────────── */}
        <Section title="Activity">
          <StatGrid>
            <StatTile label="Total orders" value={restaurant.orderCount} />
            <StatTile
              label="Order value"
              value={formatCurrency(restaurant.totalRevenue)}
              tone="success"
            />
            <StatTile
              label="Menu live"
              value={`${restaurant.activeMenuCount}/${restaurant.menuCount}`}
              onPress={() =>
                navigation.navigate("AdminMenu", {
                  restaurantId,
                  name: restaurant.name,
                })
              }
            />
            <StatTile
              label="Tiffin subscribers"
              value={restaurant.activeTiffinSubscriptions}
              caption={restaurant.tiffinAvailable ? "Tiffin on" : "Tiffin off"}
            />
          </StatGrid>
        </Section>

        {/* ── Subscription ────────────────────────────────────────────── */}
        <Section title="Subscription">
          <Card>
            <View style={styles.planHead}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "800" }}>
                  {live?.plan?.name ?? "No plan"}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 2 }}>
                  {live?.plan
                    ? `${formatCurrency(live.plan.price)} / ${live.plan.billingCycleDays ?? 30} days`
                    : "Not subscribed"}
                </Text>
              </View>
              <Badge
                label={titleCase(live?.subscription?.status ?? "None")}
                tone={
                  live?.subscription?.status
                    ? (PLAN_STATUS_TONE[
                        live.subscription.status as keyof typeof PLAN_STATUS_TONE
                      ] ?? "neutral")
                    : "neutral"
                }
              />
            </View>

            <View style={{ marginTop: 14 }}>
              <DetailRow
                label="Commission"
                value={`${live?.plan?.commissionRate ?? 0}%`}
                tone={
                  live?.subscription?.commissionRateOverride != null
                    ? theme.colors.warning
                    : undefined
                }
              />
              {live?.subscription?.commissionRateOverride != null ? (
                <DetailRow
                  label="Override applied"
                  value={`${live.subscription.commissionRateOverride}% (plan is ${live.plan?.planCommissionRate ?? live.plan?.commissionRate}%)`}
                />
              ) : null}
              <DetailRow label="Started" value={formatDate(live?.subscription?.startDate)} />
              <DetailRow
                label="Renews / ends"
                value={
                  live?.subscription?.endDate
                    ? formatDate(live.subscription.endDate)
                    : "No end date"
                }
              />
              <DetailRow label="Payment" value={titleCase(live?.subscription?.paymentStatus)} />
              <DetailRow label="Assigned by" value={titleCase(live?.subscription?.source)} />
              {live?.cycle?.end ? (
                <DetailRow
                  label="Current cycle ends"
                  value={`${formatDate(live.cycle.end)} · ${live.cycle.daysRemaining} days left`}
                />
              ) : null}
            </View>

            {q && q.total > 0 ? (
              <View style={{ marginTop: 16 }}>
                <MeterRow
                  label="Free orders used"
                  value={q.used}
                  total={q.total}
                  caption={`${q.used} / ${q.total}`}
                  tone={q.percent >= 80 ? theme.colors.warning : undefined}
                />
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {q.remaining} remaining
                  {q.bonus > 0 ? ` · includes ${q.bonus} bonus` : ""}
                </Text>
              </View>
            ) : (
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 14 }}>
                This plan includes no free orders.
              </Text>
            )}

            {live?.expiry?.expiringSoon ? (
              <View
                style={[
                  styles.notice,
                  { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.md },
                ]}
              >
                <Text style={{ color: theme.colors.warning, fontSize: 13, fontWeight: "600" }}>
                  Expires in {live.expiry.daysUntilExpiry} days
                </Text>
              </View>
            ) : null}
          </Card>

          <View style={styles.actions}>
            <Button label="Change plan" size="sm" variant="secondary" onPress={() => setSheet("plan")} />
            <Button label="Extend" size="sm" variant="secondary" onPress={() => setSheet("extend")} />
            <Button label="Bonus quota" size="sm" variant="secondary" onPress={() => setSheet("quota")} />
            <Button
              label="Commission"
              size="sm"
              variant="secondary"
              onPress={() => {
                setRate(String(live?.plan?.commissionRate ?? ""));
                setSheet("commission");
              }}
            />
          </View>

          <View style={styles.actions}>
            {(["ACTIVE", "PAUSED", "CANCELLED"] as SubscriptionAction[]).map((option) => {
              const current = live?.subscription?.status === option;
              return (
                <Button
                  key={option}
                  label={titleCase(option)}
                  size="sm"
                  variant={current ? "primary" : "secondary"}
                  disabled={current || busy}
                  onPress={() =>
                    setConfirm({
                      title: `Set subscription to ${titleCase(option)}?`,
                      body:
                        option === "CANCELLED"
                          ? "The restaurant moves to the fallback plan terms at the end of this cycle."
                          : option === "PAUSED"
                            ? "Billing pauses. Commission still applies to orders."
                            : "The subscription resumes on its existing terms.",
                      run: () =>
                        run(
                          () => adminApi.setSubscriptionStatus(restaurantId, option),
                          `Subscription set to ${titleCase(option)}`
                        ),
                    })
                  }
                />
              );
            })}
            {q && q.used > 0 ? (
              <Button
                label="Reset quota"
                size="sm"
                variant="secondary"
                onPress={() =>
                  setConfirm({
                    title: "Reset free-order usage?",
                    body: `Usage goes back to 0 of ${q.total} for the current cycle. This cannot be undone.`,
                    run: () =>
                      run(() => adminApi.resetQuota(restaurantId), "Free-order usage reset"),
                  })
                }
              />
            ) : null}
          </View>
        </Section>

        {/* ── Owner ───────────────────────────────────────────────────── */}
        <Section title="Owner">
          <Card>
            <DetailRow label="Name" value={refName(restaurant.vendor)} />
            <DetailRow
              label="Email"
              value={typeof restaurant.vendor === "object" ? restaurant.vendor?.email : undefined}
            />
            <DetailRow
              label="Phone"
              value={typeof restaurant.vendor === "object" ? restaurant.vendor?.phone : undefined}
            />
          </Card>
        </Section>

        {/* ── Delivery ────────────────────────────────────────────────── */}
        <Section title="Delivery">
          <Card>
            <DetailRow label="Handled by" value={restaurant.isSelfDelivery ? "Restaurant" : "Platform"} />
            <DetailRow label="Radius" value={`${restaurant.deliveryRadiusKm ?? "—"} km`} />
            <DetailRow label="Base fee" value={formatCurrency(restaurant.baseDeliveryFee ?? 0)} />
            <DetailRow
              label="Free delivery above"
              value={formatCurrency(restaurant.freeDeliveryAbove ?? 0)}
            />
            <DetailRow label="Prep time" value={`${restaurant.deliveryTime ?? "—"} min`} />
          </Card>
        </Section>

        {/* ── Tiffin ──────────────────────────────────────────────────── */}
        {restaurant.tiffinAvailable ? (
          <Section title="Tiffin service">
            <Card>
              <DetailRow label="Price" value={formatCurrency(restaurant.tiffinPrice ?? 0)} />
              <DetailRow label="Meal type" value={titleCase(restaurant.tiffinMealType)} />
              <DetailRow label="Duration" value={titleCase(restaurant.tiffinDuration)} />
              <DetailRow label="Meals per day" value={restaurant.tiffinMealsPerDay} />
              <DetailRow label="Delivery" value={titleCase(restaurant.tiffinDeliveryType)} />
              <DetailRow label="Active subscribers" value={restaurant.activeTiffinSubscriptions} />
            </Card>
          </Section>
        ) : null}

        {/* ── History ─────────────────────────────────────────────────── */}
        {data?.history?.length ? (
          <Section title="Plan history">
            <Card padded={false}>
              {data.history.slice(0, 8).map((row, index) => (
                <View
                  key={row._id}
                  style={[
                    styles.history,
                    {
                      borderBottomWidth:
                        index === Math.min(7, data.history.length - 1) ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 14 }}>
                      {row.planName || "Plan"} · {formatCurrency(row.price)}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {formatDate(row.startDate)} · {row.commissionRate}% commission ·{" "}
                      {row.usedFreeOrders}/{row.freeOrderQuota + row.bonusFreeOrders} free used
                    </Text>
                    {row.assignedBy ? (
                      <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 2 }}>
                        By {row.assignedBy}
                      </Text>
                    ) : null}
                  </View>
                  <Badge label={titleCase(row.status)} tone={row.status === "ACTIVE" ? "success" : "neutral"} />
                </View>
              ))}
            </Card>
          </Section>
        ) : null}

        {/* ── Audit ───────────────────────────────────────────────────── */}
        {data?.audit?.length ? (
          <Section title="Admin activity">
            <Card padded={false}>
              {data.audit.slice(0, 10).map((entry, index) => (
                <View
                  key={entry._id}
                  style={[
                    styles.history,
                    {
                      borderBottomWidth:
                        index === Math.min(9, data.audit.length - 1) ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "600", fontSize: 14 }}>
                      {entry.description || titleCase(entry.action)}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {entry.admin} · {formatDate(entry.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </Section>
        ) : null}
      </ScrollView>

      {/* ── Change plan ───────────────────────────────────────────────── */}
      <BottomSheet visible={sheet === "plan"} onClose={() => setSheet(null)} title="Assign a plan">
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          {planOptions.map((plan) => {
            const current = live?.plan?._id === plan._id;
            return (
              <Pressable
                key={plan._id}
                disabled={current || busy}
                onPress={() =>
                  setConfirm({
                    title: `Move to ${plan.name}?`,
                    body: `Commission becomes ${plan.commissionRate}% and the plan includes ${plan.freeOrderQuota} free orders at ${formatCurrency(plan.price)} per cycle.`,
                    run: () =>
                      run(
                        () => adminApi.assignPlan(restaurantId, plan._id),
                        `Moved to ${plan.name}`
                      ),
                  })
                }
                style={({ pressed }) => [
                  styles.planOption,
                  {
                    borderColor: current ? theme.colors.primary : theme.colors.border,
                    backgroundColor: pressed ? theme.colors.surface : "transparent",
                    borderRadius: theme.radius.md,
                    opacity: plan.isActive ? 1 : 0.55,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                    {plan.name}
                    {current ? " · current" : ""}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    {formatCurrency(plan.price)} · {plan.commissionRate}% commission ·{" "}
                    {plan.freeOrderQuota} free orders
                  </Text>
                </View>
                {!plan.isActive ? <Badge label="Inactive" tone="neutral" /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>

      {/* ── Extend ────────────────────────────────────────────────────── */}
      <BottomSheet visible={sheet === "extend"} onClose={() => setSheet(null)} title="Extend subscription">
        <Input
          label="Days to add"
          value={days}
          onChangeText={(v) => setDays(v.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
        />
        <Button
          label={`Extend by ${days || 0} days`}
          fullWidth
          size="lg"
          loading={busy}
          disabled={!Number(days)}
          onPress={() =>
            run(
              () => adminApi.extendSubscription(restaurantId, Number(days)),
              `Extended by ${days} days`
            )
          }
          style={{ marginTop: 14 }}
        />
      </BottomSheet>

      {/* ── Bonus quota ───────────────────────────────────────────────── */}
      <BottomSheet visible={sheet === "quota"} onClose={() => setSheet(null)} title="Bonus free orders">
        <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 12 }}>
          Currently {q?.bonus ?? 0} bonus on top of the plan's {q?.base ?? 0}.
        </Text>
        <Input
          label="Amount"
          hint="Use a negative number to remove bonus orders"
          value={quota}
          onChangeText={(v) => setQuota(v.replace(/[^0-9-]/g, ""))}
          keyboardType="numbers-and-punctuation"
        />
        <Button
          label={Number(quota) < 0 ? `Remove ${Math.abs(Number(quota))}` : `Add ${quota || 0}`}
          fullWidth
          size="lg"
          loading={busy}
          disabled={!Number(quota)}
          onPress={() =>
            run(
              () => adminApi.adjustQuota(restaurantId, Number(quota)),
              "Bonus quota updated"
            )
          }
          style={{ marginTop: 14 }}
        />
      </BottomSheet>

      {/* ── Commission override ───────────────────────────────────────── */}
      <BottomSheet
        visible={sheet === "commission"}
        onClose={() => setSheet(null)}
        title="Override commission"
      >
        <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 12 }}>
          The plan rate is {live?.plan?.planCommissionRate ?? live?.plan?.commissionRate ?? 0}%. An
          override applies to this restaurant only and the server validates the value.
        </Text>
        <Input
          label="Commission %"
          value={rate}
          onChangeText={(v) => setRate(v.replace(/[^0-9.]/g, ""))}
          keyboardType="decimal-pad"
        />
        <Button
          label="Apply override"
          fullWidth
          size="lg"
          loading={busy}
          disabled={rate === ""}
          onPress={() =>
            setConfirm({
              title: `Set commission to ${rate}%?`,
              body: "This changes what the restaurant is charged on every future order.",
              run: () =>
                run(
                  () => adminApi.overrideCommission(restaurantId, Number(rate)),
                  "Commission updated"
                ),
            })
          }
          style={{ marginTop: 14 }}
        />
      </BottomSheet>

      {/* ── Confirmation ──────────────────────────────────────────────── */}
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

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  hero: { width: "100%", height: 150, marginBottom: 14 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  planHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  notice: { padding: 12, marginTop: 14 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  planOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  history: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
});
