'use strict';
const bloodCategoriesService = require('./blood_categories.service');

function getCategories(req, res, next) {
  try {
    const onlyActive = req.query.all !== 'true';
    const categories = bloodCategoriesService.getAllCategories({ onlyActive });
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

function getCategoryById(req, res, next) {
  try {
    const category = bloodCategoriesService.getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

function createCategory(req, res, next) {
  try {
    const category = bloodCategoriesService.createCategory(req.body);
    res.status(201).json({ success: true, data: category, message: 'Blood category created successfully.' });
  } catch (err) {
    next(err);
  }
}

function updateCategory(req, res, next) {
  try {
    const category = bloodCategoriesService.updateCategory(req.params.id, req.body);
    res.json({ success: true, data: category, message: 'Blood category updated successfully.' });
  } catch (err) {
    next(err);
  }
}

function deleteCategory(req, res, next) {
  try {
    const result = bloodCategoriesService.deleteCategory(req.params.id);
    res.json({ success: true, message: 'Blood category deleted successfully.', data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
