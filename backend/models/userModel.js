const { db } = require("../config/db");

// Lazy getter — called inside each function so Firebase is always initialized
const usersCollection = () => db.collection("users");

const getUserById = async (uid) => {
    const doc = await usersCollection().doc(uid).get();

    if (!doc.exists) {
        return null;
    }

    return {
        id: doc.id,
        ...doc.data()
    };
};

const getUserByEmail = async (email) => {
    const clean = (email || "").toLowerCase().trim();
    const snapshot = await usersCollection().where("email", "==", clean).limit(1).get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];
    return {
        id: doc.id,
        ...doc.data()
    };
};

const getAllUsers = async () => {
    const snapshot = await usersCollection().get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

const createUserProfile = async (uid, userData) => {
    await usersCollection().doc(uid).set(userData);

    return {
        id: uid,
        ...userData
    };
};

const updateUserProfile = async (uid, updateData) => {
    const userRef = usersCollection().doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
        return null;
    }

    await userRef.update(updateData);

    return {
        id: uid,
        ...doc.data(),
        ...updateData
    };
};

module.exports = {
    getUserById,
    getUserByEmail,
    getAllUsers,
    createUserProfile,
    updateUserProfile
};
