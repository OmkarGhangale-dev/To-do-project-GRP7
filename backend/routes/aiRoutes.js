const express = require("express");
const router = express.Router();

const {
    prioritizeTasks,
    getNextTask,
    comparePrioritize,
    compareNextTask,
} = require("../controllers/aiController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// All AI routes require authentication — user-specific task data only
router.use(authenticateUser);

/**
 * POST /api/ai/prioritize
 * Analyses an array of tasks and returns recommended priorities and ordering.
 */
router.post("/prioritize", prioritizeTasks);

/**
 * POST /api/ai/next-task
 * Returns the single best task to focus on right now.
 */
router.post("/next-task", getNextTask);

/**
 * POST /api/ai/compare-prioritize
 * Runs identical priority analysis prompts against Google Gemini and Groq side-by-side.
 */
router.post("/compare-prioritize", comparePrioritize);

/**
 * POST /api/ai/compare-next-task
 * Runs identical next-task recommendation prompts against Google Gemini and Groq side-by-side.
 */
router.post("/compare-next-task", compareNextTask);

module.exports = router;
