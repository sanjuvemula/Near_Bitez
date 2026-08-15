import React, { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
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
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency } from "@/utils/format";
import { dayLabel, shortId, titleCase } from "@/utils/admin";
import type { AdminScreenNavigation } from "@/types/navigation";

/**
 * Platform overview.
 *
 * Ordered by what needs a decision: alerts first, then today's operating
 * numbers, then the slower-moving totals. Charts are limited to one trend and
 * one breakdown — the rest are stat tiles, because a single number with a name
 * reads faster on a phone than a plot of it.
 */
export const AdminDashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<AdminScreenNavigation>();
  const { stats, analytics, alerts, loading, refreshing, error, refresh } = useAdmin();

  const daily = stats?.analytics.daily ?? [];
  const today = daily.length ? daily[daily.length - 1] : undefined;

  const cancelled = useMemo(
    () => stats?.analytics.orderStatuses.find((row) => row.status === "REJECTED")?.count ?? 0,
    [stats]
  );

  const statusRows = useMemo(
    () =>
      (stats?.analytics.orderStatuses ?? [])
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count),
    [stats]
  );

  const maxStatus = statusRows[0]?.count ?? 1;

  if (loading && !stats) return <Loading label="Loading platform…" />;
  if (error && !stats) {
    return <ErrorState title="Couldn't load" message={error} onAction={() => refresh()} />;
  }

  return (
    <Screen padded={false} edges={["top"]}>
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
        <View style={styles.identity}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>Platform control</Text>
            <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: "800" }}>
              {user?.name ?? "Admin"}
            </Text>
          </View>
          <Badge label="ADMIN" tone="error" />
        </View>

        {/* ── Needs attention ─────────────────────────────────────────── */}
        {alerts.length ? (
          <Section title="Needs attention">
            <Card padded={false}>
              {alerts.map((alert, index) => (
                <Pressable
                  key={alert.id}
                  // `route` names either a sibling tab or a stack screen; the
                  // composite navigator resolves both, but not in one signature.
                  onPress={() =>
                    alert.route ? navigation.navigate(alert.route as never) : undefined
                  }
                  style={({ pressed }) => [
                    styles.alert,
                    {
                      borderBottomWidth: index === alerts.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                      backgroundColor: pressed ? theme.colors.surface : "transparent",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          alert.tone === "error"
                            ? theme.colors.error
                            : alert.tone === "warning"
                              ? theme.colors.warning
                              : theme.colors.info,
                      },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "600", fontSize: 14 }}>
                      {alert.label}
                    </Text>
                    {alert.detail ? (
                      <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                        {alert.detail}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 17 }}>
                    {alert.count}
                  </Text>
                </Pressable>
              ))}
            </Card>
          </Section>
        ) : (
          <Section title="Needs attention">
            <Card>
              <Text style={{ color: theme.colors.textMuted }}>
                Nothing needs a decision right now.
              </Text>
            </Card>
          </Section>
        )}

        {/* ── Today ───────────────────────────────────────────────────── */}
        <Section title="Today">
          <StatGrid>
            <StatTile
              label="Orders today"
              value={today?.orders ?? 0}
              caption={`${stats?.orders.newThisWeek ?? 0} this week`}
            />
            <StatTile
              label="Revenue today"
              value={formatCurrency(today?.revenue ?? 0)}
              tone="success"
            />
            <StatTile
              label="In progress"
              value={stats?.orders.pending ?? 0}
              caption="Not yet delivered"
              tone="warning"
              onPress={() => navigation.navigate("AdminOrders")}
            />
            <StatTile
              label="Delivered"
              value={stats?.orders.delivered ?? 0}
              caption={`${cancelled} cancelled`}
              tone="success"
              onPress={() => navigation.navigate("AdminOrders")}
            />
          </StatGrid>
        </Section>

        {/* ── Trend ───────────────────────────────────────────────────── */}
        {daily.length ? (
          <Section title="Last 7 days">
            <Card>
              <TrendBars
                labels={daily.map((row) => dayLabel(row.date))}
                series={[
                  { label: "Orders", points: daily.map((row) => row.orders) },
                  { label: "Revenue", points: daily.map((row) => row.revenue), prefix: "₹" },
                ]}
              />
            </Card>
          </Section>
        ) : null}

        {/* ── Revenue ─────────────────────────────────────────────────── */}
        <Section title="Revenue">
          <StatGrid>
            <StatTile
              label="Delivered value"
              value={formatCurrency(stats?.revenue.total ?? 0)}
              caption="All time"
            />
            <StatTile
              label="Commission earned"
              value={formatCurrency(analytics?.totals.commissionRevenue ?? 0)}
              caption="Last 30 days"
              tone="success"
            />
            <StatTile
              label="Subscription revenue"
              value={formatCurrency(analytics?.totals.monthlyRecurringRevenue ?? 0)}
              caption="Monthly recurring"
              tone="info"
              onPress={() => navigation.navigate("AdminSubscriptions")}
            />
            <StatTile
              label="Payouts held"
              value={formatCurrency(stats?.finance.openPayoutAmount ?? 0)}
              caption={`${stats?.finance.pendingPayouts ?? 0} awaiting action`}
              tone="warning"
              onPress={() => navigation.navigate("AdminFinance")}
            />
          </StatGrid>
        </Section>

        {/* ── Platform ────────────────────────────────────────────────── */}
        <Section title="Platform">
          <StatGrid>
            <StatTile
              label="Restaurants"
              value={stats?.restaurants.total ?? 0}
              caption={`${stats?.restaurants.active ?? 0} open now`}
              tone="success"
              onPress={() => navigation.navigate("AdminRestaurants")}
            />
            <StatTile
              label="Users"
              value={stats?.users.total ?? 0}
              caption={`${stats?.users.newThisWeek ?? 0} joined this week`}
              onPress={() => navigation.navigate("AdminUsers")}
            />
            <StatTile
              label="Menu items live"
              value={stats?.menu.active ?? 0}
              caption={`${stats?.menu.paused ?? 0} paused`}
            />
            <StatTile
              label="Tiffin subscribers"
              value={stats?.tiffin.activeSubscriptions ?? 0}
              caption={`${stats?.restaurants.tiffinProviders ?? 0} providers`}
              onPress={() => navigation.navigate("AdminTiffin")}
            />
          </StatGrid>
        </Section>

        {/* ── Order status breakdown ──────────────────────────────────── */}
        {statusRows.length ? (
          <Section title="Orders by status">
            <Card>
              {statusRows.map((row) => (
                <MeterRow
                  key={row.status}
                  label={titleCase(row.status)}
                  value={row.count}
                  total={maxStatus}
                  caption={`${row.count}`}
                />
              ))}
            </Card>
          </Section>
        ) : null}

        {/* ── Top restaurants ─────────────────────────────────────────── */}
        {stats?.analytics.topRestaurants.length ? (
          <Section
            title="Top restaurants"
            action={
              <Pressable onPress={() => navigation.navigate("AdminRestaurants")}>
                <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 13 }}>
                  See all
                </Text>
              </Pressable>
            }
          >
            <Card padded={false}>
              {stats.analytics.topRestaurants.map((row, index) => (
                <Pressable
                  key={row._id}
                  onPress={() =>
                    navigation.navigate("AdminRestaurantDetail", {
                      restaurantId: row._id,
                      name: row.name,
                    })
                  }
                  style={({ pressed }) => [
                    styles.rank,
                    {
                      borderBottomWidth:
                        index === stats.analytics.topRestaurants.length - 1
                          ? 0
                          : StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                      backgroundColor: pressed ? theme.colors.surface : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.textFaint, fontWeight: "800", width: 20 }}>
                    {index + 1}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700" }}>
                      {row.name ?? "Removed restaurant"}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {row.orders} delivered · {titleCase(row.category)}
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                    {formatCurrency(row.revenue)}
                  </Text>
                </Pressable>
              ))}
            </Card>
          </Section>
        ) : null}

        {/* ── Recent orders ───────────────────────────────────────────── */}
        {stats?.recent.orders.length ? (
          <Section
            title="Latest orders"
            action={
              <Pressable onPress={() => navigation.navigate("AdminOrders")}>
                <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 13 }}>
                  See all
                </Text>
              </Pressable>
            }
          >
            <Card padded={false}>
              {stats.recent.orders.slice(0, 5).map((order, index) => (
                <Pressable
                  key={order._id}
                  onPress={() =>
                    navigation.navigate("AdminOrderDetail", { orderId: order._id, order })
                  }
                  style={({ pressed }) => [
                    styles.rank,
                    {
                      borderBottomWidth: index === 4 ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                      backgroundColor: pressed ? theme.colors.surface : "transparent",
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700" }}>
                      {shortId(order._id)} ·{" "}
                      {typeof order.restaurant === "object"
                        ? (order.restaurant?.name ?? "Restaurant")
                        : "Restaurant"}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {titleCase(order.status)}
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                    {formatCurrency(order.grandTotal)}
                  </Text>
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
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  alert: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rank: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
});
