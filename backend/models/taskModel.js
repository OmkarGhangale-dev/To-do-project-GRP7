const { db } = require("../config/db");

// Lazy getter — called inside each function so Firebase is always initialized
const tasksCollection = () => db.collection("tasks");

const createTask = async (taskData) => {
    const docRef = await tasksCollection().add(taskData);

    return {
        id: docRef.id,
        ...taskData
    };
};

const getTasksByUser = async (userId) => {
    try {
        const snapshot = await tasksCollection()
            .where("userId", "==", userId)
            .get();

        const tasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        tasks.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?._seconds ? a.createdAt._seconds * 1000 : new Date(a.createdAt || 0).getTime());
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?._seconds ? b.createdAt._seconds * 1000 : new Date(b.createdAt || 0).getTime());
            return timeB - timeA;
        });

        return tasks;
    } catch (error) {
        console.error("Error fetching tasks by user:", error);
        throw error;
    }
};

const getTaskById = async (taskId, userId) => {
    const doc = await tasksCollection().doc(taskId).get();

    if (!doc.exists || doc.data().userId !== userId) {
        return null;
    }

    return {
        id: doc.id,
        ...doc.data()
    };
};

const updateTask = async (taskId, userId, updateData) => {
    const taskRef = tasksCollection().doc(taskId);
    const doc = await taskRef.get();

    if (!doc.exists || doc.data().userId !== userId) {
        return null;
    }

    await taskRef.update(updateData);

    return {
        id: taskId,
        ...doc.data(),
        ...updateData
    };
};

const deleteTask = async (taskId, userId) => {
    const taskRef = tasksCollection().doc(taskId);
    const doc = await taskRef.get();

    if (!doc.exists || doc.data().userId !== userId) {
        return false;
    }

    await taskRef.delete();
    return true;
};

module.exports = {
    createTask,
    getTasksByUser,
    getTaskById,
    updateTask,
    deleteTask
};
