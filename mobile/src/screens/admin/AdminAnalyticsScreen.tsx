import React, { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Badge,
  Card,
  ErrorState,
  Loading,
  MeterRow,
  Screen,
  Section,
  StatGrid,
  StatTile,
  TrendBars,
} from "@/components";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency, formatDate } from "@/utils/format";
import { dayLabel, titleCase } from "@/utils/admin";
import type { AdminStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

/**
 * Platform analytics.
 *
 * Orders and revenue share one chart with a toggle rather than two y-axes —
 * two scales on one plot make the relationship look real when it isn't.
 * Everything below is a labelled magnitude bar, which stays readable at phone
 * width where a pie or a multi-series line would not.
 */
export const AdminAnalyticsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const { stats, analytics, loading, refreshing, error, refresh } = useAdmin();

  const daily = stats?.analytics.daily ?? [];

  const weekTotals = useMemo(
    () =>
      daily.reduce(
        (acc, row) => ({ orders: acc.orders + row.orders, revenue: acc.revenue + row.revenue }),
        { orders: 0, revenue: 0 }
      ),
    [daily]
  );

  const statusRows = useMemo(
    () => (stats?.analytics.orderStatuses ?? []).filter((row) => row.count > 0),
    [stats]
  );

  const totalOrders = stats?.orders.total ?? 0;
  const delivered = stats?.orders.delivered ?? 0;
  const cancelled = useMemo(
    () => statusRows.find((row) => row.status === "REJECTED")?.count ?? 0,
    [statusRows]
  );

  // Completion and cancellation are shares of the same total, so they are
  // rounded from the counts the backend reported rather than stored separately.
  const completionRate = totalOrders ? Math.round((delivered / totalOrders) * 100) : 0;
  const cancellationRate = totalOrders ? Math.round((cancelled / totalOrders) * 100) : 0;

  const maxPlanRevenue = useMemo(
    () =>
      Math.max(
        1,
        ...(analytics?.planRows ?? []).map((row) => row.monthlyRevenue + row.commissionRevenue)
      ),
    [analytics]
  );

  if (loading && !stats) return <Loading label="Loading analytics…" />;
  if (error && !stats) {
    return <ErrorState title="Couldn't load" message={error} onAction={() => refresh()} />;
  }

  return (
    <Screen padded={false} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh({ silent: true })}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* ── Orders ──────────────────────────────────────────────────── */}
        <Section title="Orders" style={{ marginTop: 8 }}>
          <StatGrid>
            <StatTile label="All time" value={totalOrders} />
            <StatTile label="This week" value={stats?.orders.newThisWeek ?? 0} />
            <StatTile
              label="Completed"
              value={`${completionRate}%`}
              caption={`${delivered} delivered`}
              tone="success"
            />
            <StatTile
              label="Cancelled"
              value={`${cancellationRate}%`}
              caption={`${cancelled} orders`}
              tone="error"
            />
          </StatGrid>
        </Section>

        {daily.length ? (
          <Section title="Last 7 days">
            <Card>
              <TrendBars
                labels={daily.map((row) => dayLabel(row.date))}
                series={[
                  { label: "Orders", points: daily.map((row) => row.orders) },
                  { label: "Revenue", points: daily.map((row) => row.revenue), prefix: "₹" },
                ]}
                height={140}
              />
              <View style={[styles.summary, { borderTopColor: theme.colors.border }]}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                  {weekTotals.orders} orders
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                  {formatCurrency(weekTotals.revenue)}
                </Text>
              </View>
            </Card>
          </Section>
        ) : null}

        {statusRows.length ? (
          <Section title="Where orders end up">
            <Card>
              {statusRows.map((row) => (
                <MeterRow
                  key={row.status}
                  label={titleCase(row.status)}
                  value={row.count}
                  total={Math.max(1, totalOrders)}
                  caption={`${row.count} · ${Math.round((row.count / Math.max(1, totalOrders)) * 100)}%`}
                  tone={
                    row.status === "DELIVERED"
                      ? theme.colors.success
                      : row.status === "REJECTED"
                        ? theme.colors.error
                        : undefined
                  }
                />
              ))}
            </Card>
          </Section>
        ) : null}

        {/* ── Revenue ─────────────────────────────────────────────────── */}
        <Section title="Revenue">
          <StatGrid>
            <StatTile
              label="Gross order value"
              value={formatCurrency(stats?.revenue.total ?? 0)}
              caption="Delivered, all time"
            />
            <StatTile
              label="Commission"
              value={formatCurrency(analytics?.totals.commissionRevenue ?? 0)}
              caption="Last 30 days"
              tone="success"
            />
            <StatTile
              label="Subscriptions"
              value={formatCurrency(analytics?.totals.monthlyRecurringRevenue ?? 0)}
              caption="Monthly recurring"
              tone="info"
            />
            <StatTile
              label="Platform total"
              value={formatCurrency(analytics?.totals.totalRevenue ?? 0)}
              caption="Commission + plans"
            />
          </StatGrid>
        </Section>

        {/* ── Plans ───────────────────────────────────────────────────── */}
        {analytics?.planRows.length ? (
          <Section title="Revenue by plan">
            <Card>
              {analytics.planRows.map((row) => (
                <MeterRow
                  key={row._id}
                  label={`${row.name} · ${row.activeCount} active`}
                  value={row.monthlyRevenue + row.commissionRevenue}
                  total={maxPlanRevenue}
                  caption={formatCurrency(row.monthlyRevenue + row.commissionRevenue)}
                />
              ))}
              <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 4 }}>
                Plan fees plus commission earned in the last 30 days.
              </Text>
            </Card>
          </Section>
        ) : null}

        {/* ── Restaurants ─────────────────────────────────────────────── */}
        <Section title="Restaurants">
          <StatGrid>
            <StatTile
              label="Total"
              value={stats?.restaurants.total ?? 0}
              caption={`${stats?.restaurants.active ?? 0} open`}
            />
            <StatTile
              label="On a paid plan"
              value={analytics?.totals.activeSubscriptions ?? 0}
              caption={analytics?.mostPopularPlan ? `Most: ${analytics.mostPopularPlan.name}` : undefined}
            />
            <StatTile
              label="Tiffin providers"
              value={stats?.restaurants.tiffinProviders ?? 0}
              caption={`${stats?.tiffin.activeSubscriptions ?? 0} subscribers`}
            />
            <StatTile
              label="Menu items live"
              value={stats?.menu.active ?? 0}
              caption={`of ${stats?.menu.total ?? 0}`}
            />
          </StatGrid>
        </Section>

        {/* ── Customers ───────────────────────────────────────────────── */}
        <Section title="Customers">
          <StatGrid>
            <StatTile label="All users" value={stats?.users.total ?? 0} />
            <StatTile
              label="New this week"
              value={stats?.users.newThisWeek ?? 0}
              tone="success"
            />
            <StatTile label="Customers" value={stats?.users.customers ?? 0} />
            <StatTile label="Restaurant owners" value={stats?.users.vendors ?? 0} />
          </StatGrid>
        </Section>

        {/* ── Watch list ──────────────────────────────────────────────── */}
        {analytics?.nearQuota.length ? (
          <Section title="Near their free-order limit">
            <Card padded={false}>
              {analytics.nearQuota.slice(0, 8).map((row, index, list) => (
                <Pressable
                  key={row.restaurantId}
                  onPress={() =>
                    navigation.navigate("AdminRestaurantDetail", {
                      restaurantId: row.restaurantId,
                      name: row.restaurantName,
                    })
                  }
                  style={({ pressed }) => [
                    styles.watchRow,
                    {
                      borderBottomWidth:
                        index === list.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                      backgroundColor: pressed ? theme.colors.surface : "transparent",
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700" }}>
                      {row.restaurantName}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {row.planName} · {row.used}/{row.total} used
                    </Text>
                  </View>
                  <Badge label={`${row.percent}%`} tone={row.percent >= 95 ? "error" : "warning"} />
                </Pressable>
              ))}
            </Card>
          </Section>
        ) : null}

        {analytics?.expiringSoon.length ? (
          <Section title="Expiring within a week">
            <Card padded={false}>
              {analytics.expiringSoon.slice(0, 8).map((row, index, list) => (
                <Pressable
                  key={row.restaurantId}
                  onPress={() =>
                    navigation.navigate("AdminRestaurantDetail", {
                      restaurantId: row.restaurantId,
                      name: row.restaurantName,
                    })
                  }
                  style={({ pressed }) => [
                    styles.watchRow,
                    {
                      borderBottomWidth:
                        index === list.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                      backgroundColor: pressed ? theme.colors.surface : "transparent",
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700" }}>
                      {row.restaurantName}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {row.planName} · ends {formatDate(row.endDate)}
                    </Text>
                  </View>
                  <Badge
                    label={`${row.daysRemaining}d`}
                    tone={row.daysRemaining <= 2 ? "error" : "warning"}
                  />
                </Pressable>
              ))}
            </Card>
          </Section>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 10,
  },
  watchRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
});
