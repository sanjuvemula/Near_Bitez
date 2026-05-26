import GameScore from "../models/GameScore.js";
import Order from "../models/Order.js";
import Promo from "../models/Promo.js";
import Restaurant from "../models/Restaurant.js";
import User, { getTierFromPoints } from "../models/User.js";

export const GAME_CONFIGS = [
  { key: "food-dice", title: "Food Dice", difficulty: "Easy" },
  { key: "spin-wheel", title: "Spin Wheel", difficulty: "Easy" },
  { key: "scratch-card", title: "Scratch Card", difficulty: "Easy" },
  { key: "memory-match", title: "Memory Match", difficulty: "Medium" },
  { key: "tap-the-food", title: "Tap The Food", difficulty: "Hard" },
  { key: "food-quiz", title: "Food Quiz", difficulty: "Medium" },
];

const BADGE_THRESHOLDS = [
  { type: "GAME_ROOKIE", name: "Game Rookie", minScore: 100, points: 10 },
  { type: "GAME_HOT_STREAK", name: "Hot Streak", minScore: 250, points: 25 },
  { type: "GAME_CHAMPION", name: "Daily Champion", minScore: 500, points: 50 },
];

const leaderboardCache = new Map();
const quizCache = new Map();

const getIstDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const asSafeScore = (value) => {
  const score = Math.round(Number(value));
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(score, 100000));
};

const safeGameName = (value) =>
  String(value || "Game")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80) || "Game";

const initialsFor = (name = "Foodie") =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "NB";

const serializeScoreRow = (score, currentUserId = null) => {
  const user = score.userId || {};
  const id = String(user._id || score.userId || "");
  const name = user.name || "Foodie";

  return {
    _id: score._id,
    userId: id,
    name,
    initials: initialsFor(name),
    score: score.totalScore || 0,
    totalScore: score.totalScore || 0,
    bestScore: score.totalScore || 0,
    rank: score.rank || null,
    gamesPlayed: score.gamesPlayed || [],
    plays: score.gamesPlayed?.length || 0,
    badge: user.badges?.find((badge) => badge.date === score.date)?.name || null,
    isCurrentUser: currentUserId ? id === String(currentUserId) : false,
  };
};

const recalculateRanks = async (date) => {
  const rows = await GameScore.find({ date, archived: false })
    .sort({ totalScore: -1, updatedAt: 1 })
    .select("_id")
    .lean();

  if (!rows.length) return;

  await GameScore.bulkWrite(
    rows.map((row, index) => ({
      updateOne: {
        filter: { _id: row._id },
        update: { $set: { rank: index + 1 } },
      },
    }))
  );
};

const buildLeaderboardPayload = async ({ date = getIstDate(), currentUserId = null, limit = 20 } = {}) => {
  const [leaders, currentUserScore] = await Promise.all([
    GameScore.find({ date, archived: false })
      .sort({ totalScore: -1, updatedAt: 1 })
      .limit(limit)
      .populate("userId", "name badges")
      .lean(),
    currentUserId
      ? GameScore.findOne({ date, userId: currentUserId, archived: false })
          .populate("userId", "name badges")
          .lean()
      : null,
  ]);

  return {
    date,
    leaderboard: leaders.map((score) => serializeScoreRow(score, currentUserId)),
    currentUser: currentUserScore ? serializeScoreRow(currentUserScore, currentUserId) : null,
  };
};

const emitLeaderboard = async (req, date, currentUserId = null) => {
  const io = req.app.get("io");
  if (!io) return null;

  const payload = await buildLeaderboardPayload({ date, currentUserId, limit: 20 });
  io.to("games:today").emit("leaderboard:update", payload);
  if (currentUserId) {
    io.to(`customer_${currentUserId}`).emit("leaderboard:update", payload);
  }
  return payload;
};

const maybeAwardBadges = async ({ req, userId, previousTotal, nextTotal, date }) => {
  const earned = BADGE_THRESHOLDS.filter(
    (badge) => previousTotal < badge.minScore && nextTotal >= badge.minScore
  );
  if (!earned.length) return [];

  const user = await User.findById(userId).select("+pointsHistory");
  if (!user) return [];

  const newBadges = earned.filter(
    (badge) => !(user.badges || []).some((item) => item.type === badge.type && item.date === date)
  );
  if (!newBadges.length) return [];

  for (const badge of newBadges) {
    user.badges.push({
      type: badge.type,
      name: badge.name,
      date,
      pointsAwarded: badge.points,
      earnedAt: new Date(),
    });
    user.loyaltyPoints += badge.points;
    user.totalPointsEarned += badge.points;
    user.pointsHistory.push({
      type: "EARNED",
      points: badge.points,
      description: `${badge.name} gaming badge`,
    });
  }
  user.loyaltyTier = getTierFromPoints(user.loyaltyPoints);
  await user.save();

  const io = req.app.get("io");
  if (io) {
    for (const badge of newBadges) {
      io.to(`customer_${userId}`).emit("badge:earned", {
        badge: badge.name,
        type: badge.type,
        points: badge.points,
      });
    }
  }

  return newBadges;
};

