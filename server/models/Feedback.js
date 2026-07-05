import mongoose from "mongoose";

export const FEEDBACK_TYPES = [
  "FEATURE_REQUEST",
  "BUG_REPORT",
  "COMPLAINT",
  "SUGGESTION",
  "RESTAURANT_ISSUE",
];

export const FEEDBACK_STATUSES = [
  "OPEN",
  "IN_REVIEW",
  "PLANNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

export const FEEDBACK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

const feedbackStatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: FEEDBACK_STATUSES,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      enum: ["customer", "vendor", "admin"],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: FEEDBACK_TYPES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null,
      index: true,
    },
    screenshotUrl: {
      type: String,
      trim: true,
      default: "",
    },
    screenshotPublicId: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: FEEDBACK_STATUSES,
      default: "OPEN",
      index: true,
    },
    priority: {
      type: String,
      enum: FEEDBACK_PRIORITIES,
      default: "NORMAL",
      index: true,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    statusHistory: {
      type: [feedbackStatusHistorySchema],
      default: () => [{ status: "OPEN", changedAt: new Date() }],
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ type: 1, status: 1, priority: 1 });

export default mongoose.model("Feedback", feedbackSchema);
