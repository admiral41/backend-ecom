const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  subcategories: [{
    type: String,
    trim: true,
    required: true
  }]
});

const navigationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  categories: [categorySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

navigationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Navigation = mongoose.model('Navigation', navigationSchema);

module.exports = Navigation;
