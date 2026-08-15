import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Badge,
  BottomSheet,
  Button,
  DetailRow,
  EmptyState,
  ErrorState,
  FilterChips,
  Input,
  Loading,
  Screen,
} from "@/components";
import { adminApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useDebounced } from "@/hooks/useDebounced";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDate } from "@/utils/format";
import { TIFFIN_TONE, refName, titleCase } from "@/utils/admin";
import { TIFFIN_STATUSES } from "@/types/admin";
import type { AdminTiffinProvider, AdminTiffinSubscription } from "@/types/admin";
import type { AdminStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<AdminStackParamList>;
type Tab = "providers" | "subscribers";

const SUBSCRIBER_FILTERS = [
  { label: "All", value: "all" },
  ...TIFFIN_STATUSES.map((status) => ({ label: titleCase(status), value: status })),
];

/**
 * Tiffin oversight.
 *
 * Two views over the same service: the restaurants offering it, and the
 * customers subscribed. Menu and pricing stay a vendor responsibility — the
 * admin side only switches a provider on or off and moves a subscription
 * between the states the server's enum allows.
 */
export const AdminTiffinScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const navigation = useNavigation<Nav>();

  const [tab, setTab] = useState<Tab>("providers");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<AdminTiffinSubscription | null>(null);
  const [busy, setBusy] = useState(false);

  const search = useDebounced(query, 300).trim();

  const providers = useApi(
    () => adminApi.tiffinProviders({ search: search || undefined }),
    [search, tab],
    { immediate: true }
  );

  const subscribers = useApi(
    () =>
      adminApi.tiffinSubscriptions({
        search: search || undefined,
        status: status === "all" ? undefined : status,
      }),
    [search, status, tab]
  );

  const active = tab === "providers" ? providers : subscribers;

  const toggleProvider = useCallback(
    async (provider: AdminTiffinProvider, next: boolean) => {
      setBusy(true);
      try {
        await adminApi.updateTiffinProvider(provider._id, { tiffinAvailable: next });
        toast.success(next ? "Tiffin enabled" : "Tiffin disabled");
        await providers.refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update provider");
      } finally {
        setBusy(false);
      }
    },
    [providers, toast]
  );

  const changeSubscriberStatus = useCallback(
    async (subscription: AdminTiffinSubscription, next: string) => {
      setBusy(true);
      try {
        const updated = await adminApi.updateTiffinSubscriptionStatus(subscription._id, next);
        setSelected(updated);
        toast.success(`Marked ${titleCase(next).toLowerCase()}`);
        await subscribers.refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update subscription");
      } finally {
        setBusy(false);
      }
    },
    [subscribers, toast]
  );

  if (active.loading && !active.data) return <Loading label="Loading tiffin…" />;
  if (active.error && !active.data) {
    return <ErrorState title="Couldn't load" message={active.error} onAction={active.refetch} />;
  }

  return (
    <Screen padded={false} edges={["bottom"]}>
      <View style={styles.tabs}>
        {(["providers", "subscribers"] as Tab[]).map((option) => {
          const on = tab === option;
          return (
            <Pressable
              key={option}
              onPress={() => setTab(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[
                styles.tab,
                {
                  backgroundColor: on ? theme.colors.primary : theme.colors.card,
                  borderColor: on ? theme.colors.primary : theme.colors.border,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 13,
                  color: on ? theme.colors.onPrimary : theme.colors.textMuted,
                }}
              >
                {option === "providers" ? "Providers" : "Subscribers"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={tab === "providers" ? "Search restaurants" : "Search customers or plans"}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {tab === "subscribers" ? (
        <FilterChips options={SUBSCRIBER_FILTERS} value={status} onChange={setStatus} />
      ) : null}

      {tab === "providers" ? (
        <FlatList
          data={providers.data ?? []}
          keyExtractor={(item) => item._id}
          initialNumToRender={10}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={providers.data?.length ? styles.list : styles.empty}
          refreshControl={
            <RefreshControl
              refreshing={providers.loading}
              onRefresh={providers.refetch}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate("AdminRestaurantDetail", {
                  restaurantId: item._id,
                  name: item.name,
                })
              }
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? theme.colors.surface : theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.lg,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700", fontSize: 15 }}>
                  {item.name}
                </Text>
                <Text numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {item.tiffinAvailable
                    ? `${formatCurrency(item.tiffinPrice ?? 0)} · ${titleCase(item.tiffinMealType)} · ${titleCase(item.tiffinDuration)}`
                    : "Tiffin not offered"}
                </Text>
                <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 3 }}>
                  {item.activeSubscriptions} active subscriber
                  {item.activeSubscriptions === 1 ? "" : "s"}
                </Text>
              </View>
              <Switch
                value={Boolean(item.tiffinAvailable)}
                disabled={busy}
                onValueChange={(next) => void toggleProvider(item, next)}
                trackColor={{ true: theme.colors.success, false: theme.colors.border }}
                thumbColor="#fff"
              />
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState title="No restaurants" message="Nothing matches this search." />
          }
        />
      ) : (
        <FlatList
          data={subscribers.data ?? []}
          keyExtractor={(item) => item._id}
          initialNumToRender={12}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={subscribers.data?.length ? styles.list : styles.empty}
          refreshControl={
            <RefreshControl
              refreshing={subscribers.loading}
              onRefresh={subscribers.refetch}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelected(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? theme.colors.surface : theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.lg,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700", fontSize: 15 }}>
                  {refName(item.customer, "Customer")}
                </Text>
                <Text numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {item.planName} · {refName(item.restaurant, "Restaurant")}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 5 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                  {formatCurrency(item.price)}
                </Text>
                <Badge label={titleCase(item.status)} tone={TIFFIN_TONE[item.status] ?? "neutral"} />
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No subscriptions"
              message={
                search || status !== "all"
                  ? "Nothing matches this search or filter."
                  : "No customer has subscribed to a tiffin plan yet."
              }
            />
          }
        />
      )}

      {/* ── Subscription sheet ────────────────────────────────────────── */}
      <BottomSheet
        visible={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? refName(selected.customer, "Subscription") : undefined}
      >
        {selected ? (
          <>
            <DetailRow label="Plan" value={selected.planName} />
            <DetailRow label="Restaurant" value={refName(selected.restaurant)} />
            <DetailRow label="Price" value={formatCurrency(selected.price)} />
            <DetailRow label="Meal" value={titleCase(selected.mealType)} />
            <DetailRow label="Started" value={formatDate(selected.startDate)} />
            <DetailRow label="Ends" value={formatDate(selected.endDate)} />
            <DetailRow label="Next delivery" value={formatDate(selected.nextDelivery)} />
            <DetailRow label="State" value={titleCase(selected.status)} />

            <Text style={[styles.sheetLabel, { color: theme.colors.textMuted }]}>CHANGE STATE</Text>
            <View style={styles.actions}>
              {TIFFIN_STATUSES.map((option) => (
                <Button
                  key={option}
                  label={titleCase(option)}
                  size="sm"
                  variant={selected.status === option ? "primary" : "secondary"}
                  disabled={selected.status === option || busy}
                  onPress={() => void changeSubscriberStatus(selected, option)}
                />
              ))}
            </View>
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderWidth: 1 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  list: { padding: 16, gap: 12 },
  empty: { flexGrow: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, padding: 14 },
  sheetLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
});
