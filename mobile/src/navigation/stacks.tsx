import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Placeholder } from "@/screens/Placeholder";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { HomeScreen } from "@/screens/customer/HomeScreen";
import { SearchScreen } from "@/screens/customer/SearchScreen";
import { CartScreen } from "@/screens/customer/CartScreen";
import { OrdersScreen } from "@/screens/customer/OrdersScreen";
import { ProfileScreen } from "@/screens/customer/ProfileScreen";
import { RestaurantDetailScreen } from "@/screens/customer/RestaurantDetailScreen";
import { CheckoutScreen } from "@/screens/customer/CheckoutScreen";
import { OrderTrackingScreen } from "@/screens/customer/OrderTrackingScreen";
import { NotificationsScreen } from "@/screens/customer/NotificationsScreen";
import { GamesHomeScreen } from "@/features/games/screens/GamesHomeScreen";
import { BiteCatcherScreen } from "@/features/games/screens/BiteCatcherScreen";
import { FoodMemoryScreen } from "@/features/games/screens/FoodMemoryScreen";
import { TrayShuffleScreen } from "@/features/games/screens/TrayShuffleScreen";
import { SnakesSprintScreen } from "@/features/games/screens/SnakesSprintScreen";
import { CravingWheelScreen } from "@/features/games/screens/CravingWheelScreen";
import { LeaderboardScreen } from "@/features/games/screens/LeaderboardScreen";
import { RewardsScreen } from "@/features/games/screens/RewardsScreen";
import { useCart } from "@/hooks/useCart";
import { useVendor } from "@/hooks/useVendor";
import { VendorDashboardScreen } from "@/screens/vendor/VendorDashboardScreen";
import { VendorLiveOrdersScreen } from "@/screens/vendor/VendorLiveOrdersScreen";
import { VendorAllOrdersScreen } from "@/screens/vendor/VendorAllOrdersScreen";
import { VendorOrderDetailScreen } from "@/screens/vendor/VendorOrderDetailScreen";
import { VendorMenuScreen } from "@/screens/vendor/VendorMenuScreen";
import { VendorInventoryScreen } from "@/screens/vendor/VendorInventoryScreen";
import { VendorFinanceScreen } from "@/screens/vendor/VendorFinanceScreen";
import { VendorSubscriptionScreen } from "@/screens/vendor/VendorSubscriptionScreen";
import { VendorMessagesScreen } from "@/screens/vendor/VendorMessagesScreen";
import { VendorMoreScreen } from "@/screens/vendor/VendorMoreScreen";
import { VendorStoreProfileScreen } from "@/screens/vendor/VendorStoreProfileScreen";
import {
  VendorTiffinScreen,
  VendorDeliveryScreen,
  VendorGrowthScreen,
} from "@/screens/vendor/VendorServiceScreens";
import { AdminDashboardScreen } from "@/screens/admin/AdminDashboardScreen";
import { AdminRestaurantsScreen } from "@/screens/admin/AdminRestaurantsScreen";
import { AdminRestaurantDetailScreen } from "@/screens/admin/AdminRestaurantDetailScreen";
import { AdminOrdersScreen } from "@/screens/admin/AdminOrdersScreen";
import { AdminOrderDetailScreen } from "@/screens/admin/AdminOrderDetailScreen";
import { AdminUsersScreen } from "@/screens/admin/AdminUsersScreen";
import { AdminSubscriptionsScreen } from "@/screens/admin/AdminSubscriptionsScreen";
import { AdminPlansScreen } from "@/screens/admin/AdminPlansScreen";
import { AdminFinanceScreen } from "@/screens/admin/AdminFinanceScreen";
import { AdminAnalyticsScreen } from "@/screens/admin/AdminAnalyticsScreen";
import { AdminTiffinScreen } from "@/screens/admin/AdminTiffinScreen";
import { AdminMessagesScreen } from "@/screens/admin/AdminMessagesScreen";
import { AdminFeedbackScreen } from "@/screens/admin/AdminFeedbackScreen";
import { AdminSettingsScreen } from "@/screens/admin/AdminSettingsScreen";
import { AdminMoreScreen } from "@/screens/admin/AdminMoreScreen";
import { AdminMenuScreen, AdminPromosScreen } from "@/screens/admin/AdminCatalogScreens";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "@/hooks/useTheme";
import type {
  AdminStackParamList,
  AdminTabParamList,
  AuthStackParamList,
  CustomerStackParamList,
  CustomerTabParamList,
  RiderStackParamList,
  VendorStackParamList,
  VendorTabParamList,
} from "@/types/navigation";

