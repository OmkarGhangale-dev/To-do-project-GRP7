const express = require("express");
const router = express.Router();

const { prioritizeTasks, getNextTask, breakdownTask } = require("../controllers/aiController");
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
 * POST /api/ai/breakdown
 * Breaks a large task into 3–5 actionable subtasks.
 */
router.post("/breakdown", breakdownTask);

module.exports = router;
