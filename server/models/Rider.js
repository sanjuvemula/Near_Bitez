import mongoose from "mongoose";

const riderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    vehicleType: {
      type: String,
      enum: ["BIKE", "SCOOTER", "CYCLE", "EV"],
      default: "BIKE",
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },
    currentLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
    activeOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    earningsToday: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDeliveries: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true }
);

riderSchema.index({ isOnline: 1, activeOrder: 1 });

export default mongoose.model("Rider", riderSchema);
