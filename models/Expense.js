const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: [
      'rent', 
      'utilities', 
      'salaries', 
      'supplies', 
      'maintenance', 
      'marketing', 
      'travel', 
      'equipment', 
      'software', 
      'other'
    ]
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank-transfer', 'upi'],
    required: true
  },
  receipt: {
    type: String,
    trim: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringInterval: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly']
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
expenseSchema.index({ date: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ vendor: 1 });

module.exports = mongoose.model('Expense', expenseSchema);