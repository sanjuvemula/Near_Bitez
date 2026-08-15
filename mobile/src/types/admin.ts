import type { MenuItem, Order, OrderStatus, Restaurant, User } from "@/types/models";

/**
 * Admin-side shapes.
 *
 * Every interface here was checked against a live response from the running
 * backend rather than inferred from the controller source, so optional markers
 * reflect what the API actually omits.
 */

/* ── Enums mirrored from the server models ──────────────────────────────── */

export const ORDER_STATUSES: OrderStatus[] = [
  "SCHEDULED",
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED",
];

/** server/models/PayoutRequest.js */
export const PAYOUT_STATUSES = ["REQUESTED", "APPROVED", "PAID", "REJECTED"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

/** server/models/TiffinSubscription.js */
export const TIFFIN_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "EXPIRING_SOON",
  "EXPIRED",
  "CANCELLED",
] as const;
export type TiffinStatus = (typeof TIFFIN_STATUSES)[number];

/** server/models/Feedback.js */
export const FEEDBACK_STATUSES = [
  "OPEN",
  "IN_REVIEW",
  "PLANNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type FeedbackPriority = (typeof FEEDBACK_PRIORITIES)[number];

/**
 * Statuses the *admin* subscription endpoints accept.
 *
 * The Restaurant model stores a wider set (PAST_DUE, EXPIRED, PENDING_PAYMENT)
 * which the system sets itself; `updateRestaurantSubscription` only lets an
 * admin write these three, so the UI must not offer the others.
 */
export const SUBSCRIPTION_ACTIONS = ["ACTIVE", "PAUSED", "CANCELLED"] as const;
export type SubscriptionAction = (typeof SUBSCRIPTION_ACTIONS)[number];

/** Full set the restaurant document can hold, used for filtering only. */
export const PLAN_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "PAST_DUE",
  "CANCELLED",
  "EXPIRED",
  "PENDING_PAYMENT",
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

/* ── Dashboard stats: GET /admin/stats ──────────────────────────────────── */

export interface AdminStats {
  users: {
    total: number;
    customers: number;
    vendors: number;
    admins: number;
    newThisWeek: number;
  };
  restaurants: { total: number; active: number; paused: number; tiffinProviders: number };
  menu: { total: number; active: number; paused: number };
  orders: { total: number; delivered: number; pending: number; newThisWeek: number };
  revenue: { total: number };
  growth: { newUsersThisWeek: number; newOrdersThisWeek: number };
  marketing: { activeCoupons: number; gameRewards: number };
  finance: {
    pendingPayouts: number;
    openPayoutAmount: number;
    payoutsByStatus: { status: PayoutStatus; count: number; amount: number }[];
  };
  tiffin: { activeSubscriptions: number };
  analytics: {
    orderStatuses: { status: OrderStatus; count: number; revenue: number }[];
    /** Trailing 7 days, oldest first, in Asia/Kolkata. Last row is today. */
    daily: { date: string; orders: number; revenue: number }[];
    topRestaurants: {
      _id: string;
      name?: string;
      category?: string;
      isActive?: boolean;
      orders: number;
      revenue: number;
    }[];
  };
  recent: {
    orders: AdminOrder[];
    users: AdminUser[];
    payouts: Payout[];
  };
}

/* ── Users: GET /admin/users ────────────────────────────────────────────── */

export interface AdminUser extends User {
  loyaltyPoints?: number;
  loyaltyTier?: string;
  totalPointsEarned?: number;
  nearCoins?: number;
  currentStreak?: number;
  referralCode?: string;
  createdAt?: string;
  updatedAt?: string;
  /** True when the email sits in the ADMIN_EMAILS allowlist — role is locked. */
  isSystemAdmin?: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paged<T> {
  data: T[];
  total: number;
  pagination?: Pagination;
}

/* ── Restaurants: GET /admin/restaurants ────────────────────────────────── */

export interface AdminRestaurant extends Restaurant {
  vendor?: { _id: string; name?: string; email?: string; phone?: string } | string;
  orderCount: number;
  totalRevenue: number;
  menuCount: number;
  activeMenuCount: number;
  activeTiffinSubscriptions: number;

  subscriptionPlan?: string | null;
  subscriptionPlanName?: string;
  planStatus?: PlanStatus;
  planRenewalDate?: string | null;
  planChangedAt?: string | null;
  planActivatedAt?: string | null;

  deliveryRadiusKm?: number;
  isSelfDelivery?: boolean;
  tiffinDeliveryType?: string;
  tiffinMealsPerDay?: number;
  tiffinWeeklyMenu?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

/* ── Orders: GET /admin/orders ──────────────────────────────────────────── */

export interface AdminOrder extends Omit<Order, "customer" | "restaurant"> {
  customer?: { _id: string; name?: string; email?: string; phone?: string } | string | null;
  restaurant?: { _id: string; name?: string; category?: string; vendor?: string } | string | null;

  /** Commission snapshot written at order time — never recomputed on device. */
  commissionPercent?: number;
  commissionAmount?: number;
  commissionBase?: number;
  vendorNetAmount?: number;
  vendorPlanName?: string;
  vendorPlanMonthlyFee?: number;
  freeOrderApplied?: boolean;
  freeOrderSequence?: number;
  freeOrdersRemainingAfter?: number;
  quotaUsedAtOrder?: number;
  quotaTotalAtOrder?: number;
  subscriptionPlanName?: string;
  updatedAt?: string;
}

/* ── Subscription plans: GET /admin/subscriptions/plans ─────────────────── */

export interface AdminPlan {
  _id: string;
  name: string;
  slug: string;
  price: number;
  freeOrderQuota: number;
  commissionRate: number;
  description: string;
  features: string[];
  badge: string;
  isActive: boolean;
  isFallback: boolean;
  isArchived: boolean;
  displayOrder: number;
  billingCycleDays: number;
  createdAt?: string;
  updatedAt?: string;
  /** Present on the list endpoint only. */
  restaurantCount?: number;
  activeCount?: number;
  monthlyRevenue?: number;
}

export interface PlanPayload {
  name: string;
  price: number;
  freeOrderQuota: number;
  commissionRate: number;
  description?: string;
  features?: string[];
  badge?: string;
  billingCycleDays?: number;
  isActive?: boolean;
}

/* ── Restaurant subscription state ──────────────────────────────────────── */

export interface SubscriptionQuota {
  base: number;
  bonus: number;
  total: number;
  used: number;
  remaining: number;
  percent: number;
  state: string;
}

export interface SubscriptionCycle {
  id: string;
  start: string | null;
  end: string | null;
  daysRemaining: number;
}

export interface SubscriptionUsageState {
  orders: number;
  freeOrders: number;
  commissionableOrders: number;
  commissionCharged: number;
  grossRevenue: number;
  commissionBase: number;
  savedThisCycle: number;
  projectedOrders: number;
  estimatedCommission: number;
}

/** Returned by every mutation on /admin/subscriptions/restaurants/:id/*. */
export interface AdminSubscriptionState {
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
  plan: {
    _id: string;
    name: string;
    slug: string;
    price: number;
    badge?: string;
    features?: string[];
    commissionRate: number;
    planCommissionRate?: number;
    billingCycleDays?: number;
  } | null;
  quota: SubscriptionQuota;
  cycle: SubscriptionCycle;
  expiry: {
    expiresAt: string | null;
    daysUntilExpiry: number | null;
    expiringSoon: boolean;
    expired: boolean;
  };
  usage: SubscriptionUsageState;
  cycleHistory: unknown[];
}

export interface SubscriptionHistoryRow {
  _id: string;
  planName: string;
  price: number;
  commissionRate: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  usedFreeOrders: number;
  freeOrderQuota: number;
  bonusFreeOrders: number;
  paymentStatus: string;
  source: string;
  assignedBy: string | null;
  createdAt: string;
}

export interface AuditEntry {
  _id: string;
  action: string;
  description: string;
  admin: string;
  restaurant?: string;
  previousValue?: unknown;
  newValue?: unknown;
  createdAt: string;
}

export interface RestaurantSubscriptionDetail {
  restaurant: AdminRestaurant;
  state: AdminSubscriptionState;
  /**
   * The vendor-facing payload, included for parity with what the restaurant
   * sees. Its `current` uses the vendor field names (`monthlyFee`,
   * `commissionPercent`), which differ from `AdminPlan` — read plan terms from
   * `state.plan` or the plans endpoint instead.
   */
  plan: {
    current: VendorFacingPlan | null;
    options: VendorFacingPlan[];
    usage: Record<string, number | string | boolean | null>;
  } | null;
  history: SubscriptionHistoryRow[];
  audit: AuditEntry[];
}

/** Shape produced by services/vendorPlanService.js — not the admin plan shape. */
export interface VendorFacingPlan {
  _id: string;
  key: string;
  slug: string;
  name: string;
  monthlyFee: number;
  price: number;
  commissionPercent: number;
  commissionRate: number;
  freeOrderQuota: number;
  badge?: string;
  features?: string[];
  billingCycleDays?: number;
  status?: string;
  paymentStatus?: string;
  renewalDate?: string | null;
  hasCustomCommission?: boolean;
}

/** GET /admin/subscriptions — the per-restaurant monetization list. */
export interface SubscriptionRow {
  restaurant: AdminRestaurant;
  subscription: {
    current: { key?: string; name?: string; price?: number; commissionRate?: number } | null;
    usage?: Record<string, number>;
    state?: Partial<AdminSubscriptionState>;
  } | null;
}

export interface SubscriptionSummaryRow {
  _id: string;
  key: string;
  name: string;
  monthlyFee: number;
  commissionPercent: number;
  freeOrderQuota: number;
  isActive: boolean;
  count: number;
}

/* ── Subscription analytics ─────────────────────────────────────────────── */

export interface SubscriptionAnalytics {
  range: { from: string; to: string };
  totals: {
    activeSubscriptions: number;
    totalSubscriptions: number;
    monthlyRecurringRevenue: number;
    commissionRevenue: number;
    totalRevenue: number;
    expiredSubscriptions: number;
    pausedSubscriptions: number;
    restaurantsNearQuota: number;
    expiringSoon: number;
  };
  mostPopularPlan: { name: string; count: number } | null;
  planRows: {
    _id: string;
    name: string;
    slug: string;
    price: number;
    commissionRate: number;
    freeOrderQuota: number;
    isActive: boolean;
    badge: string;
    restaurantCount: number;
    activeCount: number;
    monthlyRevenue: number;
    commissionRevenue: number;
    orders: number;
    freeOrders: number;
    grossOrderValue: number;
  }[];
  nearQuota: {
    restaurantId: string;
    restaurantName: string;
    planName: string;
    used: number;
    total: number;
    percent: number;
  }[];
  expiringSoon: {
    restaurantId: string;
    restaurantName: string;
    planName: string;
    endDate: string;
    daysRemaining: number;
  }[];
  planChanges: { plan: string; count: number }[];
}

/* ── Finance ────────────────────────────────────────────────────────────── */

export interface Payout {
  _id: string;
  vendor?: { _id: string; name?: string; email?: string; phone?: string } | string;
  restaurant?: { _id: string; name?: string } | string;
  amount: number;
  status: PayoutStatus;
  note?: string;
  resolvedBy?: { _id: string; name?: string; email?: string } | string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/* ── Tiffin ─────────────────────────────────────────────────────────────── */

export interface AdminTiffinProvider extends AdminRestaurant {
  activeSubscriptions: number;
}

export interface AdminTiffinSubscription {
  _id: string;
  customer?: { _id: string; name?: string; email?: string; phone?: string } | string;
  vendor?: { _id: string; name?: string; email?: string } | string;
  restaurant?: { _id: string; name?: string; category?: string } | string;
  planName: string;
  price: number;
  status: TiffinStatus;
  startDate?: string;
  endDate?: string | null;
  nextDelivery?: string | null;
  mealType?: string;
  isVeg?: boolean;
  createdAt?: string;
}

/* ── Settings ───────────────────────────────────────────────────────────── */

export interface BusinessSettings {
  _id?: string;
  key?: string;
  commissionPercent: number;
  platformFee: number;
  gstPercent: number;
  deliveryBaseFee: number;
  freeDeliveryAbove: number;
  minPayoutAmount: number;
  payoutHoldHours: number;
  maxScheduleDays: number;
  allowScheduledOrders: boolean;
  referralBonusPoints: number;
  loyaltyPointsPerRupee: number;
  maintenanceMode: boolean;
  customerSupportEnabled: boolean;
  banners: { title: string; message: string; route: string; active: boolean; priority: number }[];
  rewardRules: {
    dailyLoginCoins: number;
    gameClaimDailyLimit: number;
    orderCoinPercent: number;
  };
  updatedAt?: string;
}

/* ── Feedback ───────────────────────────────────────────────────────────── */

export interface AdminFeedback {
  _id: string;
  user?: { _id: string; name?: string; email?: string; role?: string } | string;
  userRole?: string;
  type: string;
  title: string;
  message: string;
  restaurant?: { _id: string; name?: string } | string | null;
  screenshotUrl?: string | null;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
}

/* ── Chats ──────────────────────────────────────────────────────────────── */

export interface AdminChat {
  _id: string;
  chatType?: "restaurant" | "support" | string;
  customer?: { _id: string; name?: string; email?: string } | null;
  vendor?: { _id: string; name?: string; email?: string } | null;
  restaurant?: { _id: string; name?: string } | null;
  initiatedBy?: { _id: string; name?: string; email?: string; role?: string } | null;
  initiatedByRole?: string;
  messages?: {
    _id?: string;
    sender?: string;
    senderId?: string;
    text?: string;
    createdAt?: string;
  }[];
  lastMessage?: string;
  lastMessageAt?: string;
  adminUnread?: number;
  customerUnread?: number;
  vendorUnread?: number;
}

/* ── Promos ─────────────────────────────────────────────────────────────── */

export interface AdminPromo {
  _id: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  value: number;
  minOrderValue?: number;
  maxDiscount?: number | null;
  validUntil?: string;
  usageLimit?: number | null;
  usedCount?: number;
  isActive: boolean;
  isGameReward?: boolean;
  restaurant?: { _id: string; name?: string; category?: string } | string | null;
  vendor?: { _id: string; name?: string; email?: string } | string | null;
}

export type { MenuItem, Order, OrderStatus, Restaurant, User };
