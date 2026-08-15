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
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    deliveryRadiusKm: {
      type: Number,
      default: 5,
      min: 1,
      max: 50,
    },
    baseDeliveryFee: {
      type: Number,
      default: 40,
      min: 0,
      max: 1000,
    },
    freeDeliveryAbove: {
      type: Number,
      default: 500,
      min: 0,
      max: 100000,
    },
    isSelfDelivery: {
      type: Boolean,
      default: true,
    },
    extraTiers: {
      type: [
        {
          fromKm: { type: Number, required: true, min: 0 },
          toKm: { type: Number, required: true, min: 0 },
          extraCharge: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
    // ── Subscription mirror ────────────────────────────────────────────────
    // RestaurantSubscription is the source of truth. These denormalised fields
    // are kept in sync so list views can filter and sort without a join.
    activeSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantSubscription",
      default: null,
      index: true,
    },
    // Plan slug. Free-form because plans are admin-created.
    subscriptionPlan: {
      type: String,
      default: "FREE_BASIC",
      trim: true,
      index: true,
    },
    subscriptionPlanName: {
      type: String,
      default: "Free Basic",
      trim: true,
    },
    planStatus: {
      type: String,
      enum: [
        "ACTIVE",
        "PAUSED",
        "PAST_DUE",
        "CANCELLED",
        "EXPIRED",
        "PENDING_PAYMENT",
        "SUPERSEDED",
      ],
      default: "ACTIVE",
      index: true,
    },
    planActivatedAt: {
      type: Date,
      default: Date.now,
    },
    planChangedAt: {
      type: Date,
      default: Date.now,
    },
    planRenewalDate: {
      type: Date,
      default: null,
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
