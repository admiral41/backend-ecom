// routes/products.js
const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateInventory,
  getLowStockProducts
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .get(getProducts)
  .post(protect, authorize('admin', 'manager'), createProduct);

router
  .route('/:id')
  .get(getProduct)
  .put(protect, authorize('admin', 'manager'), updateProduct)
  .delete(protect, authorize('admin'), deleteProduct);

router
  .route('/:id/inventory')
  .put(protect, authorize('admin', 'manager'), updateInventory);

router
  .route('/inventory/low-stock')
  .get(protect, authorize('admin', 'manager'), getLowStockProducts);

module.exports = router;