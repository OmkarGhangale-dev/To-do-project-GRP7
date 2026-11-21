const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticateUser, requireAdmin, requireSuperAdmin } = require("../middlewares/authMiddleware");

// All routes under /api/admin require authentication and administrator privileges
router.use(authenticateUser);
router.use(requireAdmin);

// Admin directory & stats
router.get("/users", adminController.getUsers);
router.get("/stats", adminController.getStats);

// Role modification strictly requires Super Admin
router.put("/users/:uid/role", requireSuperAdmin, adminController.updateUserRole);

module.exports = router;