/**
 * Role-based navigation shells.
 *
 * Every destination the web app has is reachable here; most render a
 * Placeholder naming the web file it replaces. Screens get swapped in one at a
 * time without restructuring the navigators.
 *
 * Tab icons are text glyphs for now — Phase 1 adds no icon dependency.
 */

const useScreenOptions = () => {
  const { theme } = useTheme();
  return {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTitleStyle: { color: theme.colors.text, fontSize: 17, fontWeight: "700" as const },
    headerTintColor: theme.colors.primary,
    contentStyle: { backgroundColor: theme.colors.background },
  };
};

const useTabOptions = () => {
  const { theme } = useTheme();
  return {
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.textFaint,
    tabBarStyle: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: "600" as const },
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTitleStyle: { color: theme.colors.text, fontSize: 17, fontWeight: "700" as const },
  };
};

const tabIcon =
  (glyph: string) =>
  ({ color }: { color: string }) => <Text style={{ fontSize: 18, color }}>{glyph}</Text>;

/* ── Auth ─────────────────────────────────────────────────────────────── */

const Auth = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => (
  <Auth.Navigator screenOptions={{ headerShown: false }}>
    <Auth.Screen name="Login" component={LoginScreen} />
    <Auth.Screen
      name="Register"
      component={RegisterScreen}
      options={{ headerShown: false, presentation: "card" }}
    />
  </Auth.Navigator>
);

/* ── Customer ─────────────────────────────────────────────────────────── */

const CustomerTab = createBottomTabNavigator<CustomerTabParamList>();

const CustomerTabs: React.FC = () => {
  const options = useTabOptions();
  // Live cart count on the tab badge.
  const { itemCount } = useCart();

  return (
    <CustomerTab.Navigator screenOptions={{ ...options, headerShown: false }}>
      <CustomerTab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: tabIcon("⌂") }}
      />
      <CustomerTab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarIcon: tabIcon("⌕") }}
      />
      <CustomerTab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: tabIcon("▣"),
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          headerShown: true,
          title: "Cart",
        }}
      />
      <CustomerTab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ tabBarIcon: tabIcon("≡") }}
      />
      <CustomerTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: tabIcon("☺") }}
      />
    </CustomerTab.Navigator>
  );
};

const Customer = createNativeStackNavigator<CustomerStackParamList>();

export const CustomerStack: React.FC = () => {
  const options = useScreenOptions();

  return (
    <Customer.Navigator screenOptions={options}>
      <Customer.Screen name="Tabs" component={CustomerTabs} options={{ headerShown: false }} />
      <Customer.Screen
        name="RestaurantDetail"
        component={RestaurantDetailScreen}
        options={{ title: "", headerTransparent: false }}
      />
      <Customer.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: "Checkout" }}
      />
      <Customer.Screen
        name="OrderTracking"
        component={OrderTrackingScreen}
        options={{ title: "Your order" }}
      />
      <Customer.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notifications" }}
      />

      {/* ── Game zone ──────────────────────────────────────────────────
          Games hide the header: their own stat bar is the header, and the
          navigation chrome breaks the full-bleed play area. */}
      <Customer.Screen
        name="GamesHome"
        component={GamesHomeScreen}
        options={{ title: "Game Zone" }}
      />
      <Customer.Screen
        name="BiteCatcher"
        component={BiteCatcherScreen}
        options={{ headerShown: false }}
      />
      <Customer.Screen
        name="FoodMemory"
        component={FoodMemoryScreen}
        options={{ headerShown: false }}
      />
      <Customer.Screen
        name="TrayShuffle"
        component={TrayShuffleScreen}
        options={{ headerShown: false }}
      />
      <Customer.Screen
        name="SnakesSprint"
        component={SnakesSprintScreen}
        options={{ headerShown: false }}
      />
      <Customer.Screen
        name="CravingWheel"
        component={CravingWheelScreen}
        options={{ title: "Craving Wheel" }}
      />
      <Customer.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ title: "Today's leaderboard" }}
      />
      <Customer.Screen name="Rewards" component={RewardsScreen} options={{ title: "Rewards" }} />
    </Customer.Navigator>
  );
};

