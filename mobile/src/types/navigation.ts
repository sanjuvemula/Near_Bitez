import type { CompositeNavigationProp, NavigatorScreenParams } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AdminOrder } from "@/types/admin";

/**
 * Navigation contract.
 *
 * Typed up front so screens migrated later get compile-time checking on route
 * names and params instead of silent typos.
 */

export type AuthStackParamList = {
  Login: undefined;
  Register: { mode?: "customer" | "vendor" } | undefined;
};

export type CustomerTabParamList = {
  Home: undefined;
  /** Optional seed, e.g. tapping a category on Home. */
  Search: { initialQuery?: string } | undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

export type CustomerStackParamList = {
  Tabs: NavigatorScreenParams<CustomerTabParamList>;
  RestaurantDetail: { restaurantId: string };
  Checkout: undefined;
  OrderTracking: { orderId: string };
  Notifications: undefined;

  /* ── Game zone (Phase 6) ─────────────────────────────────────────────── */
  GamesHome: undefined;
  BiteCatcher: undefined;
  FoodMemory: undefined;
  TrayShuffle: undefined;
  SnakesSprint: undefined;
  CravingWheel: undefined;
  Leaderboard: undefined;
  Rewards: undefined;
};

export type VendorTabParamList = {
  Dashboard: undefined;
  VendorOrders: undefined;
  VendorMenu: undefined;
  VendorFinance: undefined;
  VendorMore: undefined;
};

export type VendorStackParamList = {
  Tabs: NavigatorScreenParams<VendorTabParamList>;
  VendorOrderDetail: { orderId: string };
  AllOrders: undefined;
  Inventory: undefined;
  Tiffin: undefined;
  Subscription: undefined;
  Delivery: undefined;
  Growth: undefined;
  Messages: undefined;
  StoreProfile: undefined;
  VendorNotifications: undefined;
};

export type RiderStackParamList = {
  RiderHome: undefined;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminRestaurants: undefined;
  AdminOrders: undefined;
  AdminFinance: undefined;
  AdminMore: undefined;
};

export type AdminStackParamList = {
  Tabs: NavigatorScreenParams<AdminTabParamList>;
  /** `name` seeds the header so it is right before the fetch resolves. */
  AdminRestaurantDetail: { restaurantId: string; name?: string };
  /**
   * `order` is the row the caller already loaded. The admin API exposes no
   * fetch-by-id route and its order search only matches within one page, so an
   * older order could not be re-fetched by id alone.
   */
  AdminOrderDetail: { orderId: string; order?: AdminOrder };
  AdminUsers: undefined;
  AdminSubscriptions: undefined;
  AdminPlans: undefined;
  AdminTiffin: undefined;
  AdminAnalytics: undefined;
  AdminMessages: undefined;
  AdminPromos: undefined;
  /** Restaurant-scoped when params are supplied, platform-wide otherwise. */
  AdminMenu: { restaurantId?: string; name?: string } | undefined;
  AdminFeedback: undefined;
  AdminSettings: undefined;
  AdminNotifications: undefined;
};

/**
 * Admin screens that sit inside the tab navigator but also push stack screens.
 *
 * Without the composite type, navigating from the dashboard to a sibling tab
 * (Finance) and to a stack screen (a restaurant) could not both type-check.
 */
export type AdminScreenNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<AdminTabParamList>,
  NativeStackNavigationProp<AdminStackParamList>
>;

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Customer: NavigatorScreenParams<CustomerStackParamList>;
  Vendor: NavigatorScreenParams<VendorStackParamList>;
  Rider: NavigatorScreenParams<RiderStackParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
