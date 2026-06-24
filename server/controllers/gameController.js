import GameScore from "../models/GameScore.js";
import Order from "../models/Order.js";
import Promo from "../models/Promo.js";
import Restaurant from "../models/Restaurant.js";
import User, { getTierFromPoints } from "../models/User.js";
import WalletTransaction from "../models/WalletTransaction.js";

export const GAME_CONFIGS = [
  { key: "food-quiz-battle", title: "Food Quiz Battle", difficulty: "Live PvP", rewardType: "xp", mode: "multiplayer" },
  { key: "delivery-race", title: "Delivery Race", difficulty: "Live PvP", rewardType: "coins", mode: "multiplayer" },
  { key: "hand-cricket", title: "Hand Cricket Night", difficulty: "Hard Bot", rewardType: "coins", mode: "bot" },
  { key: "snakes-sprint", title: "Snakes Sprint", difficulty: "Hard Bot", rewardType: "coins", mode: "bot" },
  { key: "bite-catcher", title: "Bite Catcher", difficulty: "Arcade", rewardType: "coins", mode: "solo" },
  { key: "food-memory", title: "Food Memory", difficulty: "Timed", rewardType: "xp", mode: "solo" },
  { key: "tray-shuffle", title: "Tray Shuffle", difficulty: "Timed", rewardType: "coupon", mode: "solo" },
];

const BADGE_THRESHOLDS = [
  { type: "GAME_ROOKIE", name: "Snack Hunter", minScore: 100, points: 10, coins: 20 },
  { type: "GAME_HOT_STREAK", name: "Street Food Master", minScore: 250, points: 25, coins: 50 },
  { type: "GAME_CHAMPION", name: "Elite Food Warrior", minScore: 500, points: 50, coins: 100 },
  { type: "NB_LEGEND", name: "NearBitez Legend", minScore: 1000, points: 120, coins: 250 },
];

const DAILY_MISSIONS = [
  { key: "order-today", title: "Order once today", targetMetric: "ORDER", target: 1, reward: { coins: 40, xp: 25, label: "40 coins + 25 XP" } },
  { key: "new-restaurant", title: "Try a new restaurant", targetMetric: "DISCOVERY", target: 1, reward: { coins: 30, xp: 20, label: "30 coins + 20 XP" } },
  { key: "spend-300", title: "Spend above Rs 300", targetMetric: "SPEND", target: 300, reward: { coins: 60, xp: 35, label: "60 coins + 35 XP" } },
  { key: "rate-order", title: "Rate an order", targetMetric: "REVIEW", target: 1, reward: { coins: 25, xp: 25, label: "25 coins + 25 XP" } },
  { key: "invite-friend", title: "Invite a friend", targetMetric: "REFERRAL", target: 1, reward: { coins: 100, xp: 50, label: "100 coins + 50 XP" } },
];

const LEVELS = [
  { name: "Beginner Foodie", minXp: 0 },
  { name: "Snack Hunter", minXp: 150 },
  { name: "Street Food Master", minXp: 500 },
  { name: "Pro Explorer", minXp: 1200 },
  { name: "Elite Food Warrior", minXp: 2500 },
  { name: "NearBitez Legend", minXp: 5000 },
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

const getPreviousIstDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return getIstDate(date);
};

const getLevelSnapshot = (xp = 0) => {
  const currentIndex = LEVELS.reduce(
    (match, level, index) => (xp >= level.minXp ? index : match),
    0
  );
  const current = LEVELS[currentIndex];
  const next = LEVELS[currentIndex + 1] || null;
  const span = next ? next.minXp - current.minXp : 1;
  const progress = next
    ? Math.min(100, Math.round(((xp - current.minXp) / span) * 100))
    : 100;

  return {
    name: current.name,
    xp,
    nextLevel: next?.name || null,
    xpToNext: next ? Math.max(0, next.minXp - xp) : 0,
    progress,
  };
};

const isLuckyHour = () => {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );
  return hour >= 19 && hour < 21;
};

