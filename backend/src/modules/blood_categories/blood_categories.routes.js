'use strict';
const express = require('express');
const router = express.Router();
const bloodCategoriesController = require('./blood_categories.controller');
const { authenticate, requireRole } = require('../../middlewares/auth.middleware');

// Authenticated users (manager, admin, driver) can view active categories
router.get('/', authenticate, bloodCategoriesController.getCategories);

// Admin exclusive management routes
router.get('/all', authenticate, requireRole('admin'), (req, res, next) => {
  req.query.all = 'true';
  bloodCategoriesController.getCategories(req, res, next);
});

router.get('/:id', authenticate, bloodCategoriesController.getCategoryById);
router.post('/', authenticate, requireRole('admin'), bloodCategoriesController.createCategory);
router.put('/:id', authenticate, requireRole('admin'), bloodCategoriesController.updateCategory);
router.delete('/:id', authenticate, requireRole('admin'), bloodCategoriesController.deleteCategory);

module.exports = router;
