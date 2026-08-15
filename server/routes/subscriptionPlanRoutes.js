import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  adjustQuota,
  assignPlan,
  changeStatus,
  createPlan,
  deletePlan,
  duplicatePlan,
  extend,
  getAnalytics,
  getAuditLog,
  getPlanById,
  getRestaurantSubscriptionDetail,
  listPlans,
  overrideCommission,
  recordPayment,
  reorderPlans,
  resetQuota,
  togglePlanStatus,
  updatePlan,
} from "../controllers/admin/subscriptionController.js";

const router = express.Router();

// Plan management and every subscription mutation is admin-only. Commission,
// quota and pricing can never be changed from a vendor or customer session.
router.use(protect, authorize("admin"));

// ── Analytics and audit ──────────────────────────────────────────────────────
router.get("/analytics", getAnalytics);
router.get("/audit", getAuditLog);

// ── Plan CRUD ────────────────────────────────────────────────────────────────
router.get("/plans", listPlans);
router.post("/plans", createPlan);
router.patch("/plans/reorder", reorderPlans);
router.get("/plans/:id", getPlanById);
router.put("/plans/:id", updatePlan);
router.patch("/plans/:id/status", togglePlanStatus);
router.post("/plans/:id/duplicate", duplicatePlan);
router.delete("/plans/:id", deletePlan);

// ── Per-restaurant subscription management ───────────────────────────────────
router.get("/restaurants/:restaurantId", getRestaurantSubscriptionDetail);
router.post("/restaurants/:restaurantId/assign", assignPlan);
router.patch("/restaurants/:restaurantId/status", changeStatus);
router.patch("/restaurants/:restaurantId/extend", extend);
router.patch("/restaurants/:restaurantId/quota", adjustQuota);
router.post("/restaurants/:restaurantId/quota/reset", resetQuota);
router.patch("/restaurants/:restaurantId/commission", overrideCommission);
router.post("/restaurants/:restaurantId/payment", recordPayment);

export default router;
