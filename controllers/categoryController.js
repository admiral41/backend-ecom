const Category = require('../models/Category');
const slugify = require('slugify');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;

    let query = Category.find()
      .populate('parent', 'name slug')
      .sort('displayOrder');

    // Filter by parent (for subcategories)
    if (req.query.parent) {
      if (req.query.parent === 'null') {
        query = query.where('parent').equals(null);
      } else {
        query = query.where('parent').equals(req.query.parent);
      }
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      query = query.where('isActive').equals(req.query.isActive === 'true');
    }

    const total = await Category.countDocuments(query);
    const categories = await query.skip(startIndex).limit(limit);

    res.status(200).json({
      success: true,
      count: categories.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      },
      data: categories
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get category tree
// @route   GET /api/categories/tree
// @access  Public
exports.getCategoryTree = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('subcategories')
      .populate('parent')
      .sort('displayOrder');

    // Build tree structure
    const buildTree = (parentId = null) => {
      return categories
        .filter(category => 
          (parentId === null && !category.parent) || 
          (category.parent && category.parent._id.toString() === parentId)
        )
        .map(category => ({
          _id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          image: category.image,
          subcategories: buildTree(category._id.toString())
        }));
    };

    const categoryTree = buildTree();

    res.status(200).json({
      success: true,
      data: categoryTree
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parent', 'name slug')
      .populate('subcategories');

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res, next) => {
  try {
    const slug = slugify(req.body.name, {
      lower: true,
      strict: true
    });

    // Check if slug already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Category with this name already exists'
      });
    }

    const category = await Category.create({
      ...req.body,
      slug
    });

    const populatedCategory = await Category.findById(category._id)
      .populate('parent', 'name slug');

    res.status(201).json({
      success: true,
      data: populatedCategory
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
exports.updateCategory = async (req, res, next) => {
  try {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // If name is being updated, update slug too
    if (req.body.name) {
      req.body.slug = slugify(req.body.name, {
        lower: true,
        strict: true
      });
    }

    category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('parent', 'name slug');

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Check if category has subcategories
    const subcategories = await Category.countDocuments({ parent: req.params.id });
    if (subcategories > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with subcategories. Please delete subcategories first.'
      });
    }

    await Category.findByIdAndDelete(req.params.id);

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