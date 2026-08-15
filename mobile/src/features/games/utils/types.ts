/**
 * Game-layer shapes.
 *
 * Response types were verified against the running backend, not inferred from
 * the controller source.
 */

export type GameKey =
  | "bite-catcher"
  | "food-memory"
  | "tray-shuffle"
  | "snakes-sprint"
  | "hand-cricket"
  | "food-quiz-battle"
  | "delivery-race";

export type GameMode = "solo" | "bot" | "multiplayer";

export interface GameMeta {
  key: GameKey;
  title: string;
  short: string;
  tagline: string;
  description: string;
  mode: GameMode;
  difficulty: string;
  rewardType: "coins" | "xp" | "coupon";
  /** Accent colour for this game's surfaces, used in both themes. */
  hue: string;
  glyph: string;
  /** `web-only` means no mobile implementation exists yet — never launchable. */
  status: "playable" | "web-only";
}

/** What a finished run reports upward. Never sent as the reward itself. */
export interface GameResult {
  score: number;
  /** Free-form per-game detail recorded alongside the run. */
  meta?: Record<string, number | string | boolean>;
}

/* ── Server payloads ─────────────────────────────────────────────────────── */

export interface LevelSnapshot {
  name: string;
  xp: number;
  nextLevel: string | null;
  xpToNext: number;
  progress: number;
}

export interface ScoreReward {
  coins: number;
  xp: number;
  luckyHour: boolean;
  streak: number;
  level: LevelSnapshot;
}

export interface AwardedBadge {
  type: string;
  name: string;
  points?: number;
  coins?: number;
}

export interface LeaderboardRow {
  _id?: string;
  userId?: string;
  name: string;
  totalScore: number;
  rank: number | null;
  gamesPlayed?: number;
  isCurrentUser?: boolean;
  badges?: string[];
}

export interface LeaderboardPayload {
  leaderboard: LeaderboardRow[];
  currentUser: LeaderboardRow | null;
  date?: string;
  totalPlayers?: number;
}

/** Response of POST /games/score — the authority on what a run earned. */
export interface ScoreSubmission {
  todayScore: number;
  myRank: number | null;
  score?: LeaderboardRow;
  badges?: AwardedBadge[];
  reward: ScoreReward;
  leaderboard?: LeaderboardRow[];
  currentUser?: LeaderboardRow | null;
}

export interface WalletHistoryRow {
  _id: string;
  type: string;
  source: string;
  coins: number;
  xp: number;
  description: string;
  createdAt: string;
}

export interface GamesFeed {
  games: { key: string; title: string; difficulty: string; rewardType: string; mode: string }[];
  rewards: {
    _id: string;
    code?: string;
    title?: string;
    gameKey: string;
    gameRewardTier: "PLAY" | "TOP";
    gameMinScore: number;
    discountType: "PERCENTAGE" | "FLAT";
    value: number;
    minOrderValue: number;
    restaurant?: { name?: string; imageUrl?: string } | null;
    validUntil?: string;
  }[];
  wallet: {
    coins: number;
    xp: number;
    level: LevelSnapshot;
    streak: { current: number; longest: number; lastActivityDate: string };
    luckyHour: boolean;
    history: WalletHistoryRow[];
  };
  missions: {
    key: string;
    title: string;
    target: number;
    progress: number;
    completed: boolean;
    reward: { coins: number; xp: number; label: string };
  }[];
  seasonalEvent: { title: string; description: string; active: boolean };
  myScores: { gameKey: string; bestScore: number; totalScore: number; rank: number | null }[];
}

export interface ClaimResult {
  coins: number;
  xp: number;
  streak: number;
  level: LevelSnapshot;
  promo: {
    code: string;
    discountType: "PERCENTAGE" | "FLAT";
    value: number;
    minOrderValue: number;
    restaurant?: { name?: string } | null;
  };
}

export interface WheelSegment {
  id: string;
  label: string;
  restaurantId: string;
  category: string;
  rating: number;
  deliveryTime: number;
  imageUrl: string;
}