/* ── Vendor ───────────────────────────────────────────────────────────── */

const VendorTab = createBottomTabNavigator<VendorTabParamList>();

const VendorTabs: React.FC = () => {
  const options = useTabOptions();
  // Live count so the owner sees new orders without opening the tab.
  const { overview } = useVendor();
  const live = overview?.stats?.liveOrders ?? 0;

  return (
    <VendorTab.Navigator screenOptions={{ ...options, headerShown: false }}>
      <VendorTab.Screen
        name="Dashboard"
        component={VendorDashboardScreen}
        options={{ tabBarIcon: tabIcon("◧") }}
      />
      <VendorTab.Screen
        name="VendorOrders"
        component={VendorLiveOrdersScreen}
        options={{
          tabBarIcon: tabIcon("≡"),
          title: "Orders",
          tabBarBadge: live > 0 ? live : undefined,
        }}
      />
      <VendorTab.Screen
        name="VendorMenu"
        component={VendorMenuScreen}
        options={{ tabBarIcon: tabIcon("✱"), title: "Menu" }}
      />
      <VendorTab.Screen
        name="VendorFinance"
        component={VendorFinanceScreen}
        options={{ tabBarIcon: tabIcon("₹"), title: "Finance", headerShown: true }}
      />
      <VendorTab.Screen
        name="VendorMore"
        component={VendorMoreScreen}
        options={{ tabBarIcon: tabIcon("⋯"), title: "More" }}
      />
    </VendorTab.Navigator>
  );
};

const Vendor = createNativeStackNavigator<VendorStackParamList>();

export const VendorStack: React.FC = () => {
  const options = useScreenOptions();

  return (
    <Vendor.Navigator screenOptions={options}>
      <Vendor.Screen name="Tabs" component={VendorTabs} options={{ headerShown: false }} />
      <Vendor.Screen
        name="VendorOrderDetail"
        component={VendorOrderDetailScreen}
        options={{ title: "Order" }}
      />
      <Vendor.Screen
        name="AllOrders"
        component={VendorAllOrdersScreen}
        options={{ title: "All orders" }}
      />
      <Vendor.Screen
        name="Inventory"
        component={VendorInventoryScreen}
        options={{ title: "Inventory & stock" }}
      />
      <Vendor.Screen
        name="Tiffin"
        component={VendorTiffinScreen}
        options={{ title: "Tiffin & services" }}
      />
      <Vendor.Screen
        name="Subscription"
        component={VendorSubscriptionScreen}
        options={{ title: "My subscription" }}
      />
      <Vendor.Screen
        name="Delivery"
        component={VendorDeliveryScreen}
        options={{ title: "Delivery" }}
      />
      <Vendor.Screen
        name="Growth"
        component={VendorGrowthScreen}
        options={{ title: "Growth" }}
      />
      <Vendor.Screen
        name="Messages"
        component={VendorMessagesScreen}
        options={{ title: "Messages" }}
      />
      <Vendor.Screen
        name="StoreProfile"
        component={VendorStoreProfileScreen}
        options={{ title: "Store profile" }}
      />
      <Vendor.Screen
        name="VendorNotifications"
        component={NotificationsScreen}
        options={{ title: "Notifications" }}
      />
    </Vendor.Navigator>
  );
};

/* ── Rider ────────────────────────────────────────────────────────────── */

const Rider = createNativeStackNavigator<RiderStackParamList>();

export const RiderStack: React.FC = () => {
  const options = useScreenOptions();

  return (
    <Rider.Navigator screenOptions={options}>
      <Rider.Screen
        name="RiderHome"
        options={{ title: "Deliveries" }}
        children={() => (
          <Placeholder
            title="Rider"
            note="The Rider model exists on the backend but has no web UI yet, so this is built fresh rather than migrated."
          />
        )}
      />
    </Rider.Navigator>
  );
};

