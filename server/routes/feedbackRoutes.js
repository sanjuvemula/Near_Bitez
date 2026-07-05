import express from "express";
import {
  closeMyFeedback,
  createFeedback,
  getMyFeedback,
  getMyFeedbackById,
} from "../controllers/feedbackController.js";
import { authorize, protect } from "../middleware/auth.js";
import { withOptionalImageUpload } from "../middleware/upload.js";

const router = express.Router();

router.use(protect);
router.use(authorize("customer", "vendor", "admin"));

router.get("/", getMyFeedback);
router.post("/", withOptionalImageUpload("screenshot"), createFeedback);
router.get("/:id", getMyFeedbackById);
router.patch("/:id/close", closeMyFeedback);

export default router;
