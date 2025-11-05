const express = require('express');
const {
  createOrder,
  getOrders,
  getOrder,
  processRefund,
  updateOrderStatus,
  getOrdersByCustomer
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getOrders)
  .post(protect, createOrder);

router.route('/customer/:customerId')
  .get(protect, getOrdersByCustomer);

router.route('/:id')
  .get(protect, getOrder);

router.route('/:id/refund')
  .post(protect, authorize('admin', 'manager'), processRefund);

router.route('/:id/status')
  .put(protect, authorize('admin', 'manager', 'staff'), updateOrderStatus);

module.exports = router;
