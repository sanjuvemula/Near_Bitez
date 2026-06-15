import express from "express";
import { getPublicBusinessSettings } from "../controllers/adminSettingsController.js";

const router = express.Router();

router.get("/public", getPublicBusinessSettings);

export default router;
