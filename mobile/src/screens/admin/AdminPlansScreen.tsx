import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Loading,
  Modal,
  Screen,
} from "@/components";
import { adminApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/utils/format";
import type { AdminPlan } from "@/types/admin";

interface PlanForm {
  name: string;
  price: string;
  freeOrderQuota: string;
  commissionRate: string;
  billingCycleDays: string;
  description: string;
  features: string;
}

const emptyForm: PlanForm = {
  name: "",
  price: "0",
  freeOrderQuota: "0",
  commissionRate: "0",
  billingCycleDays: "30",
  description: "",
  features: "",
};

const toForm = (plan: AdminPlan): PlanForm => ({
  name: plan.name,
  price: String(plan.price),
  freeOrderQuota: String(plan.freeOrderQuota),
  commissionRate: String(plan.commissionRate),
  billingCycleDays: String(plan.billingCycleDays ?? 30),
  description: plan.description ?? "",
  features: (plan.features ?? []).join("\n"),
});

/**
 * Subscription plan management.
 *
 * Prices, quotas and commission rates are only ever sent to the server for
 * validation — every rule about what a plan may contain (negative price,
 * commission above 100, deactivating the fallback plan) is enforced there and
 * the server's message is what the admin sees.
 */
export const AdminPlansScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();

  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; run: () => Promise<void> }>(null);

  const { data, loading, error, refetch } = useApi(() => adminApi.plans(), []);

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (plan: AdminPlan) => {
    setForm(toForm(plan));
    setEditing(plan);
    setCreating(false);
  };

  const closeSheet = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = useCallback(async () => {
    const payload = {
      name: form.name.trim(),
      price: Number(form.price) || 0,
      freeOrderQuota: Number(form.freeOrderQuota) || 0,
      commissionRate: Number(form.commissionRate) || 0,
      billingCycleDays: Number(form.billingCycleDays) || 30,
      description: form.description.trim(),
      features: form.features
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };

    if (!payload.name) return toast.error("Give the plan a name");

    setBusy(true);
    try {
      if (editing) await adminApi.updatePlan(editing._id, payload);
      else await adminApi.createPlan(payload);

      toast.success(editing ? "Plan updated" : "Plan created");
      closeSheet();
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save plan");
    } finally {
      setBusy(false);
    }
  }, [editing, form, refetch, toast]);

  const toggle = useCallback(
    async (plan: AdminPlan, next: boolean) => {
      setBusy(true);
      try {
        const result = await adminApi.togglePlan(plan._id, next);
        toast.success(result.message ?? (next ? "Plan activated" : "Plan hidden"));
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not change plan status");
      } finally {
        setBusy(false);
      }
    },
    [refetch, toast]
  );

  const duplicate = useCallback(
    async (plan: AdminPlan) => {
      setBusy(true);
      try {
        await adminApi.duplicatePlan(plan._id);
        toast.success(`Copied ${plan.name}`);
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not duplicate plan");
      } finally {
        setBusy(false);
      }
    },
    [refetch, toast]
  );

  const remove = useCallback(
    async (plan: AdminPlan) => {
      setBusy(true);
      try {
        await adminApi.deletePlan(plan._id);
        toast.success("Plan removed");
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete plan");
      } finally {
        setBusy(false);
        setConfirm(null);
      }
    },
    [refetch, toast]
  );

  if (loading && !data) return <Loading label="Loading plans…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  const plans = data ?? [];

  return (
    <Screen padded={false} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
      >
        <Button label="Create a plan" fullWidth onPress={openCreate} />

        {!plans.length ? (
          <EmptyState
            title="No plans yet"
            message="Create a plan to set commission rates and free-order quotas."
            style={{ paddingVertical: 60 }}
          />
        ) : null}

        {plans.map((plan) => (
          <Card key={plan._id} style={{ marginTop: 14 }}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "800" }}>
                    {plan.name}
                  </Text>
                  {plan.badge ? <Badge label={plan.badge} tone="primary" /> : null}
                  {plan.isFallback ? <Badge label="Fallback" tone="info" /> : null}
                </View>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 3 }}>
                  {formatCurrency(plan.price)} every {plan.billingCycleDays} days
                </Text>
              </View>
              <Switch
                value={plan.isActive}
                disabled={busy}
                onValueChange={(next) => void toggle(plan, next)}
                trackColor={{ true: theme.colors.success, false: theme.colors.border }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.figures, { borderTopColor: theme.colors.border }]}>
              <Figure label="Commission" value={`${plan.commissionRate}%`} />
              <Figure label="Free orders" value={String(plan.freeOrderQuota)} />
              <Figure label="Restaurants" value={String(plan.restaurantCount ?? 0)} />
              <Figure label="Monthly" value={formatCurrency(plan.monthlyRevenue ?? 0)} />
            </View>

            {plan.description ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 12, lineHeight: 19 }}>
                {plan.description}
              </Text>
            ) : null}

            {plan.features?.length ? (
              <View style={{ marginTop: 10, gap: 4 }}>
                {plan.features.map((feature, index) => (
                  <Text key={index} style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                    · {feature}
                  </Text>
                ))}
              </View>
            ) : null}

            <View style={styles.actions}>
              <Button label="Edit" size="sm" variant="secondary" onPress={() => openEdit(plan)} />
              <Button
                label="Duplicate"
                size="sm"
                variant="secondary"
                disabled={busy}
                onPress={() => void duplicate(plan)}
              />
              <Button
                label="Delete"
                size="sm"
                variant="danger"
                disabled={busy || plan.isFallback}
                onPress={() =>
                  setConfirm({
                    title: `Delete ${plan.name}?`,
                    body: plan.restaurantCount
                      ? `${plan.restaurantCount} restaurant(s) are on this plan. The server will refuse if the plan is still in use — deactivate it instead to stop new signups.`
                      : "The plan is removed permanently.",
                    run: () => remove(plan),
                  })
                }
              />
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* ── Create / edit ─────────────────────────────────────────────── */}
      <BottomSheet
        visible={creating || Boolean(editing)}
        onClose={closeSheet}
        title={editing ? `Edit ${editing.name}` : "New plan"}
      >
        <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
          <Input
            label="Plan name"
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Growth"
          />
          <Input
            label="Monthly price (₹)"
            value={form.price}
            onChangeText={(v) => setForm((f) => ({ ...f, price: v.replace(/[^0-9]/g, "") }))}
            keyboardType="number-pad"
            containerStyle={{ marginTop: 14 }}
          />
          <Input
            label="Commission rate (%)"
            value={form.commissionRate}
            onChangeText={(v) => setForm((f) => ({ ...f, commissionRate: v.replace(/[^0-9.]/g, "") }))}
            keyboardType="decimal-pad"
            containerStyle={{ marginTop: 14 }}
          />
          <Input
            label="Free orders per cycle"
            value={form.freeOrderQuota}
            onChangeText={(v) => setForm((f) => ({ ...f, freeOrderQuota: v.replace(/[^0-9]/g, "") }))}
            keyboardType="number-pad"
            containerStyle={{ marginTop: 14 }}
          />
          <Input
            label="Billing cycle (days)"
            value={form.billingCycleDays}
            onChangeText={(v) => setForm((f) => ({ ...f, billingCycleDays: v.replace(/[^0-9]/g, "") }))}
            keyboardType="number-pad"
            containerStyle={{ marginTop: 14 }}
          />
          <Input
            label="Description"
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            multiline
            containerStyle={{ marginTop: 14 }}
          />
          <Input
            label="Features"
            hint="One per line"
            value={form.features}
            onChangeText={(v) => setForm((f) => ({ ...f, features: v }))}
            multiline
            containerStyle={{ marginTop: 14 }}
          />
        </ScrollView>

        <Button
          label={editing ? "Save changes" : "Create plan"}
          fullWidth
          size="lg"
          loading={busy}
          onPress={save}
          style={{ marginTop: 16 }}
        />
      </BottomSheet>

      <Modal visible={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm?.title}>
        <Text style={{ color: theme.colors.textMuted, lineHeight: 20 }}>{confirm?.body}</Text>
        <View style={styles.modalActions}>
          <Button label="Cancel" variant="secondary" onPress={() => setConfirm(null)} />
          <Button label="Delete" variant="danger" loading={busy} onPress={() => void confirm?.run()} />
        </View>
      </Modal>
    </Screen>
  );
};

const Figure: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 70 }}>
      <Text style={{ color: theme.colors.textFaint, fontSize: 10, fontWeight: "700" }}>
        {label.toUpperCase()}
      </Text>
      <Text numberOfLines={1} style={{ color: theme.colors.text, fontSize: 15, fontWeight: "700", marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  figures: { flexDirection: "row", flexWrap: "wrap", gap: 12, borderTopWidth: 1, marginTop: 14, paddingTop: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
});
