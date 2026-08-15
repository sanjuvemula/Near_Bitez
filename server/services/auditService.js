import AuditLog from "../models/AuditLog.js";

/**
 * Records an admin action with its before/after values.
 *
 * Audit writes never block the operation they describe: a logging failure is
 * reported to the console and swallowed so admin actions still succeed.
 */
export const recordAudit = async ({
  admin = null,
  action,
  restaurant = null,
  plan = null,
  subscription = null,
  previousValue = null,
  newValue = null,
  description = "",
} = {}) => {
  if (!action) return null;

  try {
    return await AuditLog.create({
      admin: admin?._id || admin || null,
      adminEmail: admin?.email || "",
      action,
      restaurant,
      plan,
      subscription,
      previousValue,
      newValue,
      description: String(description || "").trim().slice(0, 400),
    });
  } catch (error) {
    console.error(`Audit log failed for ${action}:`, error.message);
    return null;
  }
};

export const getAuditTrail = async ({ restaurant, plan, action, limit = 50 } = {}) => {
  const query = {};
  if (restaurant) query.restaurant = restaurant;
  if (plan) query.plan = plan;
  if (action) query.action = action;

  return AuditLog.find(query)
    .populate("admin", "name email")
    .sort({ createdAt: -1 })
    .limit(Math.min(200, Math.max(1, Number(limit) || 50)));
};
