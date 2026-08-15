import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterChips,
  Input,
  Loading,
  MeterRow,
  Screen,
} from "@/components";
import { adminApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useDebounced } from "@/hooks/useDebounced";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency, formatDate } from "@/utils/format";
import { PLAN_STATUS_TONE, refName, titleCase } from "@/utils/admin";
import type { SubscriptionRow } from "@/types/admin";
import type { AdminStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Paused", value: "PAUSED" },
  { label: "Past due", value: "PAST_DUE" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Cancelled", value: "CANCELLED" },
];

/**
 * Who is on which plan.
 *
 * The plan summary at the top and the per-restaurant rows come from the same
 * response, so the counts always agree with the rows beneath them.
 */
export const AdminSubscriptionsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");

  const search = useDebounced(query, 300).trim();

  const { data, loading, error, refetch } = useApi(
    () =>
      adminApi.subscriptions({
        search: search || undefined,
        status: status === "all" ? undefined : status,
        plan: plan === "all" ? undefined : plan,
      }),
    [search, status, plan]
  );

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const summary = data?.summary ?? [];
  const rows = data?.rows ?? [];

  const planFilters = useMemo(
    () => [
      { label: "All plans", value: "all" },
      ...summary.map((row) => ({ label: row.name, value: row.key, badge: row.count })),
    ],
    [summary]
  );

  const totalOnPlans = useMemo(
    () => summary.reduce((sum, row) => sum + row.count, 0),
    [summary]
  );

  const renderItem = useCallback(
    ({ item }: { item: SubscriptionRow }) => (
      <SubscriptionCard
        item={item}
        onPress={() =>
          navigation.navigate("AdminRestaurantDetail", {
            restaurantId: item.restaurant._id,
            name: item.restaurant.name,
          })
        }
      />
    ),
    [navigation]
  );

  if (loading && !data) return <Loading label="Loading subscriptions…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.restaurant._id}
        renderItem={renderItem}
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={rows.length ? styles.list : styles.empty}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Button
              label="Manage plans"
              variant="secondary"
              fullWidth
              onPress={() => navigation.navigate("AdminPlans")}
            />

            {summary.length ? (
              <Card style={{ marginTop: 14 }}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                  Restaurants per plan
                </Text>
                {summary.map((row) => (
                  <MeterRow
                    key={row._id}
                    label={row.name}
                    value={row.count}
                    total={Math.max(1, totalOnPlans)}
                    caption={`${row.count} · ${formatCurrency(row.monthlyFee)} · ${row.commissionPercent}%`}
                  />
                ))}
              </Card>
            ) : null}

            <View style={{ marginTop: 14 }}>
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder="Search restaurant or category"
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No restaurants"
            message="Nothing matches this search or filter."
          />
        }
      />

      {/* Filters sit outside the list so they stay reachable while scrolling. */}
      <View style={[styles.filterBar, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <FilterChips options={planFilters} value={plan} onChange={setPlan} />
        <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
      </View>
    </Screen>
  );
};

const SubscriptionCard = React.memo<{ item: SubscriptionRow; onPress: () => void }>(
  ({ item, onPress }) => {
    const { theme } = useTheme();
    const { restaurant } = item;
    const quota = item.subscription?.state?.quota;

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? theme.colors.surface : theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
          },
        ]}
      >
        <View style={styles.rowHead}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700", fontSize: 15 }}>
              {restaurant.name}
            </Text>
            <Text numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
              {refName(restaurant.vendor, "No owner")}
            </Text>
          </View>
          <Badge
            label={titleCase(restaurant.planStatus ?? "None")}
            tone={restaurant.planStatus ? PLAN_STATUS_TONE[restaurant.planStatus] : "neutral"}
          />
        </View>

        <View style={[styles.planLine, { borderTopColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
            {item.subscription?.current?.name ?? restaurant.subscriptionPlanName ?? "No plan"}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            {item.subscription?.current?.commissionRate != null
              ? `${item.subscription.current.commissionRate}% commission`
              : ""}
          </Text>
        </View>

        {quota && quota.total > 0 ? (
          <View style={{ marginTop: 10 }}>
            <MeterRow
              label="Free orders"
              value={quota.used}
              total={quota.total}
              caption={`${quota.used}/${quota.total}`}
              tone={quota.percent >= 80 ? theme.colors.warning : undefined}
            />
          </View>
        ) : null}

        {restaurant.planRenewalDate ? (
          <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 4 }}>
            Renews {formatDate(restaurant.planRenewalDate)}
          </Text>
        ) : null}
      </Pressable>
    );
  }
);
SubscriptionCard.displayName = "SubscriptionCard";

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  empty: { flexGrow: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 14 },
  row: { borderWidth: 1, padding: 14 },
  rowHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  planLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
    gap: 10,
  },
  filterBar: { borderTopWidth: StyleSheet.hairlineWidth },
});
