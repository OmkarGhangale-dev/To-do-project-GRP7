const userModel = require("../models/userModel");
const { SUPER_ADMIN_EMAIL } = require("../config/constants");
const { db } = require("../config/db");

/**
 * Get all registered users for admin management
 */
const getUsers = async (req, res, next) => {
    try {
        const users = await userModel.getAllUsers();

        const sanitizedUsers = users.map((u) => {
            const email = (u.email || "").toLowerCase().trim();
            const isSuperAdmin = email === SUPER_ADMIN_EMAIL.toLowerCase();

            return {
                id: u.id,
                name: u.name || (email ? email.split("@")[0] : "User"),
                email: u.email || "",
                role: isSuperAdmin ? "admin" : (u.role || "user"),
                isSuperAdmin,
                status: u.status || "Active",
                department: u.department || "General",
                avatar: u.avatar || "",
                createdAt: u.createdAt || null
            };
        });

        res.status(200).json({
            success: true,
            count: sanitizedUsers.length,
            data: sanitizedUsers
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Update user role (Promote to Admin / Demote to User)
 * Restricted strictly to Super Admin (omkarghangale36@gmail.com)
 */
const updateUserRole = async (req, res, next) => {
    try {
        const { uid } = req.params;
        const { role } = req.body;

        if (!role || !["admin", "user"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Valid role is required ('admin' or 'user')."
            });
        }

        const targetUser = await userModel.getUserById(uid);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "Target user not found."
            });
        }

        const targetEmail = (targetUser.email || "").toLowerCase().trim();

        // The Super Admin (omkarghangale36@gmail.com) cannot be modified or demoted
        if (targetEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: "Super Admin privileges cannot be modified or revoked."
            });
        }

        const updated = await userModel.updateUserProfile(uid, {
            role,
            updatedAt: new Date()
        });

        res.status(200).json({
            success: true,
            message: `User role successfully updated to '${role}'.`,
            data: {
                id: updated.id,
                email: updated.email,
                name: updated.name,
                role: updated.role,
                isSuperAdmin: false
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get organization stats for Admin Overview
 */
const getStats = async (req, res, next) => {
    try {
        const usersSnapshot = await db.collection("users").get();
        const tasksSnapshot = await db.collection("tasks").get();

        const totalUsers = usersSnapshot.size;
        let adminCount = 0;
        usersSnapshot.forEach((doc) => {
            const data = doc.data();
            const email = (data.email || "").toLowerCase().trim();
            if (data.role === "admin" || email === SUPER_ADMIN_EMAIL.toLowerCase()) {
                adminCount++;
            }
        });

        const totalTasks = tasksSnapshot.size;
        let completedTasks = 0;
        tasksSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.status === "Completed") {
                completedTasks++;
            }
        });

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                adminCount,
                totalTasks,
                completedTasks,
                pendingTasks: totalTasks - completedTasks
            }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getUsers,
    updateUserRole,
    getStats
};
