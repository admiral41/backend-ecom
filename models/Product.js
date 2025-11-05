const mongoose = require('mongoose');
const slugify = require('slugify');

const variantSchema = new mongoose.Schema({
  color: {
    type: String,
    required: [true, 'Variant color is required'],
    trim: true
  },
  size: {
    type: String,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // THREE PRICE TYPES
  costPrice: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: [0, 'Cost price cannot be negative'],
    description: 'Actual price cost to the seller (purchase price)'
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative'],
    description: 'Minimum selling price to the customer'
  },
  marketPrice: {
    type: Number,
    required: [true, 'Market price is required'],
    min: [0, 'Market price cannot be negative'],
    description: 'Market price to show to customer (strikethrough price)'
  },
  
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Quantity cannot be negative']
  },
  reserved: {
    type: Number,
    default: 0,
    min: [0, 'Reserved quantity cannot be negative']
  },
  images: [{
    type: String,
    trim: true
  }],
  barcode: {
    type: String,
    trim: true
  },
  weight: {
    type: Number,
    default: 0,
    min: [0, 'Weight cannot be negative']
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  showOnWebsite: {
    type: Boolean,
    default: true
  },
  inventoryStatus: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'],
    default: 'out_of_stock'
  },
  minStockLevel: {
    type: Number,
    default: 5,
    min: [0, 'Minimum stock level cannot be negative']
  },
  reorderPoint: {
    type: Number,
    default: 10,
    min: [0, 'Reorder point cannot be negative']
  },
  serialNumbers: [{
    type: String,
    trim: true
  }],
  // Inventory tracking
  lastRestocked: {
    type: Date
  },
  totalSold: {
    type: Number,
    default: 0,
    min: [0, 'Total sold cannot be negative']
  }
}, {
  _id: true
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add product name'],
    trim: true,
    maxlength: [200, 'Product name cannot be more than 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Short description cannot be more than 500 characters']
  },
  brand: {
    type: String,
    required: [true, 'Please add brand name'],
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Please select a category']
  },
  variants: [variantSchema],
  specifications: [{
    key: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: String,
      required: true,
      trim: true
    }
  }],
  features: [String],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  showOnWebsite: {
    type: Boolean,
    default: true
  },
  trackInventory: {
    type: Boolean,
    default: true
  },
  allowBackorders: {
    type: Boolean,
    default: false
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: [0, 'Low stock threshold cannot be negative']
  },
  taxRate: {
    type: Number,
    default: 0,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot be more than 100%']
  },
  warranty: {
    period: {
      type: Number,
      min: [0, 'Warranty period cannot be negative']
    },
    unit: {
      type: String,
      enum: ['days', 'months', 'years'],
      default: 'months'
    },
    terms: String
  },
  totalSold: {
    type: Number,
    default: 0,
    min: [0, 'Total sold cannot be negative']
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5']
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative']
    }
  },
  meta: {
    title: String,
    description: String,
    keywords: [String]
  },
  // Tech specific fields
  compatibility: [String],
  techSpecs: {
    processor: String,
    ram: String,
    storage: String,
    display: String,
    graphics: String,
    battery: String,
    os: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
productSchema.index({ name: 'text', description: 'text', brand: 'text', model: 'text' });
productSchema.index({ category: 1, isActive: 1, showOnWebsite: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ 'variants.sku': 1 }, { unique: true });
productSchema.index({ 'variants.showOnWebsite': 1 });
productSchema.index({ 'variants.inventoryStatus': 1 });
productSchema.index({ isFeatured: 1, showOnWebsite: 1 });
productSchema.index({ totalSold: -1 });
productSchema.index({ 'rating.average': -1 });

// Virtual for total quantity
productSchema.virtual('totalQuantity').get(function() {
  return this.variants.reduce((total, variant) => total + variant.quantity, 0);
});

// Virtual for available quantity
productSchema.virtual('availableQuantity').get(function() {
  return this.variants.reduce((total, variant) => total + (variant.quantity - variant.reserved), 0);
});

// Virtual for website availability
productSchema.virtual('isAvailableOnWebsite').get(function() {
  if (!this.showOnWebsite || !this.isActive) return false;
  
  return this.variants.some(variant => 
    variant.showOnWebsite && 
    variant.isActive && 
    (variant.quantity > 0 || this.allowBackorders)
  );
});

// Virtual for main image
productSchema.virtual('mainImage').get(function() {
  const variantWithImages = this.variants.find(v => v.images && v.images.length > 0);
  return variantWithImages ? variantWithImages.images[0] : null;
});

// Virtual for price range
productSchema.virtual('priceRange').get(function() {
  if (this.variants.length === 0) return { min: 0, max: 0 };
  
  const sellingPrices = this.variants.map(v => v.sellingPrice);
  const marketPrices = this.variants.map(v => v.marketPrice);
  
  return {
    sellingPrice: {
      min: Math.min(...sellingPrices),
      max: Math.max(...sellingPrices)
    },
    marketPrice: {
      min: Math.min(...marketPrices),
      max: Math.max(...marketPrices)
    }
  };
});

// Virtual for profit margin percentage
productSchema.virtual('profitMargin').get(function() {
  if (this.variants.length === 0) return 0;
  
  const totalCost = this.variants.reduce((sum, variant) => 
    sum + (variant.costPrice * variant.quantity), 0);
  const totalSelling = this.variants.reduce((sum, variant) => 
    sum + (variant.sellingPrice * variant.quantity), 0);
  
  if (totalCost === 0) return 0;
  return ((totalSelling - totalCost) / totalCost) * 100;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.variants.length === 0) return 0;
  
  const firstVariant = this.variants[0];
  if (firstVariant.marketPrice <= firstVariant.sellingPrice) return 0;
  
  return ((firstVariant.marketPrice - firstVariant.sellingPrice) / firstVariant.marketPrice) * 100;
});

