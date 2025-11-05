const mongoose = require('mongoose');
const validator = require('validator');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add customer name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    validate: [validator.isEmail, 'Please add a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^[\+]?[1-9][\d]{0,15}$/.test(v);
      },
      message: 'Please add a valid phone number'
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  customerType: {
    type: String,
    enum: ['walk-in', 'registered', 'corporate'],
    default: 'walk-in'
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastPurchase: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Reference to user account if registered
  userAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Loyalty points
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  // Preferred contact method
  preferredContact: {
    type: String,
    enum: ['email', 'phone', 'whatsapp'],
    default: 'phone'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for quick search
customerSchema.index({ name: 'text', phone: 'text', email: 'text' });
customerSchema.index({ phone: 1 });
customerSchema.index({ customerType: 1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ lastPurchase: -1 });

// Virtual for orders
customerSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'customer'
});

// Virtual for repairs
customerSchema.virtual('repairs', {
  ref: 'Repair',
  localField: '_id',
  foreignField: 'customer'
});

// Virtual for customer value tier
customerSchema.virtual('valueTier').get(function() {
  if (this.totalSpent >= 10000) return 'platinum';
  if (this.totalSpent >= 5000) return 'gold';
  if (this.totalSpent >= 1000) return 'silver';
  return 'bronze';
});

// Update customer stats when order is created
customerSchema.statics.updateCustomerStats = async function(customerId, orderTotal) {
  await this.findByIdAndUpdate(customerId, {
    $inc: {
      totalOrders: 1,
      totalSpent: orderTotal
    },
    lastPurchase: new Date()
  });
};

// Method to check if customer is returning
customerSchema.methods.isReturningCustomer = function() {
  return this.totalOrders > 1;
};

module.exports = mongoose.model('Customer', customerSchema);