export const addOrUpdateScore = async (req, res) => {
  try {
    const points = asSafeScore(req.body.points ?? req.body.score);
    if (points === null) {
      return res.status(400).json({ success: false, message: "points is required" });
    }

    const game = safeGameName(req.body.gameName || req.body.game || req.body.gameKey);
    const date = getIstDate();
    const previous = await GameScore.findOne({ userId: req.user._id, date });
    const previousTotal = previous?.totalScore || 0;

    const score = await GameScore.findOneAndUpdate(
      { userId: req.user._id, date },
      {
        $inc: { totalScore: points },
        $push: {
          gamesPlayed: {
            game,
            score: points,
            playedAt: new Date(),
          },
        },
        $setOnInsert: {
          userId: req.user._id,
          date,
          archived: false,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await recalculateRanks(date);
    const freshScore = await GameScore.findById(score._id).populate("userId", "name badges").lean();
    const badges = await maybeAwardBadges({
      req,
      userId: req.user._id,
      previousTotal,
      nextTotal: freshScore.totalScore,
      date,
    });
    const leaderboardPayload = await emitLeaderboard(req, date, req.user._id);

    res.status(200).json({
      success: true,
      data: {
        todayScore: freshScore.totalScore,
        myRank: freshScore.rank,
        score: serializeScoreRow(freshScore, req.user._id),
        badges,
        leaderboard: leaderboardPayload?.leaderboard || [],
        currentUser: leaderboardPayload?.currentUser || serializeScoreRow(freshScore, req.user._id),
      },
    });
  } catch (error) {
    console.error("addOrUpdateScore error:", error);
    res.status(500).json({ success: false, message: "Could not save game score" });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const date = getIstDate();
    const cacheKey = `leaderboard:${date}`;
    const cached = leaderboardCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(200).json({ success: true, data: cached.data });
    }

    const payload = await buildLeaderboardPayload({ date, currentUserId: req.user?._id, limit: 20 });
    leaderboardCache.set(cacheKey, {
      expiresAt: Date.now() + 30 * 1000,
      data: payload,
    });
    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    console.error("getLeaderboard error:", error);
    res.status(500).json({ success: false, message: "Could not load leaderboard" });
  }
};

export const getMyTodayScore = async (req, res) => {
  try {
    const date = getIstDate();
    const score = await GameScore.findOne({ userId: req.user._id, date, archived: false })
      .populate("userId", "name badges")
      .lean();
    const leaderboard = await buildLeaderboardPayload({ date, currentUserId: req.user._id, limit: 10 });

    res.status(200).json({
      success: true,
      data: {
        todayScore: score?.totalScore || 0,
        myRank: score?.rank || null,
        currentUser: score ? serializeScoreRow(score, req.user._id) : null,
        leaderboard: leaderboard.leaderboard,
      },
    });
  } catch (error) {
    console.error("getMyTodayScore error:", error);
    res.status(500).json({ success: false, message: "Could not load your game score" });
  }
};

const parseAnthropicQuestions = (rawText) => {
  const match = String(rawText || "").match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Anthropic response did not contain JSON");
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed) || parsed.length < 10) {
    throw new Error("Anthropic response did not contain 10 questions");
  }

  return parsed.slice(0, 10).map((item, index) => {
    const options = Array.isArray(item.options) ? item.options.slice(0, 4) : [];
    if (options.length !== 4) throw new Error("Each quiz question needs 4 options");
    const correctIndex = Number(item.correct_index);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      throw new Error("Invalid correct_index");
    }

    return {
      id: `q-${index + 1}`,
      question: String(item.question || "").slice(0, 220),
      options: options.map((option) => String(option).slice(0, 120)),
      correct_index: correctIndex,
      explanation: String(item.explanation || "").slice(0, 320),
    };
  });
};

