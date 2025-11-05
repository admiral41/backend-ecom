const User = require('../models/userModel');
const Attendance = require('../models/Attendance');

// @desc    Get all staff members
// @route   GET /api/staff
// @access  Private/Admin
exports.getStaff = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;

    // Exclude customers from staff list
    let query = User.find({ role: { $ne: 'customer' } })
      .select('-password')
      .sort('-createdAt');

    // Filter by role
    if (req.query.role) {
      query = query.where('role').equals(req.query.role);
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      query = query.where('isActive').equals(req.query.isActive === 'true');
    }

    const total = await User.countDocuments({ role: { $ne: 'customer' } });
    const staff = await query.skip(startIndex).limit(limit);

    res.status(200).json({
      success: true,
      count: staff.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      },
      data: staff
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get single staff member
// @route   GET /api/staff/:id
// @access  Private/Admin
exports.getStaffMember = async (req, res, next) => {
  try {
    const staff = await User.findById(req.params.id).select('-password');

    if (!staff || staff.role === 'customer') {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    res.status(200).json({
      success: true,
      data: staff
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Private/Admin
exports.updateStaff = async (req, res, next) => {
  try {
    const staff = await User.findById(req.params.id);

    if (!staff || staff.role === 'customer') {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    const updatedStaff = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedStaff
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Delete staff member
// @route   DELETE /api/staff/:id
// @access  Private/Admin
exports.deleteStaff = async (req, res, next) => {
  try {
    const staff = await User.findById(req.params.id);

    if (!staff || staff.role === 'customer') {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Check in staff
// @route   POST /api/staff/checkin
// @access  Private
exports.checkIn = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      staff: req.user.id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: 'Already checked in for today'
      });
    }

    const attendance = await Attendance.create({
      staff: req.user.id,
      date: new Date(),
      checkIn: new Date(),
      status: 'present',
      location: req.body.location || { type: 'Point', coordinates: [0, 0] },
      ipAddress: req.ip
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('staff', 'name email role');

    res.status(201).json({
      success: true,
      data: populatedAttendance
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Check out staff
// @route   POST /api/staff/checkout
// @access  Private
exports.checkOut = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      staff: req.user.id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      },
      checkOut: { $exists: false }
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        error: 'No active check-in found for today'
      });
    }

    attendance.checkOut = new Date();
    attendance.breakTime = req.body.breakTime || 0;
    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('staff', 'name email role');

    res.status(200).json({
      success: true,
      data: populatedAttendance
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get staff attendance
// @route   GET /api/staff/attendance
// @access  Private/Admin
exports.getAttendance = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;

    let query = Attendance.find()
      .populate('staff', 'name email role')
      .sort('-date');

    // Filter by staff
    if (req.query.staff) {
      query = query.where('staff').equals(req.query.staff);
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query = query.where('date').gte(new Date(req.query.startDate)).lte(new Date(req.query.endDate));
    }

    // Filter by status
    if (req.query.status) {
      query = query.where('status').equals(req.query.status);
    }

    const total = await Attendance.countDocuments(query);
    const attendance = await query.skip(startIndex).limit(limit);

    res.status(200).json({
      success: true,
      count: attendance.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      },
      data: attendance
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get my attendance
// @route   GET /api/staff/my-attendance
// @access  Private
exports.getMyAttendance = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;

    let query = Attendance.find({ staff: req.user.id })
      .sort('-date');

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query = query.where('date').gte(new Date(req.query.startDate)).lte(new Date(req.query.endDate));
    }

    const total = await Attendance.countDocuments({ staff: req.user.id });
    const attendance = await query.skip(startIndex).limit(limit);

    // Calculate summary
    const summary = await Attendance.aggregate([
      {
        $match: { staff: req.user._id }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          totalHours: { $sum: '$hoursWorked' },
          averageHours: { $avg: '$hoursWorked' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: attendance.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      },
      summary: summary[0] || { totalDays: 0, totalHours: 0, averageHours: 0 },
      data: attendance
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get staff payroll summary
// @route   GET /api/staff/payroll
// @access  Private/Admin
exports.getPayrollSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const targetDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()) - 1, 1);

    const payroll = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: targetDate,
            $lt: new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1)
          },
          checkOut: { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'staff',
          foreignField: '_id',
          as: 'staffInfo'
        }
      },
      {
        $unwind: '$staffInfo'
      },
      {
        $group: {
          _id: '$staff',
          staffName: { $first: '$staffInfo.name' },
          staffEmail: { $first: '$staffInfo.email' },
          role: { $first: '$staffInfo.role' },
          salary: { $first: '$staffInfo.salary' },
          totalHours: { $sum: '$hoursWorked' },
          totalDays: { $sum: 1 }
        }
      },
      {
        $project: {
          staffName: 1,
          staffEmail: 1,
          role: 1,
          salary: 1,
          totalHours: 1,
          totalDays: 1,
          totalPay: {
            $multiply: ['$salary', '$totalHours']
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: payroll
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};