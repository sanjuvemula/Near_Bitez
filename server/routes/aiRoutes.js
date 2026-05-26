import express from "express";
import { aiChat } from "../controllers/aiController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// POST /api/v1/ai/chat  — protected, customer only
router.post("/chat", protect, aiChat);

export default router;



