const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    sku: {
      type: String,
      required: true
    },
    color: {
      type: String,
      required: true
    },
    size: String
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'Total price cannot be negative']
  },
  serialNumber: {
    type: String,
    trim: true
  },
  refundedQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Refunded quantity cannot be negative']
  },
  refundedAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refunded amount cannot be negative']
  }
}, {
  _id: true
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
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
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  shipping: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank-transfer', 'credit', 'wallet'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially-refunded'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'ready', 'completed', 'cancelled'],
    default: 'pending'
  },
  orderType: {
    type: String,
    enum: ['online', 'instore'],
    default: 'instore'
  },
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  refunds: [{
    amount: {
      type: Number,
      required: true,
      min: [0, 'Refund amount cannot be negative']
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    items: [{
      orderItemId: mongoose.Schema.Types.ObjectId,
      quantity: Number,
      amount: Number
    }]
  }],
  shippingAddress: {
    name: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  billingAddress: {
    name: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  // Delivery information
  expectedDelivery: Date,
  actualDelivery: Date,
  // Tracking information
  trackingNumber: String,
  carrier: String,
  // Loyalty points earned
  loyaltyPointsEarned: {
    type: Number,
    default: 0
  },
  // Loyalty points used
  loyaltyPointsUsed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: 1 });
orderSchema.index({ staff: 1 });
orderSchema.index({ 'items.variant.sku': 1 });

// Virtual for isRefunded
orderSchema.virtual('isRefunded').get(function() {
  return this.paymentStatus === 'refunded';
});

// Virtual for isPartiallyRefunded
orderSchema.virtual('isPartiallyRefunded').get(function() {
  return this.paymentStatus === 'partially-refunded';
});

// Virtual for total refunded amount
orderSchema.virtual('totalRefunded').get(function() {
  return this.refunds.reduce((total, refund) => total + refund.amount, 0);
});

// Virtual for net amount (total - refunds)
orderSchema.virtual('netAmount').get(function() {
  return this.total - this.totalRefunded;
});

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Get count of orders this month for sequential number
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const orderCount = await mongoose.model('Order').countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    this.orderNumber = `ORD-${year}${month}-${String(orderCount + 1).padStart(4, '0')}`;
  }
  next();
});

// Pre-save to calculate totals
orderSchema.pre('save', function(next) {
  // Calculate items subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // Calculate total
  this.total = this.subtotal + this.tax + this.shipping - this.discount;
  
  next();
});

// Method to add item to order
orderSchema.methods.addItem = function(product, variant, quantity, serialNumber = null) {
  const unitPrice = variant.price;
  const totalPrice = unitPrice * quantity;
  
  this.items.push({
    product: product._id,
    variant: {
      sku: variant.sku,
      color: variant.color,
      size: variant.size
    },
    quantity,
    unitPrice,
    totalPrice,
    serialNumber
  });
};

// Method to calculate refundable amount for an item
orderSchema.methods.getRefundableAmount = function(orderItemId) {
  const item = this.items.id(orderItemId);
  if (!item) return 0;
  
  const refundableQuantity = item.quantity - item.refundedQuantity;
  return refundableQuantity * item.unitPrice;
};

// Static method to get orders by date range
orderSchema.statics.getOrdersByDateRange = async function(startDate, endDate) {
  return this.find({
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    orderStatus: { $ne: 'cancelled' }
  }).populate('customer', 'name phone').populate('staff', 'name');
};

// Static method to get sales summary
orderSchema.statics.getSalesSummary = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        orderStatus: { $ne: 'cancelled' },
        paymentStatus: { $in: ['paid', 'partially-refunded'] }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        totalRefunds: { $sum: { $ifNull: ['$totalRefunded', 0] } },
        averageOrderValue: { $avg: '$total' }
      }
    }
  ]);

  return result[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    totalRefunds: 0,
    averageOrderValue: 0
  };
};

module.exports = mongoose.model('Order', orderSchema);