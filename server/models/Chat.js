import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["customer", "vendor", "admin"],
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    read: {
      type: Boolean,
      default: false,
    },
    flagged: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // "restaurant" = customer ↔ vendor chat
    // "support"    = customer or vendor ↔ admin direct chat
    chatType: {
      type: String,
      enum: ["restaurant", "support"],
      default: "restaurant",
    },
    // Who started a support chat and their role
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    initiatedByRole: {
      type: String,
      enum: ["customer", "vendor", null],
      default: null,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    messages: [messageSchema],
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    customerUnread: { type: Number, default: 0 },
    vendorUnread:   { type: Number, default: 0 },
    adminUnread:    { type: Number, default: 0 },

    // TTL field — MongoDB auto-deletes 48h after last message
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// Indexes
chatSchema.index({ customer: 1, restaurant: 1 });
chatSchema.index({ vendor: 1 });
chatSchema.index({ chatType: 1, initiatedBy: 1 });
// TTL index — MongoDB deletes document when Date.now() > expiresAt
chatSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// FIX: Mongoose v7+ me pre("save") async hota hai
// next parameter nahi chahiye — sirf async/await use karo
chatSchema.pre("save", async function () {
  if (this.isModified("lastMessageAt") || this.isNew) {
    this.expiresAt = new Date(
      this.lastMessageAt.getTime() + 48 * 60 * 60 * 1000
    );
  }
});

export default mongoose.model("Chat", chatSchema);