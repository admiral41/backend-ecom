// routes/customers.js
const express = require('express');
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerOrders
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

router
  .route('/:id')
  .get(protect, getCustomer)
  .put(protect, updateCustomer)
  .delete(protect, authorize('admin'), deleteCustomer);

router
  .route('/:id/orders')
  .get(protect, getCustomerOrders);

module.exports = router;