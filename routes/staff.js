const express = require('express');
const {
  getStaff,
  getStaffMember,
  updateStaff,
  deleteStaff,
  checkIn,
  checkOut,
  getAttendance,
  getMyAttendance,
  getPayrollSummary
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('admin', 'manager'), getStaff);
router.get('/:id', protect, authorize('admin', 'manager'), getStaffMember);
router.put('/:id', protect, authorize('admin', 'manager'), updateStaff);
router.delete('/:id', protect, authorize('admin'), deleteStaff);

// Attendance routes
router.post('/checkin', protect, checkIn);
router.post('/checkout', protect, checkOut);
router.get('/attendance/all', protect, authorize('admin', 'manager'), getAttendance);
router.get('/attendance/my-attendance', protect, getMyAttendance);
router.get('/payroll/summary', protect, authorize('admin', 'manager'), getPayrollSummary);

module.exports = router;