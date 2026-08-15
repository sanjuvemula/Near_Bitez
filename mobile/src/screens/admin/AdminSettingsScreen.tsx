import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import {
  Button,
  Card,
  ErrorState,
  Input,
  Loading,
  Modal,
  Screen,
  Section,
} from "@/components";
import { adminApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import type { BusinessSettings } from "@/types/admin";

/**
 * Numeric settings and the range the server clamps each one to.
 *
 * Duplicated here only to keep the keyboard sensible and to warn before a
 * value is rejected — the server clamps regardless of what is sent, so these
 * bounds are a convenience, never the enforcement.
 */
const NUMBER_FIELDS: {
  key: keyof BusinessSettings;
  label: string;
  hint: string;
  decimal?: boolean;
}[] = [
  { key: "commissionPercent", label: "Default commission (%)", hint: "0–80" },
  { key: "platformFee", label: "Platform fee (₹)", hint: "0–500" },
  { key: "gstPercent", label: "GST (%)", hint: "0–28" },
  { key: "deliveryBaseFee", label: "Base delivery fee (₹)", hint: "0–1000" },
  { key: "freeDeliveryAbove", label: "Free delivery above (₹)", hint: "0–100000" },
  { key: "minPayoutAmount", label: "Minimum payout (₹)", hint: "0–100000" },
  { key: "payoutHoldHours", label: "Payout hold (hours)", hint: "0–720" },
  { key: "maxScheduleDays", label: "Scheduling window (days)", hint: "1–30" },
  { key: "referralBonusPoints", label: "Referral bonus points", hint: "0–100000" },
  {
    key: "loyaltyPointsPerRupee",
    label: "Loyalty points per ₹",
    hint: "0–10",
    decimal: true,
  },
];

type Draft = Record<string, string>;

/**
 * Platform business settings.
 *
 * These values feed order pricing and payouts for every restaurant, so each
 * save is explicit and maintenance mode — which takes the whole platform
 * offline for customers — asks for confirmation first.
 */
export const AdminSettingsScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();

  const { data, loading, error, refetch } = useApi(() => adminApi.settings(), []);

  const [draft, setDraft] = useState<Draft>({});
  const [toggles, setToggles] = useState({
    allowScheduledOrders: true,
    maintenanceMode: false,
    customerSupportEnabled: true,
  });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; run: () => Promise<void> }>(null);

  // Re-seed the form whenever a fresh document arrives, including after a reset.
  useEffect(() => {
    if (!data) return;
    const next: Draft = {};
    for (const field of NUMBER_FIELDS) next[field.key as string] = String(data[field.key] ?? 0);
    setDraft(next);
    setToggles({
      allowScheduledOrders: data.allowScheduledOrders,
      maintenanceMode: data.maintenanceMode,
      customerSupportEnabled: data.customerSupportEnabled,
    });
  }, [data]);

  const save = useCallback(
    async (overrides: Partial<BusinessSettings> = {}) => {
      setBusy(true);
      try {
        const payload: Record<string, unknown> = { ...toggles, ...overrides };
        for (const field of NUMBER_FIELDS) {
          payload[field.key as string] = Number(draft[field.key as string]) || 0;
        }

        await adminApi.updateSettings(payload as Partial<BusinessSettings>);
        toast.success("Settings saved");
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save settings");
      } finally {
        setBusy(false);
        setConfirm(null);
      }
    },
    [draft, refetch, toast, toggles]
  );

  const reset = useCallback(async () => {
    setBusy(true);
    try {
      await adminApi.resetSettings();
      toast.success("Settings restored to defaults");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset settings");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }, [refetch, toast]);

  if (loading && !data) return <Loading label="Loading settings…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
      >
        {toggles.maintenanceMode ? (
          <View
            style={[
              styles.banner,
              { backgroundColor: theme.colors.errorSoft, borderRadius: theme.radius.md },
            ]}
          >
            <Text style={{ color: theme.colors.error, fontWeight: "700" }}>
              Maintenance mode is on
            </Text>
            <Text style={{ color: theme.colors.error, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
              Customers cannot use the platform while this is enabled.
            </Text>
          </View>
        ) : null}

        <Section title="Platform switches" style={{ marginTop: 8 }}>
          <Card padded={false}>
            <ToggleRow
              label="Scheduled orders"
              caption="Let customers order for later"
              value={toggles.allowScheduledOrders}
              onChange={(next) => setToggles((t) => ({ ...t, allowScheduledOrders: next }))}
            />
            <ToggleRow
              label="Customer support chat"
              caption="Support threads reach admins"
              value={toggles.customerSupportEnabled}
              onChange={(next) => setToggles((t) => ({ ...t, customerSupportEnabled: next }))}
            />
            <ToggleRow
              label="Maintenance mode"
              caption="Takes the platform offline"
              value={toggles.maintenanceMode}
              danger
              last
              onChange={(next) =>
                next
                  ? setConfirm({
                      title: "Turn on maintenance mode?",
                      body: "Customers will not be able to browse or order until you turn it back off. Saving is immediate.",
                      run: () => {
                        setToggles((t) => ({ ...t, maintenanceMode: true }));
                        return save({ maintenanceMode: true });
                      },
                    })
                  : setToggles((t) => ({ ...t, maintenanceMode: false }))
              }
            />
          </Card>
        </Section>

        <Section title="Pricing and payouts">
          <Card>
            {NUMBER_FIELDS.map((field, index) => (
              <Input
                key={field.key as string}
                label={field.label}
                hint={field.hint}
                value={draft[field.key as string] ?? ""}
                onChangeText={(v) =>
                  setDraft((d) => ({
                    ...d,
                    [field.key as string]: field.decimal
                      ? v.replace(/[^0-9.]/g, "")
                      : v.replace(/[^0-9]/g, ""),
                  }))
                }
                keyboardType={field.decimal ? "decimal-pad" : "number-pad"}
                containerStyle={index === 0 ? undefined : { marginTop: 14 }}
              />
            ))}
            <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 14, lineHeight: 16 }}>
              These apply platform-wide. A restaurant on a subscription plan uses that plan's
              commission rate instead of the default above.
            </Text>
          </Card>
        </Section>

        <Section title="Rewards">
          <Card>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 }}>
              Daily login gives {data?.rewardRules.dailyLoginCoins ?? 0} coins, orders return{" "}
              {data?.rewardRules.orderCoinPercent ?? 0}% as coins, and a player can claim{" "}
              {data?.rewardRules.gameClaimDailyLimit ?? 0} game rewards a day.
            </Text>
            <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 10 }}>
              Reward rules are edited from the web dashboard.
            </Text>
          </Card>
        </Section>

        <Button
          label="Save settings"
          fullWidth
          size="lg"
          loading={busy}
          onPress={() =>
            setConfirm({
              title: "Save platform settings?",
              body: "These values affect what every customer is charged and what every restaurant is paid, starting with the next order.",
              run: () => save(),
            })
          }
          style={{ marginTop: 24 }}
        />

        <Button
          label="Restore defaults"
          variant="secondary"
          fullWidth
          onPress={() =>
            setConfirm({
              title: "Restore default settings?",
              body: "Every value on this screen goes back to the platform defaults. This cannot be undone.",
              run: reset,
            })
          }
          style={{ marginTop: 10 }}
        />
      </ScrollView>

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

const ToggleRow: React.FC<{
  label: string;
  caption: string;
  value: boolean;
  danger?: boolean;
  last?: boolean;
  onChange: (next: boolean) => void;
}> = ({ label, caption, value, danger, last, onChange }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.toggleRow,
        {
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: danger && value ? theme.colors.error : theme.colors.text,
            fontWeight: "600",
            fontSize: 15,
          }}
        >
          {label}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>{caption}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          true: danger ? theme.colors.error : theme.colors.success,
          false: theme.colors.border,
        }}
        thumbColor="#fff"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  banner: { padding: 14 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
});
