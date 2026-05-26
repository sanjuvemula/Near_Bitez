import express from "express";
import { getTiffins } from "../controllers/tiffinController.js";

const router = express.Router();

// GET /api/v1/tiffins — public, no auth needed
router.get("/", getTiffins);

export default router;