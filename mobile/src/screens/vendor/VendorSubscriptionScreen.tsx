import React, { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Badge, Button, ErrorState, Loading, Modal, Screen } from "@/components";
import { vendorApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDate } from "@/utils/format";
import type { SubscriptionPlan } from "@/types/vendor";

/**
 * The restaurant's own NearBitez plan — kept separate from Tiffin, which is a
 * customer-facing service.
 *
 * All quota and commission figures come from /vendor/my-subscription; nothing
 * is derived on the device.
 */
export const VendorSubscriptionScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const [confirming, setConfirming] = useState<SubscriptionPlan | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const { data, loading, error, isNetworkError, refetch } = useApi(
    () => vendorApi.subscription(),
    []
  );

  const usage = data?.usage;
  const current = data?.current;
  const expiry = data?.state?.expiry;
  const status = data?.state?.subscription?.status;

  const total = usage?.freeOrdersTotal ?? 0;
  const used = usage?.freeOrdersUsed ?? 0;
  const remaining = Math.max(0, total - used);
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  // Bar animates from empty so the number reads as a measurement, not decoration.
  const progress = useSharedValue(0);
  React.useEffect(() => {
    progress.value = withTiming(percent, { duration: 650 });
  }, [percent, progress]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  const subscribe = async (plan: SubscriptionPlan) => {
    setSubscribing(true);
    try {
      await vendorApi.subscribe(plan._id);
      toast.success(`${plan.name} activated`);
      setConfirming(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change plan");
    } finally {
      setSubscribing(false);
    }
  };

  if (loading && !data) return <Loading label="Loading subscription…" />;

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

  const barColor =
    percent >= 100 ? theme.colors.error : percent >= 80 ? theme.colors.warning : theme.colors.success;

  const stat = (label: string, value: string) => (
    <View key={label} style={{ flex: 1 }}>
      <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: "700" }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "800", marginTop: 3 }}>
        {value}
      </Text>
    </View>
  );

  return (
    <Screen padded={false} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
      >
        <View
          style={[
            styles.hero,
            {
              backgroundColor: theme.colors.primarySoft,
              borderColor: theme.colors.primary,
              borderRadius: theme.radius.xl,
            },
          ]}
        >
          <View style={styles.heroHead}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.primaryText, fontSize: 12, fontWeight: "800" }}>
                CURRENT PLAN
              </Text>
              <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: "800", marginTop: 4 }}>
                {current?.name ?? "No plan"}
              </Text>
              <Text style={{ color: theme.colors.textMuted, marginTop: 2 }}>
                {current?.monthlyFee
                  ? `${formatCurrency(current.monthlyFee)} / month`
                  : "No monthly fee"}
                {current ? ` · ${current.commissionPercent}% after quota` : ""}
              </Text>
            </View>
            {status ? (
              <Badge
                label={expiry?.expired ? "Expired" : status}
                tone={expiry?.expired ? "error" : expiry?.expiringSoon ? "warning" : "success"}
              />
            ) : null}
          </View>

          {total > 0 ? (
            <View style={styles.quotaBlock}>
              <View style={styles.quotaLabels}>
                <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 15 }}>
                  {used} / {total} free orders used
                </Text>
                <Text style={{ color: barColor, fontWeight: "800" }}>{percent}%</Text>
              </View>

              <View style={[styles.bar, { backgroundColor: theme.colors.border }]}>
                <Animated.View
                  style={[styles.barFill, barStyle, { backgroundColor: barColor }]}
                />
              </View>

              <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 8 }}>
                {remaining > 0
                  ? `${remaining} orders left at 0% commission`
                  : `Quota used — ${current?.commissionPercent ?? 0}% commission now applies`}
              </Text>
            </View>
          ) : (
            <Text style={{ color: theme.colors.textMuted, marginTop: 14 }}>
              This plan has no free-order quota. {current?.commissionPercent ?? 0}% commission
              applies to every order.
            </Text>
          )}

          {data?.state?.subscription?.endDate ? (
            <Text style={{ color: theme.colors.textFaint, fontSize: 12, marginTop: 12 }}>
              Renews {formatDate(data.state.subscription.endDate)}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.lg },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>This cycle</Text>
          <View style={styles.statRow}>
            {stat("Orders", String(usage?.orderCount ?? 0))}
            {stat("Commission", formatCurrency(usage?.commissionCollected ?? 0))}
          </View>
          <View style={[styles.statRow, { marginTop: 16 }]}>
            {stat("Revenue", formatCurrency(usage?.grossOrderValue ?? 0))}
            {stat("Saved", formatCurrency(usage?.savedThisCycle ?? 0))}
          </View>
        </View>

        {current?.features?.length ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.lg },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Your benefits</Text>
            {current.features.map((feature) => (
              <View key={feature} style={styles.feature}>
                <Text style={{ color: theme.colors.success, fontWeight: "800" }}>✓</Text>
                <Text style={{ color: theme.colors.textMuted, flex: 1 }}>{feature}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {data?.options?.length ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Available plans
            </Text>
            {data.options.map((plan) => {
              const isCurrent = plan._id === current?._id;
              return (
                <View
                  key={plan._id}
                  style={[
                    styles.plan,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: isCurrent ? theme.colors.primary : theme.colors.border,
                      borderRadius: theme.radius.lg,
                    },
                  ]}
                >
                  <View style={styles.planHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "800" }}>
                        {plan.name}
                      </Text>
                      <Text style={{ color: theme.colors.textMuted, marginTop: 2 }}>
                        {plan.monthlyFee ? `${formatCurrency(plan.monthlyFee)}/mo` : "Free"} ·{" "}
                        {plan.freeOrderQuota} free orders · {plan.commissionPercent}% after
                      </Text>
                    </View>
                    {isCurrent ? <Badge label="Current" tone="primary" /> : null}
                    {!isCurrent && plan.badge ? <Badge label={plan.badge} tone="info" /> : null}
                  </View>

                  {plan.features?.length ? (
                    <View style={{ marginTop: 10, gap: 5 }}>
                      {plan.features.slice(0, 4).map((feature) => (
                        <Text key={feature} style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                          · {feature}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {!isCurrent ? (
                    <Button
                      label={
                        (plan.monthlyFee ?? 0) > (current?.monthlyFee ?? 0)
                          ? "Upgrade"
                          : "Switch to this plan"
                      }
                      fullWidth
                      onPress={() => setConfirming(plan)}
                      style={{ marginTop: 14 }}
                    />
                  ) : null}
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title={`Switch to ${confirming?.name ?? ""}?`}
      >
        <Text style={{ color: theme.colors.textMuted, lineHeight: 20 }}>
          {confirming?.monthlyFee
            ? `You'll be billed ${formatCurrency(confirming.monthlyFee)} per month. `
            : "This plan has no monthly fee. "}
          You get {confirming?.freeOrderQuota ?? 0} free orders, then{" "}
          {confirming?.commissionPercent ?? 0}% commission.
        </Text>
        <View style={styles.modalActions}>
          <Button label="Cancel" variant="secondary" onPress={() => setConfirming(null)} />
          <Button
            label="Confirm"
            loading={subscribing}
            onPress={() => confirming && void subscribe(confirming)}
          />
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  hero: { borderWidth: 1.5, padding: 18, marginBottom: 16 },
  heroHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  quotaBlock: { marginTop: 20 },
  quotaLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  bar: { height: 10, borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 5 },
  card: { borderWidth: 1, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 14 },
  statRow: { flexDirection: "row", gap: 16 },
  feature: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginTop: 6, marginBottom: 12 },
  plan: { borderWidth: 1.5, padding: 16, marginBottom: 12 },
  planHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
});
