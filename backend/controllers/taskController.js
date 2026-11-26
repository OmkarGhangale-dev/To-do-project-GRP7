const taskModel = require("../models/taskModel");
const categoryModel = require("../models/categoryModel");
const { Timestamp } = require("../config/db");

const allowedPriorities = ["Low", "Medium", "High", "Urgent"];
const allowedStatuses = ["Pending", "To Do", "In Progress", "In Review", "Completed"];

const validateCategory = async (categoryId, userId) => {
    if (categoryId === null || categoryId === "") {
        return true;
    }

    if (typeof categoryId !== "string") {
        return false;
    }

    const category = await categoryModel.getCategoryById(categoryId, userId);
    return Boolean(category);
};

// CREATE TASK
const createTask = async (req, res, next) => {
    try {
        const {
            title,
            description,
            categoryId,
            priority,
            status,
            dueDate,
            dueTime,
            category,
            tags,
            assignedTo,
            estimatedHours
        } = req.body;

        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Task title is required."
            });
        }

        if (title.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: "Task title cannot exceed 200 characters."
            });
        }

        if (description !== undefined && typeof description !== "string") {
            return res.status(400).json({
                success: false,
                message: "Description must be a string."
            });
        }

        if (description && description.length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Description cannot exceed 2000 characters."
            });
        }

        if (priority !== undefined && !allowedPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                message: "Priority must be Low, Medium, or High."
            });
        }

        if (status !== undefined && !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be Pending, In Progress, or Completed."
            });
        }

        if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
            const isValidCategory = await validateCategory(categoryId, req.user.uid);

            if (!isValidCategory) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid category or category does not belong to you."
                });
            }
        }

        let parsedDueDate = null;

        if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
            if (typeof dueDate !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Due date must be a valid date string."
                });
            }

            const date = new Date(dueDate);

            if (isNaN(date.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid due date."
                });
            }

            parsedDueDate = Timestamp.fromDate(date);
        }

        const now = Timestamp.now();

        const taskData = {
            userId: req.user.uid,
            title: title.trim(),
            description: description || "",
            categoryId: categoryId || null,
            priority: priority || "Medium",
            status: status || "Pending",
            dueDate: parsedDueDate,
            dueTime: typeof dueTime === "string" ? dueTime.trim() : null,
            category: typeof category === "string" ? category.trim() : null,
            tags: Array.isArray(tags) ? tags : [],
            assignedTo: typeof assignedTo === "string" ? assignedTo.trim() : null,
            estimatedHours: typeof estimatedHours === "number" ? estimatedHours : null,
            createdAt: now,
            updatedAt: now
        };

        const task = await taskModel.createTask(taskData);

        return res.status(201).json({
            success: true,
            message: "Task created successfully.",
            data: task
        });
    } catch (error) {
        next(error);
    }
};

// GET ALL USER TASKS
const getTasks = async (req, res, next) => {
    try {
        const tasks = await taskModel.getTasksByUser(req.user.uid);

        return res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        next(error);
    }
};

// GET SINGLE TASK
const getTask = async (req, res, next) => {
    try {
        const task = await taskModel.getTaskById(
            req.params.id,
            req.user.uid
        );

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        next(error);
    }
};

// UPDATE TASK
const updateTask = async (req, res, next) => {
    try {
        const {
            title,
            description,
            categoryId,
            priority,
            status,
            dueDate,
            dueTime,
            category,
            tags,
            assignedTo,
            estimatedHours
        } = req.body;

        const updateData = {};

        if (title !== undefined) {
            if (typeof title !== "string" || !title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Title must be a non-empty string."
                });
            }

            if (title.trim().length > 200) {
                return res.status(400).json({
                    success: false,
                    message: "Title cannot exceed 200 characters."
                });
            }

            updateData.title = title.trim();
        }

        if (description !== undefined) {
            if (typeof description !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Description must be a string."
                });
            }

            if (description.length > 2000) {
                return res.status(400).json({
                    success: false,
                    message: "Description cannot exceed 2000 characters."
                });
            }

            updateData.description = description;
        }

        if (categoryId !== undefined) {
            if (categoryId !== null && categoryId !== "") {
                const isValidCategory = await validateCategory(
                    categoryId,
                    req.user.uid
                );

                if (!isValidCategory) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid category or category does not belong to you."
                    });
                }
            }

            updateData.categoryId = categoryId || null;
        }

        if (priority !== undefined) {
            if (!allowedPriorities.includes(priority)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid priority."
                });
            }

            updateData.priority = priority;
        }

        if (status !== undefined) {
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status."
                });
            }

            updateData.status = status;
        }

        if (dueDate !== undefined) {
            if (dueDate === null || dueDate === "") {
                updateData.dueDate = null;
            } else {
                if (typeof dueDate !== "string") {
                    return res.status(400).json({
                        success: false,
                        message: "Due date must be a valid date string."
                    });
                }

                const date = new Date(dueDate);

                if (isNaN(date.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid due date."
                    });
                }

                updateData.dueDate = Timestamp.fromDate(date);
            }
        }

        if (dueTime !== undefined) {
            updateData.dueTime = typeof dueTime === "string" ? dueTime.trim() : null;
        }

        if (category !== undefined) {
            updateData.category = typeof category === "string" ? category.trim() : null;
        }

        if (tags !== undefined) {
            updateData.tags = Array.isArray(tags) ? tags : [];
        }

        if (assignedTo !== undefined) {
            updateData.assignedTo = typeof assignedTo === "string" ? assignedTo.trim() : null;
        }

        if (estimatedHours !== undefined) {
            updateData.estimatedHours = typeof estimatedHours === "number" ? estimatedHours : null;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update."
            });
        }

        updateData.updatedAt = Timestamp.now();

        const task = await taskModel.updateTask(
            req.params.id,
            req.user.uid,
            updateData
        );

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Task updated successfully.",
            data: task
        });
    } catch (error) {
        next(error);
    }
};

// DELETE TASK
const deleteTask = async (req, res, next) => {
    try {
        const deleted = await taskModel.deleteTask(
            req.params.id,
            req.user.uid
        );

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Task deleted successfully."
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTask,
    getTasks,
    getTask,
    updateTask,
    deleteTask
};