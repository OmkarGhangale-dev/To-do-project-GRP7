const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const fs = require("fs");
const path = require("path");

let serviceAccount = null;

// 1. Try loading from FIREBASE_SERVICE_ACCOUNT environment variable (for Render / cloud deployments)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
        try {
            const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8');
            serviceAccount = JSON.parse(decoded);
        } catch (e) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:", e.message);
        }
    }
}

// 2. Try loading from serviceAccountKey.json file or custom path
if (!serviceAccount) {
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || path.join(__dirname, "../serviceAccountKey.json");
    if (fs.existsSync(keyPath)) {
        try {
            serviceAccount = require(keyPath);
        } catch (e) {
            console.warn("Could not require service account file:", e.message);
        }
    }
}

if (!getApps().length) {
    if (serviceAccount) {
        initializeApp({
            credential: cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
        });
    } else {
        initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID
        });
    }
}

const db = getFirestore();
const auth = getAuth();

module.exports = { db, auth, Timestamp, serviceAccount };