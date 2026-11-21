const userModel = require("../models/userModel");
const { auth, Timestamp } = require("../config/db");
const { SUPER_ADMIN_EMAIL } = require("../config/constants");

// GOOGLE AUTHENTICATION
const googleAuth = async (req, res, next) => {
    try {
        const { idToken, credential } = req.body;
        const tokenToVerify = idToken || credential;

        if (!tokenToVerify) {
            return res.status(400).json({
                success: false,
                message: "Token is required for Google authentication."
            });
        }

        let uid;
        let email;
        let name;
        let picture = "";
        let emailVerified = true;

        try {
            const decoded = await auth.verifyIdToken(tokenToVerify);
            uid = decoded.uid;
            email = decoded.email;
            name = decoded.name || (email ? email.split("@")[0] : "Google User");
            picture = decoded.picture || "";
            emailVerified = Boolean(decoded.email_verified);
        } catch (fbErr) {
            const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenToVerify}`);
            if (!gRes.ok) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid Google OAuth token."
                });
            }
            const gData = await gRes.json();
            email = gData.email;
            name = gData.name || (email ? email.split("@")[0] : "Google User");
            picture = gData.picture || "";
            emailVerified = gData.email_verified === "true" || gData.email_verified === true;

            let userRecord;
            try {
                userRecord = await auth.getUserByEmail(email);
            } catch (err) {
                if (err.code === "auth/user-not-found") {
                    userRecord = await auth.createUser({
                        email,
                        displayName: name,
                        photoURL: picture,
                        emailVerified
                    });
                } else {
                    userRecord = { uid: gData.sub };
                }
            }
            uid = userRecord ? userRecord.uid : gData.sub;
        }

        const cleanEmail = (email || "").toLowerCase().trim();
        const isSuperAdmin = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

        let userProfile = await userModel.getUserById(uid);
        if (!userProfile) {
            const userData = {
                name: name.trim(),
                email: cleanEmail,
                avatar: picture,
                role: isSuperAdmin ? "admin" : "user",
                isSuperAdmin,
                accountStatus: "active",
                emailVerified: Boolean(emailVerified),
                authProvider: "google",
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            userProfile = await userModel.createUserProfile(uid, userData);
        } else if (isSuperAdmin && userProfile.role !== "admin") {
            // Automatically ensure Super Admin permissions in Firestore
            userProfile = await userModel.updateUserProfile(uid, {
                role: "admin",
                isSuperAdmin: true,
                updatedAt: Timestamp.now()
            });
        }

        return res.status(200).json({
            success: true,
            message: "Google login successful.",
            token: tokenToVerify,
            data: {
                ...userProfile,
                isSuperAdmin
            }
        });
    } catch (error) {
        next(error);
    }
};

// EMAIL/PASSWORD REGISTRATION
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: "Email is required." });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
        }

        const cleanEmail = email.trim().toLowerCase();
        const isSuperAdmin = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

        let userRecord;
        try {
            userRecord = await auth.createUser({
                email: cleanEmail,
                password,
                displayName: name.trim()
            });
        } catch (fbErr) {
            if (fbErr.code === "auth/email-already-exists") {
                return res.status(409).json({ success: false, message: "An account with this email already exists." });
            }
            throw fbErr;
        }

        const userData = {
            name: name.trim(),
            email: cleanEmail,
            role: isSuperAdmin ? "admin" : "user",
            isSuperAdmin,
            accountStatus: "active",
            emailVerified: false,
            authProvider: "password",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        const userProfile = await userModel.createUserProfile(userRecord.uid, userData);
        const customToken = await auth.createCustomToken(userRecord.uid);

        return res.status(201).json({
            success: true,
            message: "Registration successful.",
            token: customToken,
            data: userProfile
        });
    } catch (error) {
        next(error);
    }
};

// LOGIN WITH VERIFIED ID TOKEN OR EMAIL CHECK
const login = async (req, res, next) => {
    try {
        const { idToken, email } = req.body;

        if (idToken) {
            const decoded = await auth.verifyIdToken(idToken);
            const cleanEmail = (decoded.email || "").toLowerCase().trim();
            const isSuperAdmin = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

            let profile = await userModel.getUserById(decoded.uid);
            if (!profile) {
                profile = await userModel.createUserProfile(decoded.uid, {
                    name: decoded.name || decoded.email.split("@")[0],
                    email: cleanEmail,
                    role: isSuperAdmin ? "admin" : "user",
                    isSuperAdmin,
                    accountStatus: "active",
                    emailVerified: Boolean(decoded.email_verified),
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
            } else if (isSuperAdmin && profile.role !== "admin") {
                profile = await userModel.updateUserProfile(decoded.uid, {
                    role: "admin",
                    isSuperAdmin: true,
                    updatedAt: Timestamp.now()
                });
            }

            return res.status(200).json({
                success: true,
                message: "Login successful.",
                token: idToken,
                data: {
                    ...profile,
                    isSuperAdmin
                }
            });
        }

        if (email) {
            const cleanEmail = email.trim().toLowerCase();
            const isSuperAdmin = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

            const userRecord = await auth.getUserByEmail(cleanEmail);
            let profile = await userModel.getUserById(userRecord.uid);

            if (isSuperAdmin && profile && profile.role !== "admin") {
                profile = await userModel.updateUserProfile(userRecord.uid, {
                    role: "admin",
                    isSuperAdmin: true,
                    updatedAt: Timestamp.now()
                });
            }

            const customToken = await auth.createCustomToken(userRecord.uid);
            return res.status(200).json({
                success: true,
                message: "User located.",
                token: customToken,
                data: profile || {
                    id: userRecord.uid,
                    name: userRecord.displayName || cleanEmail.split("@")[0],
                    email: userRecord.email,
                    role: isSuperAdmin ? "admin" : "user",
                    isSuperAdmin
                }
            });
        }

        return res.status(400).json({
            success: false,
            message: "ID token or email is required for login."
        });
    } catch (error) {
        if (error.code === "auth/user-not-found") {
            return res.status(404).json({ success: false, message: "User not found with this email." });
        }
        next(error);
    }
};

// GET USER PROFILE
const getProfile = async (req, res, next) => {
    try {
        let user = await userModel.getUserById(req.user.uid);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User profile not found."
            });
        }

        const userEmail = (user.email || req.user.email || "").toLowerCase().trim();
        const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL.toLowerCase();

        // Enforce Super Admin role in DB if logged in as omkarghangale36@gmail.com
        if (isSuperAdmin && user.role !== "admin") {
            user = await userModel.updateUserProfile(req.user.uid, {
                role: "admin",
                isSuperAdmin: true,
                updatedAt: Timestamp.now()
            });
        }

        res.status(200).json({
            success: true,
            data: {
                ...user,
                isSuperAdmin
            }
        });
    } catch (error) {
        next(error);
    }
};

// CREATE USER PROFILE
const createProfile = async (req, res, next) => {
    try {
        const { name } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Name is required."
            });
        }

        const existingUser = await userModel.getUserById(req.user.uid);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User profile already exists."
            });
        }

        const userEmail = (req.user.email || "").toLowerCase().trim();
        const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL.toLowerCase();

        const userData = {
            name: name.trim(),
            email: userEmail,
            role: isSuperAdmin ? "admin" : "user",
            isSuperAdmin,
            accountStatus: "active",
            emailVerified: Boolean(req.user.emailVerified),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        const user = await userModel.createUserProfile(
            req.user.uid,
            userData
        );

        res.status(201).json({
            success: true,
            message: "Profile created successfully.",
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// UPDATE USER PROFILE
const updateProfile = async (req, res, next) => {
    try {
        const { name } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "A valid name is required."
            });
        }

        // Users CANNOT change their role or isSuperAdmin through updateProfile
        const user = await userModel.updateUserProfile(
            req.user.uid,
            {
                name: name.trim(),
                updatedAt: Timestamp.now()
            }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User profile not found."
            });
        }

        const userEmail = (user.email || req.user.email || "").toLowerCase().trim();
        const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL.toLowerCase();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            data: {
                ...user,
                isSuperAdmin
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    googleAuth,
    register,
    login,
    getProfile,
    createProfile,
    updateProfile
};
