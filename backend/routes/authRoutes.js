const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// Public authentication routes
router.post("/google", authController.googleAuth);
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected profile routes
router.use(authenticateUser);

router.get("/profile", authController.getProfile);
router.post("/profile", authController.createProfile);
router.put("/profile", authController.updateProfile);

module.exports = router;