import type { BadgeTone } from "@/components";
import type {
  FeedbackPriority,
  FeedbackStatus,
  PayoutStatus,
  PlanStatus,
  TiffinStatus,
} from "@/types/admin";

/**
 * Presentation helpers for admin lists.
 *
 * Only labels and tones live here. Every value these describe is computed by
 * the backend — nothing in this file derives money, quota or permissions.
 */

/** Turns an ObjectId into something an admin can read aloud on a call. */
export const shortId = (id?: string | null): string =>
  id ? `#${String(id).slice(-6).toUpperCase()}` : "—";

/** Populated refs arrive as objects; unpopulated ones as a bare id string. */
export const refName = (
  ref: { name?: string } | string | null | undefined,
  fallback = "—"
): string => {
  if (!ref) return fallback;
  if (typeof ref === "string") return fallback;
  return ref.name?.trim() || fallback;
};

export const refId = (
  ref: { _id?: string } | string | null | undefined
): string | undefined => {
  if (!ref) return undefined;
  return typeof ref === "string" ? ref : ref._id;
};

export const titleCase = (value?: string | null): string => {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const PAYOUT_TONE: Record<PayoutStatus, BadgeTone> = {
  REQUESTED: "warning",
  APPROVED: "info",
  PAID: "success",
  REJECTED: "error",
};

/**
 * What an admin may do next with a payout request.
 *
 * Mirrors the server's `PAYOUT_STATUSES` enum while forbidding transitions that
 * make no sense operationally — a rejected request is terminal, and money that
 * is already marked paid cannot be un-paid from here.
 */
export const PAYOUT_NEXT: Record<PayoutStatus, PayoutStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PAID", "REJECTED"],
  PAID: [],
  REJECTED: [],
};

export const PLAN_STATUS_TONE: Record<PlanStatus, BadgeTone> = {
  ACTIVE: "success",
  PAUSED: "warning",
  PAST_DUE: "error",
  CANCELLED: "neutral",
  EXPIRED: "error",
  PENDING_PAYMENT: "warning",
};

export const TIFFIN_TONE: Record<TiffinStatus, BadgeTone> = {
  ACTIVE: "success",
  PAUSED: "warning",
  EXPIRING_SOON: "warning",
  EXPIRED: "error",
  CANCELLED: "neutral",
};

export const FEEDBACK_TONE: Record<FeedbackStatus, BadgeTone> = {
  OPEN: "error",
  IN_REVIEW: "warning",
  PLANNED: "info",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export const PRIORITY_TONE: Record<FeedbackPriority, BadgeTone> = {
  LOW: "neutral",
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "error",
};

export const ROLE_TONE: Record<string, BadgeTone> = {
  customer: "info",
  vendor: "primary",
  admin: "error",
};

/** Short weekday for the trailing-7-day axis, e.g. "2026-08-14" → "Fri". */
export const dayLabel = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 3);
};
