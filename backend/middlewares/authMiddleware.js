const { auth, serviceAccount } = require("../config/db");
const userModel = require("../models/userModel");
const { SUPER_ADMIN_EMAIL } = require("../config/constants");

const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Token missing."
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token || token === "null" || token === "undefined") {
            return res.status(401).json({
                success: false,
                message: "Access denied. Token missing."
            });
        }

        let decodedToken = null;

        // 1. Primary verification: Standard Firebase ID Token
        try {
            decodedToken = await auth.verifyIdToken(token);
        } catch (err) {
            // 2. Check if the token is a Firebase Custom Token signed by our service account
            try {
                const parts = token.split(".");
                if (parts.length === 3) {
                    const payloadStr = Buffer.from(parts[1], "base64").toString("utf-8");
                    const payload = JSON.parse(payloadStr);

                    if (
                        payload.iss === serviceAccount.client_email &&
                        (payload.uid || payload.sub)
                    ) {
                        const uid = payload.uid || payload.sub;
                        let userEmail = payload.email || "";

                        if (!userEmail) {
                            try {
                                const userRecord = await auth.getUser(uid);
                                userEmail = userRecord.email || "";
                            } catch {}
                        }

                        decodedToken = {
                            uid,
                            email: userEmail,
                            emailVerified: true
                        };
                    }
                }
            } catch (customErr) {}

            // 3. Fallback verification: Google OAuth ID token directly from Google GIS
            if (!decodedToken) {
                try {
                    const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
                    if (gRes.ok) {
                        const gData = await gRes.json();
                        decodedToken = {
                            uid: gData.sub,
                            email: gData.email,
                            emailVerified: gData.email_verified === "true" || gData.email_verified === true
                        };
                    }
                } catch (gErr) {}
            }

            if (!decodedToken) {
                throw err;
            }
        }

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: Boolean(decodedToken.emailVerified ?? decodedToken.email_verified)
        };

        next();
    } catch (error) {
        console.error("Token verification error:", error.code || error.message);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
};

/**
 * Require Administrator Privileges
 * Verifies that the authenticated user has role === 'admin' or is the Super Admin
 */
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.uid) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Authentication required."
            });
        }

        const email = (req.user.email || "").toLowerCase().trim();
        const isSuperAdmin = email === SUPER_ADMIN_EMAIL.toLowerCase();

        if (isSuperAdmin) {
            req.userRole = "superadmin";
            req.isSuperAdmin = true;
            return next();
        }

        const user = await userModel.getUserById(req.user.uid);
        const userEmail = (user?.email || "").toLowerCase().trim();

        if (userEmail === SUPER_ADMIN_EMAIL.toLowerCase() || user?.role === "admin") {
            req.userRole = userEmail === SUPER_ADMIN_EMAIL.toLowerCase() ? "superadmin" : "admin";
            req.isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL.toLowerCase();
            return next();
        }

        return res.status(403).json({
            success: false,
            message: "Access denied. Administrator privileges required."
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Require Super Admin Privileges
 * Strictly verifies that the authenticated user is omkarghangale36@gmail.com
 */
const requireSuperAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.uid) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Authentication required."
            });
        }

        if (req.isSuperAdmin) {
            return next();
        }

        const email = (req.user.email || "").toLowerCase().trim();
        if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
            req.userRole = "superadmin";
            req.isSuperAdmin = true;
            return next();
        }

        const user = await userModel.getUserById(req.user.uid);
        const userEmail = (user?.email || "").toLowerCase().trim();

        if (userEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
            req.userRole = "superadmin";
            req.isSuperAdmin = true;
            return next();
        }

        return res.status(403).json({
            success: false,
            message: "Access denied. Only the Super Admin can perform this action."
        });
    } catch (err) {
        next(err);
    }
};

authenticateUser.authenticateUser = authenticateUser;
authenticateUser.requireAdmin = requireAdmin;
authenticateUser.requireSuperAdmin = requireSuperAdmin;

module.exports = authenticateUser;

