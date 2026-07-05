import Feedback, {
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
} from "../models/Feedback.js";
import Restaurant from "../models/Restaurant.js";
import { cloudinary } from "../middleware/upload.js";

const asCleanString = (value, maxLength = 500) =>
  String(value ?? "").trim().slice(0, maxLength);

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const rollbackUpload = async (file) => {
  if (!file?.filename) return;

  try {
    await cloudinary.uploader.destroy(file.filename);
  } catch {
    // Upload cleanup should never hide the original validation error.
  }
};

const normalizeEnum = (value, allowed, fallback = "") => {
  const normalized = asCleanString(value, 40).toUpperCase();
  return allowed.includes(normalized) ? normalized : fallback;
};

const serializeFeedback = (feedback) => feedback;

export const createFeedback = async (req, res) => {
  try {
    const type = normalizeEnum(req.body.type, FEEDBACK_TYPES);
    const title = asCleanString(req.body.title, 120);
    const message = asCleanString(req.body.message, 2000);
    const restaurantId = asCleanString(req.body.restaurantId || req.body.restaurant, 80);

    if (!type) {
      await rollbackUpload(req.file);
      return res.status(400).json({ success: false, message: "Choose a valid feedback type" });
    }

    if (!title || !message) {
      await rollbackUpload(req.file);
      return res.status(400).json({ success: false, message: "Title and details are required" });
    }

    let restaurant = null;
    if (restaurantId) {
      restaurant = await Restaurant.findById(restaurantId).select("_id");
      if (!restaurant) {
        await rollbackUpload(req.file);
        return res.status(404).json({ success: false, message: "Restaurant not found" });
      }
    }

    const feedback = await Feedback.create({
      user: req.user._id,
      userRole: req.user.role,
      type,
      title,
      message,
      restaurant: restaurant?._id || null,
      screenshotUrl: req.file?.path || "",
      screenshotPublicId: req.file?.filename || "",
      statusHistory: [{ status: "OPEN", changedBy: req.user._id, changedAt: new Date() }],
    });

    await feedback.populate("restaurant", "name category imageUrl");

    const io = req.app.get("io");
    if (io) {
      io.to("admin").emit("feedback:new", {
        feedbackId: feedback._id,
        type: feedback.type,
        title: feedback.title,
        createdAt: feedback.createdAt,
      });
    }

    res.status(201).json({
      success: true,
      message: "Feedback sent",
      data: serializeFeedback(feedback),
    });
  } catch (error) {
    await rollbackUpload(req.file);
    res.status(400).json({ success: false, message: error.message || "Unable to send feedback" });
  }
};

export const getMyFeedback = async (req, res) => {
  const feedback = await Feedback.find({ user: req.user._id })
    .populate("restaurant", "name category imageUrl")
    .sort({ updatedAt: -1 })
    .limit(100);

  res.status(200).json({ success: true, data: feedback.map(serializeFeedback) });
};

export const getMyFeedbackById = async (req, res) => {
  const feedback = await Feedback.findOne({ _id: req.params.id, user: req.user._id })
    .populate("restaurant", "name category imageUrl")
    .populate("statusHistory.changedBy", "name role");

  if (!feedback) {
    return res.status(404).json({ success: false, message: "Feedback not found" });
  }

  res.status(200).json({ success: true, data: serializeFeedback(feedback) });
};

export const closeMyFeedback = async (req, res) => {
  const feedback = await Feedback.findOne({ _id: req.params.id, user: req.user._id });

  if (!feedback) {
    return res.status(404).json({ success: false, message: "Feedback not found" });
  }

  feedback.status = "CLOSED";
  feedback.statusHistory.push({
    status: "CLOSED",
    note: asCleanString(req.body.note, 500),
    changedBy: req.user._id,
    changedAt: new Date(),
  });
  await feedback.save();
  await feedback.populate("restaurant", "name category imageUrl");

  res.status(200).json({ success: true, data: serializeFeedback(feedback) });
};