const touchDailyStreak = (user, date = getIstDate()) => {
  if (user.lastActivityDate === date) return false;
  user.currentStreak = user.lastActivityDate === getPreviousIstDate()
    ? Number(user.currentStreak || 0) + 1
    : 1;
  user.longestStreak = Math.max(Number(user.longestStreak || 0), user.currentStreak);
  user.lastActivityDate = date;
  return true;
};

const recordWallet = ({ userId, coins, xp, description, source = "GAME", meta = {} }) =>
  WalletTransaction.create({
    user: userId,
    type: coins >= 0 ? "EARNED" : "SPENT",
    source,
    coins,
    xp,
    description,
    meta,
  });

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
    user.nearCoins += badge.coins || 0;
    user.pointsHistory.push({
      type: "EARNED",
      points: badge.points,
      description: `${badge.name} gaming badge`,
    });
    await recordWallet({
      userId,
      coins: badge.coins || 0,
      xp: badge.points,
      description: `${badge.name} badge unlocked`,
      meta: { badge: badge.type },
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
    const luckyMultiplier = isLuckyHour() ? 2 : 1;
    const xpAward = Math.max(1, Math.floor(points * 0.2 * luckyMultiplier));
    const coinAward = Math.max(1, Math.floor(points * 0.35 * luckyMultiplier));

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
    leaderboardCache.delete(`leaderboard:${date}`);
    const freshScore = await GameScore.findById(score._id).populate("userId", "name badges").lean();
    const badges = await maybeAwardBadges({
      req,
      userId: req.user._id,
      previousTotal,
      nextTotal: freshScore.totalScore,
      date,
    });

    const user = await User.findById(req.user._id).select("+pointsHistory");
    if (user) {
      touchDailyStreak(user, date);
      user.loyaltyPoints += xpAward;
      user.totalPointsEarned += xpAward;
      user.nearCoins += coinAward;
      user.pointsHistory.push({
        type: "EARNED",
        points: xpAward,
        description: `${game} game reward`,
      });
      user.loyaltyTier = getTierFromPoints(user.loyaltyPoints);
      await user.save();
      await recordWallet({
        userId: req.user._id,
        coins: coinAward,
        xp: xpAward,
        description: `${game} score reward`,
        meta: { game, points, luckyHour: isLuckyHour() },
      });
    }

    const leaderboardPayload = await emitLeaderboard(req, date, req.user._id);

    res.status(200).json({
      success: true,
      data: {
        todayScore: freshScore.totalScore,
        myRank: freshScore.rank,
        score: serializeScoreRow(freshScore, req.user._id),
        badges,
        reward: {
          coins: coinAward,
          xp: xpAward,
          luckyHour: isLuckyHour(),
          streak: user?.currentStreak || 0,
          level: getLevelSnapshot(user?.loyaltyPoints || 0),
        },
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
          restaurant: promo.restaurant?.name || "NearBitez",
          xp: 0,
        }
      : {
          type: "xp",
          label: "XP reward",
          code: null,
          restaurant: "NearBitez",
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
    const [myScore, rewards, transactions, user] = await Promise.all([
      req.user
        ? GameScore.findOne({ userId: req.user._id, date, archived: false }).lean()
        : null,
      Promo.find({
        isActive: true,
        isGameReward: true,
        validUntil: { $gte: new Date() },
      })
        .sort({ gameRewardTier: -1, value: -1, createdAt: -1 })
        .limit(8)
        .populate("restaurant", "name imageUrl")
        .lean(),
      req.user
        ? WalletTransaction.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(8)
            .lean()
        : [],
      req.user ? User.findById(req.user._id).lean() : null,
    ]);

    const xp = user?.loyaltyPoints || 0;
    const defaultRewards = [
      {
        _id: "daily-free-delivery",
        gameKey: "any",
        gameRewardTier: "PLAY",
        gameMinScore: 120,
        discountType: "FLAT",
        value: 49,
        minOrderValue: 199,
        title: "Free delivery unlock",
      },
      {
        _id: "legend-bonus",
        gameKey: "any",
        gameRewardTier: "TOP",
        gameMinScore: 600,
        discountType: "PERCENTAGE",
        value: 20,
        minOrderValue: 299,
        title: "Daily champion coupon",
      },
    ];

    res.status(200).json({
      success: true,
      data: {
        games: GAME_CONFIGS,
        rewards: rewards.length ? rewards : defaultRewards,
        wallet: {
          coins: user?.nearCoins || 0,
          xp,
          level: getLevelSnapshot(xp),
          streak: {
            current: user?.currentStreak || 0,
            longest: user?.longestStreak || 0,
            lastActivityDate: user?.lastActivityDate || "",
          },
          luckyHour: isLuckyHour(),
          history: transactions.map((item) => ({
            _id: item._id,
            type: item.type,
            source: item.source,
            coins: item.coins,
            xp: item.xp,
            description: item.description,
            createdAt: item.createdAt,
          })),
        },
        missions: DAILY_MISSIONS.map((mission, index) => ({
          ...mission,
          progress:
            mission.key === "order-today"
              ? 0
              : mission.key === "rate-order"
              ? 0
              : index === 0 && myScore
              ? 1
              : 0,
          completed: false,
        })),
        seasonalEvent: {
          title: "Lucky Hour Rush",
          description: "7 PM to 9 PM gives double XP and double NearCoins from games.",
          active: isLuckyHour(),
        },
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

export const claimGameReward = async (req, res) => {
  try {
    const date = getIstDate();
    const rewardTier = String(req.body.rewardTier || "PLAY").toUpperCase();
    const gameKey = String(req.body.gameKey || "any").toLowerCase();
    const todayScore = await GameScore.findOne({
      userId: req.user._id,
      date,
      archived: false,
    }).lean();

    const minScore = rewardTier === "TOP" ? 600 : 120;
    if (!todayScore || Number(todayScore.totalScore || 0) < minScore) {
      return res.status(403).json({
        success: false,
        message: `Score ${minScore}+ today to unlock this reward`,
      });
    }

    if (rewardTier === "TOP" && Number(todayScore.rank || 9999) !== 1) {
      return res.status(403).json({
        success: false,
        message: "Only the current #1 player can claim the top reward",
      });
    }

    const promo = await Promo.findOne({
      isActive: true,
      isGameReward: true,
      gameRewardTier: rewardTier,
      $or: [{ gameKey }, { gameKey: "any" }],
      validUntil: { $gte: new Date() },
    })
      .sort({ value: -1, createdAt: -1 })
      .populate("restaurant", "name imageUrl")
      .lean();

    const coins = rewardTier === "TOP" ? 150 : 45;
    const xp = rewardTier === "TOP" ? 75 : 25;
    const user = await User.findById(req.user._id).select("+pointsHistory");
    if (user) {
      touchDailyStreak(user, date);
      user.nearCoins += coins;
      user.loyaltyPoints += xp;
      user.totalPointsEarned += xp;
      user.pointsHistory.push({
        type: "EARNED",
        points: xp,
        description: `${rewardTier} game reward claim`,
      });
      user.loyaltyTier = getTierFromPoints(user.loyaltyPoints);
      await user.save();
      await recordWallet({
        userId: req.user._id,
        coins,
        xp,
        description: `${rewardTier} reward claimed`,
        meta: { gameKey, promo: promo?._id || null },
      });
    }

    const fallbackCode = rewardTier === "TOP" ? "NBLEGEND20" : "NBPLAY49";
    res.status(200).json({
      success: true,
      data: {
        coins,
        xp,
        streak: user?.currentStreak || 0,
        level: getLevelSnapshot(user?.loyaltyPoints || 0),
        promo: promo || {
          code: fallbackCode,
          discountType: rewardTier === "TOP" ? "PERCENTAGE" : "FLAT",
          value: rewardTier === "TOP" ? 20 : 49,
          minOrderValue: rewardTier === "TOP" ? 299 : 199,
          restaurant: { name: "NearBitez" },
        },
      },
    });
  } catch (error) {
    console.error("claimGameReward error:", error);
    res.status(500).json({ success: false, message: "Could not claim game reward" });
  }
};
