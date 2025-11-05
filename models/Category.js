const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add category name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot be more than 50 characters']
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
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  image: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  // For tech store specific features
  features: [{
    name: String,
    values: [String],
    filterable: {
      type: Boolean,
      default: false
    }
  }],
  // SEO fields
  metaTitle: String,
  metaDescription: String,
  // For navigation display
  showInNavigation: {
    type: Boolean,
    default: true
  },
  navigationOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ displayOrder: 1 });
categorySchema.index({ showInNavigation: 1, navigationOrder: 1 });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

// Virtual for products count
categorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// Virtual for products
categorySchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category'
});

// Generate slug before saving
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true
    });
  }
  next();
});

// Static method to get category tree
categorySchema.statics.getCategoryTree = async function() {
  const categories = await this.find({ isActive: true })
    .populate('subcategories')
    .sort('displayOrder');

  const buildTree = (parentId = null) => {
    return categories
      .filter(category => 
        (parentId === null && !category.parent) || 
        (category.parent && category.parent.toString() === parentId)
      )
      .map(category => ({
        _id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        displayOrder: category.displayOrder,
        subcategories: buildTree(category._id.toString())
      }));
  };

  return buildTree();
};

// Method to get all descendant categories
categorySchema.methods.getDescendantCategories = async function() {
  const getAllChildren = async (parentId) => {
    const children = await this.find({ parent: parentId });
    let allChildren = [...children];
    
    for (const child of children) {
      const grandchildren = await getAllChildren(child._id);
      allChildren = allChildren.concat(grandchildren);
    }
    
    return allChildren;
  };

  return await getAllChildren(this._id);
};

module.exports = mongoose.model('Category', categorySchema);