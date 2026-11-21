const { db } = require("../config/db");

// Lazy getter — called inside each function so Firebase is always initialized
const categoriesCollection = () => db.collection("categories");

const createCategory = async (categoryData) => {
    const docRef = await categoriesCollection().add(categoryData);

    return {
        id: docRef.id,
        ...categoryData
    };
};

const getCategoriesByUser = async (userId) => {
    try {
        const snapshot = await categoriesCollection()
            .where("userId", "==", userId)
            .get();

        const categories = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        categories.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?._seconds ? a.createdAt._seconds * 1000 : new Date(a.createdAt || 0).getTime());
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?._seconds ? b.createdAt._seconds * 1000 : new Date(b.createdAt || 0).getTime());
            return timeB - timeA;
        });

        return categories;
    } catch (error) {
        console.error("Error fetching categories by user:", error);
        throw error;
    }
};

const getCategoryById = async (categoryId, userId) => {
    const doc = await categoriesCollection().doc(categoryId).get();

    if (!doc.exists || doc.data().userId !== userId) {
        return null;
    }

    return {
        id: doc.id,
        ...doc.data()
    };
};

const updateCategory = async (categoryId, userId, updateData) => {
    const categoryRef = categoriesCollection().doc(categoryId);
    const doc = await categoryRef.get();

    if (!doc.exists || doc.data().userId !== userId) {
        return null;
    }

    await categoryRef.update(updateData);

    return {
        id: categoryId,
        ...doc.data(),
        ...updateData
    };
};

const deleteCategory = async (categoryId, userId) => {
    const categoryRef = categoriesCollection().doc(categoryId);
    const doc = await categoryRef.get();

    if (!doc.exists || doc.data().userId !== userId) {
        return false;
    }

    await categoryRef.delete();
    return true;
};

module.exports = {
    createCategory,
    getCategoriesByUser,
    getCategoryById,
    updateCategory,
    deleteCategory
};
