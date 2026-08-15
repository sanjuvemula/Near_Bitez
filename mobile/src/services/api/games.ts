import { apiClient } from "@/services/apiClient";
import type {
  ClaimResult,
  GamesFeed,
  LeaderboardPayload,
  ScoreSubmission,
  WheelSegment,
} from "@/features/games/utils/types";

/**
 * Mirrors server/routes/gameRoutes.js (mounted at /api/v1/games).
 *
 * Every reward figure the app displays comes out of these responses. The app
 * computes a run's *score* — that is what a game is — but never the coins, XP,
 * rank or coupon that follow from it.
 */
export const gameApi = {
  /** Public route; returns today's top 20 plus the caller's row when signed in. */
  leaderboard: () =>
    apiClient.get<{ data: LeaderboardPayload }>("/games/leaderboard").then((r) => r.data.data),

  myScore: () =>
    apiClient
      .get<{ data: { todayScore: number; myRank: number | null; leaderboard: LeaderboardPayload["leaderboard"] } }>(
        "/games/my-score"
      )
      .then((r) => r.data.data),

  /**
   * Submit a finished run.
   *
   * `gameName` is what appears in the daily `gamesPlayed[]` history, so it is
   * sent as the catalogue key to stay consistent with the web app.
   */
  submitScore: (gameKey: string, points: number) =>
    apiClient
      .post<{ data: ScoreSubmission }>("/games/score", { gameKey, gameName: gameKey, points })
      .then((r) => r.data.data),

  feed: () => apiClient.get<{ data: GamesFeed }>("/games/feed").then((r) => r.data.data),

  claim: (rewardTier: "PLAY" | "TOP", gameKey = "any") =>
    apiClient
      .post<{ data: ClaimResult }>("/games/claim", { rewardTier, gameKey })
      .then((r) => r.data.data),

  /** Live restaurants for the wheel — never a hardcoded list. */
  wheelSegments: () =>
    apiClient
      .get<{ data: { segments: WheelSegment[] } }>("/games/wheel-segments")
      .then((r) => r.data.data.segments),

  /** Questions arrive without `correct_index`; answers are checked server-side. */
  quiz: () =>
    apiClient
      .get<{ data: { questions: { id: string; question: string; options: string[] }[] } }>("/games/quiz")
      .then((r) => r.data.data.questions),

  answerQuiz: (questionId: string, selectedIndex: number) =>
    apiClient
      .post<{ data: { correct: boolean; correctIndex: number; explanation: string } }>(
        "/games/quiz/answer",
        { questionId, selectedIndex }
      )
      .then((r) => r.data.data),
};
