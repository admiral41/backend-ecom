const Repair = require('../models/Repair');
const Customer = require('../models/Customer');

// @desc    Create new repair
// @route   POST /api/repairs
// @access  Private
exports.createRepair = async (req, res, next) => {
  try {
    const { customer, deviceType, brand, model, serialNumber, issueDescription, priority } = req.body;

    // Find or create customer
    let customerDoc;
    if (customer._id) {
      customerDoc = await Customer.findById(customer._id);
    } else {
      customerDoc = await Customer.create({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        customerType: 'walk-in'
      });
    }

    const repair = await Repair.create({
      customer: customerDoc._id,
      deviceType,
      brand,
      model,
      serialNumber,
      issueDescription,
      priority,
      technician: req.user.role === 'technician' ? req.user.id : null
    });

    const populatedRepair = await Repair.findById(repair._id)
      .populate('customer', 'name phone email')
      .populate('technician', 'name');

    res.status(201).json({
      success: true,
      data: populatedRepair
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Update repair status
// @route   PUT /api/repairs/:id/status
// @access  Private
exports.updateRepairStatus = async (req, res, next) => {
  try {
    const { status, diagnosis, estimatedCost, internalNotes } = req.body;

    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({
        success: false,
        error: 'Repair not found'
      });
    }

    repair.status = status;
    if (diagnosis) repair.diagnosis = diagnosis;
    if (estimatedCost) repair.estimatedCost = estimatedCost;
    if (internalNotes) repair.internalNotes = internalNotes;

    // Set completion date if status is completed
    if (status === 'completed') {
      repair.actualCompletion = new Date();
    }

    await repair.save();

    const populatedRepair = await Repair.findById(repair._id)
      .populate('customer', 'name phone email')
      .populate('technician', 'name');

    res.status(200).json({
      success: true,
      data: populatedRepair
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get repair by tracking ID
// @route   GET /api/repairs/tracking/:trackingId
// @access  Public
exports.getRepairByTrackingId = async (req, res, next) => {
  try {
    const repair = await Repair.findOne({ trackingId: req.params.trackingId })
      .populate('customer', 'name phone email')
      .populate('technician', 'name');

    if (!repair) {
      return res.status(404).json({
        success: false,
        error: 'Repair not found'
      });
    }

    // Return limited info for public access
    const publicInfo = {
      trackingId: repair.trackingId,
      deviceType: repair.deviceType,
      brand: repair.brand,
      model: repair.model,
      status: repair.status,
      estimatedCompletion: repair.estimatedCompletion,
      createdAt: repair.createdAt
    };

    res.status(200).json({
      success: true,
      data: publicInfo
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get all repairs with pagination
// @route   GET /api/repairs
// @access  Private
exports.getRepairs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;

    let query = Repair.find()
      .populate('customer', 'name phone email')
      .populate('technician', 'name')
      .sort('-createdAt');

    // Filter by status
    if (req.query.status) {
      query = query.where('status').equals(req.query.status);
    }

    // Filter by technician
    if (req.query.technician) {
      query = query.where('technician').equals(req.query.technician);
    }

    // Filter by priority
    if (req.query.priority) {
      query = query.where('priority').equals(req.query.priority);
    }

    const total = await Repair.countDocuments(query);
    const repairs = await query.skip(startIndex).limit(limit);

    res.status(200).json({
      success: true,
      count: repairs.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      },
      data: repairs
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get single repair
// @route   GET /api/repairs/:id
// @access  Private
exports.getRepair = async (req, res, next) => {
  try {
    const repair = await Repair.findById(req.params.id)
      .populate('customer', 'name phone email address')
      .populate('technician', 'name email')
      .populate('partsUsed.product', 'name brand model');

    if (!repair) {
      return res.status(404).json({
        success: false,
        error: 'Repair not found'
      });
    }

    res.status(200).json({
      success: true,
      data: repair
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};