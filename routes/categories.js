// routes/categories.js
const express = require('express');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .get(getCategories)
  .post(protect, authorize('admin', 'manager'), createCategory);

router
  .route('/tree')
  .get(getCategoryTree);

router
  .route('/:id')
  .get(getCategory)
  .put(protect, authorize('admin', 'manager'), updateCategory)
  .delete(protect, authorize('admin'), deleteCategory);

module.exports = router;