export const getAdminFeedback = async (req, res) => {
  try {
    const { status = "all", type = "all", priority = "all", search = "", page = 1, limit = 75 } = req.query;
    const query = {};

    if (status !== "all") {
      const normalizedStatus = normalizeEnum(status, FEEDBACK_STATUSES);
      if (!normalizedStatus) return res.status(400).json({ success: false, message: "Invalid status filter" });
      query.status = normalizedStatus;
    }

    if (type !== "all") {
      const normalizedType = normalizeEnum(type, FEEDBACK_TYPES);
      if (!normalizedType) return res.status(400).json({ success: false, message: "Invalid type filter" });
      query.type = normalizedType;
    }

    if (priority !== "all") {
      const normalizedPriority = normalizeEnum(priority, FEEDBACK_PRIORITIES);
      if (!normalizedPriority) return res.status(400).json({ success: false, message: "Invalid priority filter" });
      query.priority = normalizedPriority;
    }

    const safeSearch = asCleanString(search, 100);
    if (safeSearch) {
      const pattern = escapeRegex(safeSearch);
      query.$or = [
        { title: { $regex: pattern, $options: "i" } },
        { message: { $regex: pattern, $options: "i" } },
      ];
    }

    const safeLimit = Math.min(150, Math.max(1, Number(limit) || 75));
    const safePage = Math.max(1, Number(page) || 1);

    const [items, total, statusSummary, typeSummary] = await Promise.all([
      Feedback.find(query)
        .populate("user", "name email role phone")
        .populate("restaurant", "name category imageUrl")
        .populate("assignedTo", "name email")
        .sort({ updatedAt: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit),
      Feedback.countDocuments(query),
      Feedback.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Feedback.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    res.status(200).json({
      success: true,
      data: items.map(serializeFeedback),
      total,
      summary: {
        statuses: FEEDBACK_STATUSES.map((key) => ({
          key,
          count: statusSummary.find((item) => item._id === key)?.count || 0,
        })),
        types: FEEDBACK_TYPES.map((key) => ({
          key,
          count: typeSummary.find((item) => item._id === key)?.count || 0,
        })),
      },
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAdminFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, message: "Feedback not found" });

    const nextStatus =
      req.body.status !== undefined
        ? normalizeEnum(req.body.status, FEEDBACK_STATUSES)
        : feedback.status;
    const nextPriority =
      req.body.priority !== undefined
        ? normalizeEnum(req.body.priority, FEEDBACK_PRIORITIES)
        : feedback.priority;

    if (!nextStatus) return res.status(400).json({ success: false, message: "Invalid status" });
    if (!nextPriority) return res.status(400).json({ success: false, message: "Invalid priority" });

    const note = asCleanString(req.body.adminNote ?? req.body.note ?? feedback.adminNote, 1000);

    if (feedback.status !== nextStatus) {
      feedback.statusHistory.push({
        status: nextStatus,
        note,
        changedBy: req.user._id,
        changedAt: new Date(),
      });
    }

    feedback.status = nextStatus;
    feedback.priority = nextPriority;
    feedback.adminNote = note;
    feedback.assignedTo = req.body.assignedTo || feedback.assignedTo || req.user._id;
    feedback.resolvedAt = ["RESOLVED", "CLOSED"].includes(nextStatus) ? feedback.resolvedAt || new Date() : null;

    await feedback.save();
    await feedback.populate("user", "name email role phone");
    await feedback.populate("restaurant", "name category imageUrl");
    await feedback.populate("assignedTo", "name email");

    res.status(200).json({ success: true, data: serializeFeedback(feedback) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to update feedback" });
  }
};

export const deleteAdminFeedback = async (req, res) => {
  const feedback = await Feedback.findByIdAndDelete(req.params.id);
  if (!feedback) return res.status(404).json({ success: false, message: "Feedback not found" });

  if (feedback.screenshotPublicId) {
    try {
      await cloudinary.uploader.destroy(feedback.screenshotPublicId);
    } catch {
      // Deleting the ticket should still complete if remote cleanup fails.
    }
  }

  res.status(200).json({ success: true, message: "Feedback deleted" });
};
