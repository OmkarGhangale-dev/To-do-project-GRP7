const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Initialize Firebase Admin FIRST before any routes/models are loaded
const { db } = require("./config/db");

const taskRoutes = require("./routes/taskRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// CORS — allow all origins in dev; tighten in production via CORS_ORIGIN env var
const corsOptions = {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));
app.use(express.json());

// Enhanced health-check: verifies Firestore connectivity
app.get("/", async (req, res) => {
    try {
        // Lightweight Firestore probe — read a non-existent doc (fast, no data needed)
        await db.collection("_healthcheck").doc("ping").get();
        res.status(200).json({
            success: true,
            message: "TaskFlow Backend API is running!",
            firebase: "connected"
        });
    } catch (err) {
        res.status(200).json({
            success: true,
            message: "TaskFlow Backend API is running!",
            firebase: "unreachable",
            firebaseError: err.message
        });
    }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);

// 404 route
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found."
    });
});

// Error handling
app.use(errorHandler);

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`TaskFlow server running on port ${PORT}`);
});