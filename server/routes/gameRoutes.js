import express from "express";
import {
  addOrUpdateScore,
  claimGameReward,
  getGamesFeed,
  getLeaderboard,
  getMyTodayScore,
  getQuizQuestions,
  getScratchRewards,
  getWheelSegments,
  markScratchUsed,
  validateQuizAnswer,
} from "../controllers/gameController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/leaderboard", getLeaderboard);

router.use(protect);
router.use(authorize("customer", "admin"));

router.patch("/score", addOrUpdateScore);
router.post("/score", addOrUpdateScore);
router.post("/scores", addOrUpdateScore);
router.get("/my-score", getMyTodayScore);
router.get("/quiz", getQuizQuestions);
router.post("/quiz/answer", validateQuizAnswer);
router.get("/scratch-rewards", getScratchRewards);
router.post("/scratch/use", markScratchUsed);
router.get("/wheel-segments", getWheelSegments);

router.get("/feed", getGamesFeed);
router.post("/claim", claimGameReward);

export default router;
