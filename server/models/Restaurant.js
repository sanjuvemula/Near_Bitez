import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Restaurant name is required"],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    address: {
      type: String,
      required: [true, "Restaurant address is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Restaurant category is required"],
      trim: true,
    },
    cuisineType: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    imagePublicId: {
      type: String,
      trim: true,
      default: "",
    },
    deliveryTime: {
      type: Number,
      default: 30,
      min: 5,
      max: 120,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    isVegOnly: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Tiffin fields ──────────────────────────────────────────────────────
    tiffinAvailable: {
      type: Boolean,
      default: false,
    },
    tiffinPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    tiffinMealType: {
      type: String,
      enum: ["veg", "non-veg", "both"],
      default: "veg",
    },
    tiffinDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    tiffinDeliveryType: {
      type: String,
      enum: ["delivery", "pickup", "both"],
      default: "delivery",
    },
    tiffinMealsPerDay: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    tiffinWeeklyMenu: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        Monday: "",
        Tuesday: "",
        Wednesday: "",
        Thursday: "",
        Friday: "",
        Saturday: "",
        Sunday: "",
      },
    },
    // ── NEW: Plan duration ─────────────────────────────────────────────────
    tiffinDuration: {
      type: String,
      enum: ["weekly", "10days", "15days", "monthly"],
      default: "monthly",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Restaurant", restaurantSchema);