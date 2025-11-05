const mongoose = require('mongoose');

const repairSchema = new mongoose.Schema({
  trackingId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  deviceType: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  serialNumber: {
    type: String,
    trim: true
  },
  issueDescription: {
    type: String,
    required: true,
    trim: true
  },
  diagnosis: {
    type: String,
    trim: true
  },
  estimatedCost: {
    type: Number,
    default: 0,
    min: 0
  },
  actualCost: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: [
      'received', 
      'diagnosing', 
      'waiting-parts', 
      'in-progress', 
      'testing', 
      'ready', 
      'completed', 
      'cancelled'
    ],
    default: 'received'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  partsUsed: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    variant: {
      sku: String,
      color: String,
      size: String
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    unitPrice: Number,
    totalPrice: Number
  }],
  estimatedCompletion: {
    type: Date
  },
  actualCompletion: {
    type: Date
  },
  customerNotes: {
    type: String,
    trim: true
  },
  internalNotes: {
    type: String,
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }],
  isWarranty: {
    type: Boolean,
    default: false
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partially-paid'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes
repairSchema.index({ trackingId: 1 });
repairSchema.index({ customer: 1 });
repairSchema.index({ status: 1 });
repairSchema.index({ createdAt: 1 });

// Pre-save middleware to generate tracking ID
repairSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('Repair').countDocuments();
    this.trackingId = `REP-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Repair', repairSchema);