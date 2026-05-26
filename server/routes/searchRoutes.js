import express from "express";
import { globalSearch } from "../controllers/searchController.js";

const router = express.Router();

// GET /api/v1/search?q=biryani&type=all
router.get("/", globalSearch);

export default router;




