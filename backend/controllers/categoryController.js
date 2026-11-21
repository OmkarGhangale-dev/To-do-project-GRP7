const categoryModel = require("../models/categoryModel");
const { Timestamp } = require("../config/db");

// CREATE CATEGORY
const createCategory = async (req, res, next) => {
    try {
        const { categoryName } = req.body;

        if (
            typeof categoryName !== "string" ||
            !categoryName.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Category name is required."
            });
        }

        const categoryData = {
            userId: req.user.uid,
            categoryName: categoryName.trim(),
            createdAt: Timestamp.now()
        };

        const category = await categoryModel.createCategory(categoryData);

        res.status(201).json({
            success: true,
            message: "Category created successfully.",
            data: category
        });
    } catch (error) {
        next(error);
    }
};

// GET ALL CATEGORIES
const getCategories = async (req, res, next) => {
    try {
        const categories = await categoryModel.getCategoriesByUser(req.user.uid);

        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        next(error);
    }
};

// GET SINGLE CATEGORY
const getCategory = async (req, res, next) => {
    try {
        const category = await categoryModel.getCategoryById(
            req.params.id,
            req.user.uid
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found."
            });
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        next(error);
    }
};

// UPDATE CATEGORY
const updateCategory = async (req, res, next) => {
    try {
        const { categoryName } = req.body;

        if (
            typeof categoryName !== "string" ||
            !categoryName.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid category name is required."
            });
        }

        const category = await categoryModel.updateCategory(
            req.params.id,
            req.user.uid,
            { categoryName: categoryName.trim() }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Category updated successfully.",
            data: category
        });
    } catch (error) {
        next(error);
    }
};

// DELETE CATEGORY
const deleteCategory = async (req, res, next) => {
    try {
        const deleted = await categoryModel.deleteCategory(
            req.params.id,
            req.user.uid
        );

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Category not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Category deleted successfully."
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createCategory,
    getCategories,
    getCategory,
    updateCategory,
    deleteCategory
};