/* ── Admin ────────────────────────────────────────────────────────────── */

const AdminTab = createBottomTabNavigator<AdminTabParamList>();

/**
 * The four areas an admin opens daily, plus More.
 *
 * Users, subscriptions, tiffin, analytics and settings are management tasks
 * rather than daily ones, so they live one level in under More instead of
 * crowding the bar.
 */
const AdminTabs: React.FC = () => {
  const options = useTabOptions();
  // Anything needing a decision shows on the Dashboard tab.
  const { alerts, stats } = useAdmin();
  const attention = alerts.reduce((sum, alert) => sum + alert.count, 0);
  const pendingPayouts = stats?.finance.pendingPayouts ?? 0;

  return (
    <AdminTab.Navigator screenOptions={{ ...options, headerShown: false }}>
      <AdminTab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarIcon: tabIcon("◧"),
          title: "Overview",
          tabBarBadge: attention > 0 ? attention : undefined,
        }}
      />
      <AdminTab.Screen
        name="AdminRestaurants"
        component={AdminRestaurantsScreen}
        options={{ tabBarIcon: tabIcon("⌂"), title: "Restaurants", headerShown: true }}
      />
      <AdminTab.Screen
        name="AdminOrders"
        component={AdminOrdersScreen}
        options={{ tabBarIcon: tabIcon("≡"), title: "Orders", headerShown: true }}
      />
      <AdminTab.Screen
        name="AdminFinance"
        component={AdminFinanceScreen}
        options={{
          tabBarIcon: tabIcon("₹"),
          title: "Finance",
          headerShown: true,
          tabBarBadge: pendingPayouts > 0 ? pendingPayouts : undefined,
        }}
      />
      <AdminTab.Screen
        name="AdminMore"
        component={AdminMoreScreen}
        options={{ tabBarIcon: tabIcon("⋯"), title: "More" }}
      />
    </AdminTab.Navigator>
  );
};

const Admin = createNativeStackNavigator<AdminStackParamList>();

export const AdminStack: React.FC = () => {
  const options = useScreenOptions();

  return (
    <Admin.Navigator screenOptions={options}>
      <Admin.Screen name="Tabs" component={AdminTabs} options={{ headerShown: false }} />
      <Admin.Screen
        name="AdminRestaurantDetail"
        component={AdminRestaurantDetailScreen}
        options={{ title: "Restaurant" }}
      />
      <Admin.Screen
        name="AdminOrderDetail"
        component={AdminOrderDetailScreen}
        options={{ title: "Order" }}
      />
      <Admin.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: "Users" }} />
      <Admin.Screen
        name="AdminSubscriptions"
        component={AdminSubscriptionsScreen}
        options={{ title: "Subscriptions" }}
      />
      <Admin.Screen name="AdminPlans" component={AdminPlansScreen} options={{ title: "Plans" }} />
      <Admin.Screen name="AdminTiffin" component={AdminTiffinScreen} options={{ title: "Tiffin" }} />
      <Admin.Screen
        name="AdminAnalytics"
        component={AdminAnalyticsScreen}
        options={{ title: "Analytics" }}
      />
      <Admin.Screen
        name="AdminMessages"
        component={AdminMessagesScreen}
        options={{ title: "Messages" }}
      />
      <Admin.Screen
        name="AdminPromos"
        component={AdminPromosScreen}
        options={{ title: "Coupons and rewards" }}
      />
      <Admin.Screen name="AdminMenu" component={AdminMenuScreen} options={{ title: "Menu" }} />
      <Admin.Screen
        name="AdminFeedback"
        component={AdminFeedbackScreen}
        options={{ title: "Reported issues" }}
      />
      <Admin.Screen
        name="AdminSettings"
        component={AdminSettingsScreen}
        options={{ title: "Platform settings" }}
      />
      <Admin.Screen
        name="AdminNotifications"
        component={NotificationsScreen}
        options={{ title: "Notifications" }}
      />
    </Admin.Navigator>
  );
};