// Generate slug before saving
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true
    });
  }
  next();
});

// Update inventory status before saving
productSchema.pre('save', function(next) {
  this.variants.forEach(variant => {
    if (variant.quantity === 0) {
      variant.inventoryStatus = 'out_of_stock';
    } else if (variant.quantity <= (variant.minStockLevel || this.lowStockThreshold)) {
      variant.inventoryStatus = 'low_stock';
    } else {
      variant.inventoryStatus = 'in_stock';
    }
  });
  next();
});

// Static method for website products
productSchema.statics.getWebsiteProducts = function() {
  return this.find({
    isActive: true,
    showOnWebsite: true,
    'variants.showOnWebsite': true,
    'variants.isActive': true,
    $or: [
      { 'variants.quantity': { $gt: 0 } },
      { allowBackorders: true }
    ]
  });
};

// Static method for low stock products
productSchema.statics.getLowStockProducts = function() {
  return this.find({
    'variants.quantity': { $lte: '$lowStockThreshold' },
    'variants.isActive': true,
    'variants.inventoryStatus': { $ne: 'discontinued' }
  });
};

// Method to update variant stock
productSchema.methods.updateVariantStock = async function(variantSku, quantityChange, movementType = 'adjustment') {
  const variant = this.variants.find(v => v.sku === variantSku);
  if (!variant) {
    throw new Error('Variant not found');
  }

  const previousStock = variant.quantity;
  let newStock = previousStock;

  switch (movementType) {
    case 'in':
      newStock = previousStock + quantityChange;
      variant.lastRestocked = new Date();
      break;
    case 'out':
      newStock = previousStock - quantityChange;
      if (newStock < 0 && !this.allowBackorders) {
        throw new Error('Insufficient stock');
      }
      variant.totalSold += quantityChange;
      this.totalSold += quantityChange;
      break;
    case 'adjustment':
      newStock = quantityChange;
      break;
    default:
      newStock = previousStock;
  }

  variant.quantity = Math.max(0, newStock);
  await this.save();

  return {
    variant,
    previousStock,
    newStock,
    movementType
  };
};

module.exports = mongoose.model('Product', productSchema);