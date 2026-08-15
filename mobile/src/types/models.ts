/**
 * Shapes returned by the existing NearBitez API.
 *
 * Verified against server/controllers rather than assumed — the cart, discovery
 * and notification envelopes below match what those controllers actually build.
 */

export type UserRole = "customer" | "vendor" | "admin" | "rider";

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  /** Backend stores a single address string, not a saved-address list. */
  address?: string;
  coins?: number;
  xp?: number;
  favoriteRestaurants?: string[];
}

export interface Restaurant {
  _id: string;
  name: string;
  description?: string;
  address: string;
  category: string;
  cuisineType?: string[];
  imageUrl?: string;
  rating?: number;
  deliveryTime?: number;
  isVegOnly?: boolean;
  isActive?: boolean;
  baseDeliveryFee?: number;
  freeDeliveryAbove?: number;
  location?: { lat: number | null; lng: number | null };
  distanceKm?: number | null;
  orderCount?: number;
  deliveredOrderCount?: number;

  /** Tiffin service fields (server/models/Restaurant.js). */
  tiffinAvailable?: boolean;
  tiffinPrice?: number;
  tiffinDescription?: string;
  tiffinMealType?: string;
  tiffinDuration?: string;
}

export interface MenuItem {
  _id: string;
  restaurant?: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  isAvailable: boolean;
  isVeg?: boolean;
}

export type OrderStatus =
  | "SCHEDULED"
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "REJECTED";

/** Progression used for the tracking timeline; REJECTED is terminal + separate. */
export const ORDER_FLOW: OrderStatus[] = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export interface OrderItem {
  menuItem: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

export interface Order {
  _id: string;
  customer: string | User;
  restaurant: string | Restaurant;
  items: OrderItem[];
  itemTotal: number;
  deliveryFee: number;
  platformFee: number;
  gst: number;
  promoCode?: string | null;
  promoDiscount?: number;
  loyaltyDiscount?: number;
  pointsRedeemed?: number;
  grandTotal: number;
  status: OrderStatus;
  statusTimeline?: { status: OrderStatus; changedAt: string }[];
  paymentStatus: "PENDING" | "PAID";
  paymentMethod?: string;
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryInstructions?: string;
  scheduledFor?: string | null;
  createdAt: string;
}

export interface CartLine {
  menuItem: MenuItem | string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  lineTotal?: number;
  isAvailable?: boolean;
}

/** Totals are computed server-side; the app only displays them. */
export interface CartTotals {
  itemTotal: number;
  deliveryFee: number;
  platformFee: number;
  gst: number;
  grandTotal: number;
  totalItems: number;
}

export interface Cart {
  restaurant: Restaurant | null;
  items: CartLine[];
  warnings: string[];
  totals: CartTotals;
}

export interface DiscoveryFeed {
  restaurants: Restaurant[];
  categories: { name: string; count?: number; imageUrl?: string }[];
  popularDishes: MenuItem[];
  featuredRestaurants: Restaurant[];
  trendingRestaurants: Restaurant[];
  nearestRestaurants: Restaurant[];
}

export interface AppNotification {
  _id: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  route?: string;
  createdAt: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user: User;
  /** Present for native clients; the web app uses the cookie instead. */
  token?: string;
}
