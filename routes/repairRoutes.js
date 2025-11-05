const express = require('express');
const {
  createRepair,
  getRepairs,
  getRepair,
  updateRepairStatus,
  getRepairByTrackingId
} = require('../controllers/repairController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getRepairs);

router.post('/', protect, createRepair);

router.get('/tracking/:trackingId', getRepairByTrackingId);

router.get('/:id', protect, getRepair);

router.put('/:id', protect, authorize('admin', 'manager', 'technician'), updateRepairStatus);

module.exports = router;