const loadQuizForToday = async () => {
  const date = getIstDate();
  const cached = quizCache.get(date);
  if (cached && cached.expiresAt > Date.now()) return cached.questions;

  if (!process.env.ANTHROPIC_API_KEY) {
    const error = new Error("ANTHROPIC_API_KEY is not configured");
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
      max_tokens: 2200,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content:
            "Generate exactly 10 short Indian food delivery quiz MCQs as JSON only. Shape: [{\"question\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correct_index\":0,\"explanation\":\"...\"}]. Keep explanations under 30 words.",
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = new Error("Could not generate quiz questions");
    error.statusCode = response.status;
    throw error;
  }

  const payload = await response.json();
  const rawText = (payload.content || [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("\n");
  const questions = parseAnthropicQuestions(rawText);
  quizCache.set(date, {
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    questions,
  });
  return questions;
};

export const getQuizQuestions = async (_req, res) => {
  try {
    const questions = await loadQuizForToday();
    res.status(200).json({
      success: true,
      data: {
        questions: questions.map(({ correct_index: _correctIndex, explanation: _explanation, ...question }) => question),
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not load quiz questions",
    });
  }
};

export const validateQuizAnswer = async (req, res) => {
  try {
    const questions = await loadQuizForToday();
    const question = questions.find((item) => item.id === req.body.questionId);
    const selectedIndex = Number(req.body.selectedIndex);

    if (!question || !Number.isInteger(selectedIndex)) {
      return res.status(400).json({ success: false, message: "Invalid quiz answer" });
    }

    res.status(200).json({
      success: true,
      data: {
        correct: selectedIndex === question.correct_index,
        correctIndex: question.correct_index,
        explanation: question.explanation,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not validate quiz answer",
    });
  }
};

export const getScratchRewards = async (req, res) => {
  try {
    const orderId = req.query.orderId || req.body?.orderId;
    const order = orderId
      ? await Order.findOne({ _id: orderId, customer: req.user._id }).lean()
      : null;

    if (orderId && !order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (order?.scratchUsed) {
      return res.status(409).json({ success: false, message: "Scratch reward already used for this order" });
    }

    const promos = await Promo.find({
      isActive: true,
      validUntil: { $gte: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(12)
      .populate("restaurant", "name")
      .lean();
    const promo = promos.find(
      (item) =>
        item.usageLimit === null ||
        item.usageLimit === undefined ||
        Number(item.usedCount || 0) < Number(item.usageLimit)
    );

    const reward = promo
      ? {
          type: "discount",
          label: promo.discountType === "PERCENTAGE" ? `${promo.value}% off` : `Rs ${promo.value} off`,
          code: promo.code,
          restaurant: promo.restaurant?.name || "NearBites",
          xp: 0,
        }
      : {
          type: "xp",
          label: "XP reward",
          code: null,
          restaurant: "NearBites",
          xp: 20,
        };

    res.status(200).json({ success: true, data: { reward, orderScratchUsed: Boolean(order?.scratchUsed) } });
  } catch (error) {
    console.error("getScratchRewards error:", error);
    res.status(500).json({ success: false, message: "Could not load scratch reward" });
  }
};

export const markScratchUsed = async (req, res) => {
  try {
    const orderId = req.body.orderId;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, customer: req.user._id, scratchUsed: false },
      { $set: { scratchUsed: true } },
      { new: true }
    );

    if (!order) {
      return res.status(409).json({ success: false, message: "Scratch reward already used or order not found" });
    }

    res.status(200).json({ success: true, data: { scratchUsed: true } });
  } catch (error) {
    console.error("markScratchUsed error:", error);
    res.status(500).json({ success: false, message: "Could not mark scratch reward used" });
  }
};

export const getWheelSegments = async (_req, res) => {
  try {
    const restaurants = await Restaurant.find({ isActive: true })
      .sort({ rating: -1, updatedAt: -1 })
      .limit(8)
      .select("name imageUrl category cuisineType rating deliveryTime")
      .lean();

    if (!restaurants.length) {
      return res.status(404).json({ success: false, message: "No live restaurants for today's wheel" });
    }

    res.status(200).json({
      success: true,
      data: {
        segments: restaurants.map((restaurant) => ({
          id: restaurant._id,
          label: restaurant.name,
          restaurantId: restaurant._id,
          category: restaurant.category || restaurant.cuisineType?.[0] || "Food",
          rating: restaurant.rating || 0,
          deliveryTime: restaurant.deliveryTime || 30,
          imageUrl: restaurant.imageUrl || "",
        })),
      },
    });
  } catch (error) {
    console.error("getWheelSegments error:", error);
    res.status(500).json({ success: false, message: "Could not load wheel segments" });
  }
};

export const getGamesFeed = async (req, res) => {
  try {
    const date = getIstDate();
    const myScore = req.user
      ? await GameScore.findOne({ userId: req.user._id, date, archived: false }).lean()
      : null;

    res.status(200).json({
      success: true,
      data: {
        games: GAME_CONFIGS,
        rewards: [],
        myScores: myScore
          ? [
              {
                gameKey: "daily",
                bestScore: myScore.totalScore,
                totalScore: myScore.totalScore,
                rank: myScore.rank,
              },
            ]
          : [],
      },
    });
  } catch (error) {
    console.error("getGamesFeed error:", error);
    res.status(500).json({ success: false, message: "Could not load games" });
  }
};

export const claimGameReward = (_req, res) => {
  res.status(410).json({
    success: false,
    message: "Game reward claiming has moved to the daily score and scratch reward system",
  });
};
