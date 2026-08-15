import React, { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, BottomSheet, Button, EmptyState, ErrorState, Input, Loading, Screen } from "@/components";
import { vendorApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDate } from "@/utils/format";

type Tab = "overview" | "payouts" | "transactions";

/**
 * Vendor finance.
 *
 * Balance, earnings and the payout threshold all come from /vendor/wallet —
 * the device never computes a monetary figure, it only formats what the server
 * sends.
 */
export const VendorFinanceScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [requesting, setRequesting] = useState(false);

  const { data, loading, error, isNetworkError, refetch } = useApi(
    () => vendorApi.wallet(),
    []
  );

  const requestPayout = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a valid amount");
    if (data && value > data.balance) return toast.error("Amount exceeds your balance");
    if (data && value < data.minPayoutAmount)
      return toast.error(`Minimum payout is ${formatCurrency(data.minPayoutAmount)}`);

    setRequesting(true);
    try {
      await vendorApi.requestPayout(value);
      toast.success("Payout requested");
      setPayoutOpen(false);
      setAmount("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not request payout");
    } finally {
      setRequesting(false);
    }
  };

  if (loading && !data) return <Loading label="Loading finance…" />;

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

  const history = data?.history ?? [];
  const payouts = history.filter((row) => (row.type ?? "").toUpperCase().includes("PAYOUT"));
  const rows = tab === "payouts" ? payouts : history;

  const stat = (label: string, value: string, tint?: string) => (
    <View
      key={label}
      style={[
        styles.stat,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.lg },
      ]}
    >
      <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: "700" }}>
        {label.toUpperCase()}
      </Text>
      <Text
        style={{ color: tint ?? theme.colors.text, fontSize: 20, fontWeight: "800", marginTop: 6 }}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <Screen padded={false} edges={["bottom"]}>
      <View style={styles.tabs}>
        {(["overview", "payouts", "transactions"] as Tab[]).map((option) => {
          const active = tab === option;
          return (
            <Pressable
              key={option}
              onPress={() => setTab(option)}
              style={[
                styles.tab,
                { borderBottomColor: active ? theme.colors.primary : "transparent" },
              ]}
            >
              <Text
                style={{
                  color: active ? theme.colors.text : theme.colors.textMuted,
                  fontWeight: active ? "800" : "600",
                  fontSize: 14,
                  textTransform: "capitalize",
                }}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
      >
        {tab === "overview" ? (
          <>
            <View
              style={[
                styles.balanceCard,
                {
                  backgroundColor: theme.colors.primarySoft,
                  borderColor: theme.colors.primary,
                  borderRadius: theme.radius.xl,
                },
              ]}
            >
              <Text style={{ color: theme.colors.primaryText, fontSize: 12, fontWeight: "800" }}>
                AVAILABLE BALANCE
              </Text>
              <Text style={{ color: theme.colors.text, fontSize: 34, fontWeight: "800", marginTop: 6 }}>
                {formatCurrency(data?.balance ?? 0)}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 6 }}>
                Minimum payout {formatCurrency(data?.minPayoutAmount ?? 0)} · held{" "}
                {data?.payoutHoldHours ?? 0}h
              </Text>
              <Button
                label="Request payout"
                fullWidth
                onPress={() => setPayoutOpen(true)}
                disabled={(data?.balance ?? 0) < (data?.minPayoutAmount ?? 0)}
                style={{ marginTop: 16 }}
              />
            </View>

            <View style={styles.statRow}>
              {stat("Total earnings", formatCurrency(data?.totalEarnings ?? 0), theme.colors.success)}
              {stat("Pending", formatCurrency(data?.pendingSettlement ?? 0), theme.colors.warning)}
            </View>
          </>
        ) : null}

        {tab !== "overview" || history.length > 0 ? (
          <View style={{ marginTop: tab === "overview" ? 20 : 0 }}>
            {tab === "overview" ? (
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Recent activity
              </Text>
            ) : null}

            {(tab === "overview" ? history.slice(0, 6) : rows).length === 0 ? (
              <EmptyState
                title={tab === "payouts" ? "No payouts yet" : "No transactions"}
                message={
                  tab === "payouts"
                    ? "Your payout requests will appear here."
                    : "Earnings and settlements will show up here."
                }
              />
            ) : (
              (tab === "overview" ? history.slice(0, 6) : rows).map((row, index) => (
                <View
                  key={row._id ?? `${row.createdAt}-${index}`}
                  style={[
                    styles.txn,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                      {row.type ?? "Transaction"}
                    </Text>
                    <Text style={{ color: theme.colors.textFaint, fontSize: 12, marginTop: 2 }}>
                      {row.createdAt ? formatDate(row.createdAt) : ""}
                      {row.note ? ` · ${row.note}` : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                      {formatCurrency(row.amount ?? 0)}
                    </Text>
                    {row.status ? (
                      <Badge
                        label={row.status}
                        tone={
                          row.status === "PAID"
                            ? "success"
                            : row.status === "REJECTED"
                            ? "error"
                            : "warning"
                        }
                      />
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <EmptyState title="Nothing yet" message="Activity will appear once you start earning." />
        )}
      </ScrollView>

      <BottomSheet visible={payoutOpen} onClose={() => setPayoutOpen(false)} title="Request payout">
        <Text style={{ color: theme.colors.textMuted, marginBottom: 14 }}>
          Available {formatCurrency(data?.balance ?? 0)} · minimum{" "}
          {formatCurrency(data?.minPayoutAmount ?? 0)}
        </Text>
        <Input
          label="Amount"
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
          placeholder="0"
        />
        <Button
          label="Request"
          fullWidth
          size="lg"
          loading={requesting}
          onPress={requestPayout}
          style={{ marginTop: 18 }}
        />
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", paddingHorizontal: 16 },
  tab: { paddingVertical: 13, marginRight: 22, borderBottomWidth: 2 },
  content: { padding: 16, paddingBottom: 32 },
  balanceCard: { borderWidth: 1.5, padding: 20 },
  statRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  stat: { flex: 1, borderWidth: 1, padding: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  txn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
});
