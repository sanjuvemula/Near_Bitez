import type { MenuItem, Order, OrderStatus, Restaurant } from "@/types/models";

/**
 * Vendor-side shapes, verified against live responses from
 * /api/v1/vendor/* rather than inferred from the controllers.
 */

export interface VendorStats {
  totalOrders: number;
  revenue: number;
  pendingOrders: number;
  completedOrders: number;
  liveOrders: number;
  deliveredOrders: number;
  rejectedOrders: number;
  activeMenuItems: number;
  totalMenuItems: number;
  deliveredRevenue: number;
  averageOrderValue: number;
  todayOrders: number;
  todayRevenue: number;
  newOrders: number;
  preparingOrders: number;
  readyOrders: number;
  outForDeliveryOrders: number;
  acceptanceRate: number;
  menuLiveCoverage: number;
  oldestLiveOrderMinutes: number;
}

export interface VendorOverview {
  restaurant: Restaurant | null;
  stats: VendorStats;
  statusBreakdown: Record<OrderStatus, number>;
  salesTrend: { date: string; revenue: number; orders: number }[];
  menuCategories: string[];
}

export interface SubscriptionPlan {
  _id: string;
  key?: string;
  slug?: string;
  name: string;
  monthlyFee: number;
  price: number;
  commissionPercent: number;
  commissionRate: number;
  freeOrderQuota: number;
  badge?: string;
  features?: string[];
  description?: string;
  isActive?: boolean;
}

export interface SubscriptionUsage {
  periodStart: string | null;
  periodEnd: string | null;
  orderCount: number;
  deliveredCount: number;
  grossOrderValue: number;
  commissionBase: number;
  commissionCollected: number;
  estimatedCommission: number;
  savedThisCycle: number;
  freeOrdersTotal: number;
  freeOrdersUsed: number;
  remainingFreeOrders?: number;
  usagePercent?: number;
}

export interface SubscriptionState {
  subscription: {
    _id: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    paymentStatus: string;
    autoRenew: boolean;
    source?: string;
    commissionRateOverride?: number | null;
    notes?: string;
  } | null;
  plan?: SubscriptionPlan | null;
  expiry?: { expiringSoon?: boolean; expired?: boolean; daysRemaining?: number } | null;
}

export interface VendorSubscription {
  current: SubscriptionPlan | null;
  usage: SubscriptionUsage;
  options: SubscriptionPlan[];
  recommendation?: { planKey?: string; title?: string; reason?: string };
  state: SubscriptionState;
}

export interface WalletTransactionRow {
  _id?: string;
  type?: string;
  status?: string;
  amount?: number;
  note?: string;
  createdAt?: string;
}

export interface VendorWallet {
  balance: number;
  totalEarnings: number;
  pendingSettlement: number;
  minPayoutAmount: number;
  payoutHoldHours: number;
  history: WalletTransactionRow[];
}

export interface VendorLogistics {
  location: { lat: number | null; lng: number | null };
  deliveryRadiusKm: number;
  baseDeliveryFee: number;
  freeDeliveryAbove: number;
  isSelfDelivery: boolean;
  extraTiers: { fromKm: number; toKm: number; extraCharge: number }[];
}

export interface Promo {
  _id: string;
  code: string;
  discountType?: string;
  discountValue?: number;
  minOrderValue?: number;
  maxDiscount?: number;
  isActive: boolean;
  expiresAt?: string | null;
  usedCount?: number;
  usageLimit?: number;
}

export interface VendorChat {
  _id: string;
  customer?: { _id: string; name?: string; phone?: string };
  messages?: {
    _id?: string;
    sender?: string;
    senderRole?: string;
    text?: string;
    createdAt?: string;
  }[];
  unreadCount?: number;
  updatedAt?: string;
}

/** Tiffin subscribers (customers subscribed to this restaurant's plan). */
export interface TiffinSubscriber {
  _id: string;
  customer?: { name?: string; phone?: string };
  planName?: string;
  price?: number;
  status: string;
  startDate?: string;
  endDate?: string;
  nextDelivery?: string;
  mealType?: string;
  isVeg?: boolean;
}

export type { MenuItem, Order, OrderStatus, Restaurant };
