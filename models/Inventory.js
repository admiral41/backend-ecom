const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantSku: {
    type: String,
    required: true,
    trim: true
  },
  movementType: {
    type: String,
    enum: ['in', 'out', 'adjustment', 'return', 'damage'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  reference: {
    type: String,
    trim: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  reason: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cost: {
    type: Number,
    default: 0,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
inventoryMovementSchema.index({ product: 1, date: -1 });
inventoryMovementSchema.index({ variantSku: 1 });
inventoryMovementSchema.index({ movementType: 1 });
inventoryMovementSchema.index({ date: 1 });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);