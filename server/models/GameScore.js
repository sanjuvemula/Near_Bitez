import mongoose from "mongoose";

const gamePlaySchema = new mongoose.Schema(
  {
    game: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    playedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const gameScoreSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    totalScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    gamesPlayed: {
      type: [gamePlaySchema],
      default: [],
    },
    rank: {
      type: Number,
      default: null,
      index: true,
    },
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

gameScoreSchema.index({ userId: 1, date: 1 }, { unique: true });
gameScoreSchema.index({ date: 1, archived: 1, totalScore: -1, updatedAt: 1 });

export default mongoose.model("GameScore", gameScoreSchema);
