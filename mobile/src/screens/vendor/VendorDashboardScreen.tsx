import React from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Badge, Button, ErrorState, Loading, Screen } from "@/components";
import { vendorApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useVendor } from "@/hooks/useVendor";
import { formatCurrency } from "@/utils/format";
import type { VendorStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<VendorStackParamList>;

/**
 * Vendor home.
 *
 * Answers "what needs me right now" first — today's numbers, then alerts that
 * are actionable, then shortcuts. Everything reads from the shared
 * VendorContext, so a socket-pushed order updates this without a refetch here.
 */
export const VendorDashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const { unreadCount } = useNotifications();
  const { overview, loading, refreshing, error, refresh } = useVendor();

  // Subscription drives the quota alerts; loaded separately so a failure here
  // never blocks the dashboard.
  const { data: subscription } = useApi(() => vendorApi.subscription(), []);

  const stats = overview?.stats;
  const restaurant = overview?.restaurant;

  const toggleStore = async () => {
    if (!restaurant) return;
    try {
      await vendorApi.updateRestaurant({ isActive: !restaurant.isActive });
      await refresh({ silent: true });
      void refreshUser();
      toast.success(restaurant.isActive ? "Store closed" : "Store is open");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update store");
    }
  };

  if (loading && !overview) return <Loading label="Loading dashboard…" />;

  if (error && !overview) {
    return <ErrorState title="Couldn't load" message={error} onAction={() => refresh()} />;
  }

  const usage = subscription?.usage;
  const expiry = subscription?.state?.expiry;
  const quotaPercent =
    usage && usage.freeOrdersTotal > 0
      ? Math.min(100, Math.round((usage.freeOrdersUsed / usage.freeOrdersTotal) * 100))
      : 0;

  /** Only surface alerts the owner can act on. */
  const alerts: { tone: "error" | "warning" | "info"; text: string; onPress?: () => void }[] = [];
  if ((stats?.newOrders ?? 0) > 0) {
    alerts.push({
      tone: "warning",
      text: `${stats?.newOrders} new ${stats?.newOrders === 1 ? "order needs" : "orders need"} accepting`,
      onPress: () => navigation.navigate("Tabs", { screen: "VendorOrders" }),
    });
  }
  const outOfStock = (stats?.totalMenuItems ?? 0) - (stats?.activeMenuItems ?? 0);
  if (outOfStock > 0) {
    alerts.push({
      tone: "warning",
      text: `${outOfStock} menu ${outOfStock === 1 ? "item is" : "items are"} out of stock`,
      onPress: () => navigation.navigate("Inventory"),
    });
  }
  if (expiry?.expired) {
    alerts.push({
      tone: "error",
      text: "Your subscription has expired",
      onPress: () => navigation.navigate("Subscription"),
    });
  } else if (expiry?.expiringSoon) {
    alerts.push({
      tone: "warning",
      text: `Subscription expires in ${expiry.daysRemaining ?? "a few"} days`,
      onPress: () => navigation.navigate("Subscription"),
    });
  }
  if (quotaPercent >= 80 && (usage?.freeOrdersTotal ?? 0) > 0) {
    alerts.push({
      tone: quotaPercent >= 100 ? "error" : "warning",
      text:
        quotaPercent >= 100
          ? "Free order quota used up — commission now applies"
          : `${quotaPercent}% of your free order quota is used`,
      onPress: () => navigation.navigate("Subscription"),
    });
  }

  const tile = (label: string, value: string | number, tint: string, bg: string) => (
    <View
      key={label}
      style={[
        styles.tile,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <View style={styles.tileHead}>
        <Text style={[styles.tileLabel, { color: theme.colors.textMuted }]}>{label}</Text>
        <View style={[styles.tileDot, { backgroundColor: bg }]} />
      </View>
      <Text style={[styles.tileValue, { color: tint }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );

  const action = (label: string, hint: string, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 15 }}>
          {label}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
          {hint}
        </Text>
      </View>
      <Text style={{ color: theme.colors.textFaint, fontSize: 18 }}>›</Text>
    </Pressable>
  );

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
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hi, { color: theme.colors.textMuted }]}>
              {restaurant?.name || user?.name || "Your restaurant"}
            </Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {(stats?.newOrders ?? 0) > 0
                ? `${stats?.newOrders} waiting`
                : restaurant?.isActive
                ? "You're open"
                : "You're closed"}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("VendorNotifications")}
            hitSlop={10}
            style={[
              styles.bell,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <Text style={{ fontSize: 17 }}>🔔</Text>
            {unreadCount > 0 ? (
              <View style={[styles.bellDot, { backgroundColor: theme.colors.error }]} />
            ) : null}
          </Pressable>
        </View>

        {/* Open/closed is the single most-used control, so it sits at the top. */}
        <Pressable
          onPress={toggleStore}
          style={[
            styles.storeToggle,
            {
              backgroundColor: restaurant?.isActive
                ? theme.colors.successSoft
                : theme.colors.errorSoft,
              borderColor: restaurant?.isActive ? theme.colors.success : theme.colors.error,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <View
            style={[
              styles.switchTrack,
              {
                backgroundColor: restaurant?.isActive
                  ? theme.colors.success
                  : theme.colors.error,
              },
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                restaurant?.isActive ? { right: 3 } : { left: 3 },
              ]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: restaurant?.isActive ? theme.colors.success : theme.colors.error,
                fontWeight: "800",
                fontSize: 15,
              }}
            >
              {restaurant?.isActive ? "Open for orders" : "Closed"}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 1 }}>
              {restaurant?.isActive ? "Tap to stop taking orders" : "Tap to start taking orders"}
            </Text>
          </View>
        </Pressable>

        {alerts.length ? (
          <View style={styles.alerts}>
            {alerts.map((alert) => (
              <Pressable
                key={alert.text}
                onPress={alert.onPress}
                style={[
                  styles.alert,
                  {
                    backgroundColor:
                      alert.tone === "error"
                        ? theme.colors.errorSoft
                        : theme.colors.warningSoft,
                    borderRadius: theme.radius.md,
                  },
                ]}
              >
                <Text
                  style={{
                    color: alert.tone === "error" ? theme.colors.error : theme.colors.warning,
                    fontWeight: "600",
                    flex: 1,
                  }}
                >
                  {alert.text}
                </Text>
                <Text style={{ color: theme.colors.textFaint }}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={[styles.section, { color: theme.colors.text }]}>Today</Text>
        <View style={styles.tiles}>
          {tile("Orders", stats?.todayOrders ?? 0, theme.colors.text, theme.colors.info)}
          {tile(
            "Revenue",
            formatCurrency(stats?.todayRevenue ?? 0),
            theme.colors.success,
            theme.colors.success
          )}
          {tile("In queue", stats?.liveOrders ?? 0, theme.colors.warning, theme.colors.warning)}
          {tile(
            "Completed",
            stats?.deliveredOrders ?? 0,
            theme.colors.text,
            theme.colors.primary
          )}
        </View>

        {usage && usage.freeOrdersTotal > 0 ? (
          <Pressable
            onPress={() => navigation.navigate("Subscription")}
            style={[
              styles.quota,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
              },
            ]}
          >
            <View style={styles.quotaHead}>
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                {subscription?.current?.name ?? "Plan"}
              </Text>
              <Badge
                label={`${usage.freeOrdersUsed}/${usage.freeOrdersTotal} used`}
                tone={quotaPercent >= 80 ? "warning" : "primary"}
              />
            </View>
            <View
              style={[styles.bar, { backgroundColor: theme.colors.border }]}
            >
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${quotaPercent}%`,
                    backgroundColor:
                      quotaPercent >= 100
                        ? theme.colors.error
                        : quotaPercent >= 80
                        ? theme.colors.warning
                        : theme.colors.success,
                  },
                ]}
              />
            </View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 8 }}>
              {Math.max(0, usage.freeOrdersTotal - usage.freeOrdersUsed)} free orders left ·{" "}
              {subscription?.current?.commissionPercent ?? 0}% commission after
            </Text>
          </Pressable>
        ) : null}

        <Text style={[styles.section, { color: theme.colors.text }]}>Quick actions</Text>
        <View style={{ gap: 8 }}>
          {action("Live orders", `${stats?.liveOrders ?? 0} in progress`, () =>
            navigation.navigate("Tabs", { screen: "VendorOrders" })
          )}
          {action("Menu", `${stats?.activeMenuItems ?? 0} items live`, () =>
            navigation.navigate("Tabs", { screen: "VendorMenu" })
          )}
          {action(
            "Inventory",
            outOfStock > 0 ? `${outOfStock} out of stock` : "All in stock",
            () => navigation.navigate("Inventory")
          )}
          {action("Tiffin & services", "Plans and subscribers", () =>
            navigation.navigate("Tiffin")
          )}
          {action("Finance", "Earnings and payouts", () =>
            navigation.navigate("Tabs", { screen: "VendorFinance" })
          )}
          {action("My subscription", subscription?.current?.name ?? "Manage plan", () =>
            navigation.navigate("Subscription")
          )}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  hi: { fontSize: 13 },
  title: { fontSize: 23, fontWeight: "800", marginTop: 2 },
  bell: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  bellDot: { position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: 4 },
  storeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  switchTrack: { width: 46, height: 26, borderRadius: 13, justifyContent: "center" },
  switchThumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  alerts: { gap: 8, marginBottom: 20 },
  alert: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13 },
  section: { fontSize: 16, fontWeight: "700", marginBottom: 12, marginTop: 4 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  tile: { flexGrow: 1, flexBasis: "46%", borderWidth: 1, padding: 14 },
  tileHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tileLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  tileDot: { width: 8, height: 8, borderRadius: 4 },
  tileValue: { fontSize: 24, fontWeight: "800", marginTop: 8 },
  quota: { borderWidth: 1, padding: 16, marginBottom: 20 },
  quotaHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  bar: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
});
