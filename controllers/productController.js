const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const InventoryMovement = require('../models/Inventory');
const slugify = require('slugify');

// @desc    Get all products with pagination
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    let query;
    const reqQuery = { ...req.query };

    const removeFields = ['select', 'sort', 'page', 'limit', 'search'];
    removeFields.forEach(param => delete reqQuery[param]);

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    query = Product.find(JSON.parse(queryStr))
      .populate('category', 'name slug');

    // Search functionality
    if (req.query.search) {
      const searchQuery = {
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
          { brand: { $regex: req.query.search, $options: 'i' } },
          { model: { $regex: req.query.search, $options: 'i' } },
          { tags: { $regex: req.query.search, $options: 'i' } }
        ]
      };
      query = query.and([searchQuery]);
    }

    // Price range filtering
    if (req.query.minPrice || req.query.maxPrice) {
      const priceFilter = {};
      if (req.query.minPrice) {
        priceFilter['variants.sellingPrice'] = { ...priceFilter['variants.sellingPrice'], $gte: parseFloat(req.query.minPrice) };
      }
      if (req.query.maxPrice) {
        priceFilter['variants.sellingPrice'] = { ...priceFilter['variants.sellingPrice'], $lte: parseFloat(req.query.maxPrice) };
      }
      query = query.and([priceFilter]);
    }

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const total = await Product.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    const products = await query;

    res.status(200).json({
      success: true,
      count: products.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      },
      data: products
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private
exports.createProduct = async (req, res, next) => {
  try {
    const slug = slugify(req.body.name, {
      lower: true,
      strict: true
    });

    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Generate SKUs and validate prices
    if (req.body.variants && req.body.variants.length > 0) {
      req.body.variants = req.body.variants.map((variant, index) => {
        const baseSku = slug.toUpperCase().substring(0, 6);
        const colorCode = variant.color.substring(0, 3).toUpperCase();
        const sizeCode = variant.size ? variant.size.toUpperCase() : 'ONE';
        
        // Validate that selling price is >= cost price
        if (variant.sellingPrice < variant.costPrice) {
          throw new Error(`Selling price (${variant.sellingPrice}) cannot be less than cost price (${variant.costPrice}) for variant ${variant.color}`);
        }

        // Validate that market price is >= selling price
        if (variant.marketPrice < variant.sellingPrice) {
          throw new Error(`Market price (${variant.marketPrice}) cannot be less than selling price (${variant.sellingPrice}) for variant ${variant.color}`);
        }

        return {
          ...variant,
          sku: `${baseSku}-${colorCode}-${sizeCode}-${String(index + 1).padStart(3, '0')}`,
          lastRestocked: new Date()
        };
      });
    }

    const product = await Product.create({
      ...req.body,
      slug
    });

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // If name is being updated, update slug too
    if (req.body.name) {
      req.body.slug = slugify(req.body.name, {
        lower: true,
        strict: true
      });
    }

    // Validate variant prices if updating variants
    if (req.body.variants) {
      req.body.variants.forEach(variant => {
        if (variant.sellingPrice < variant.costPrice) {
          throw new Error(`Selling price cannot be less than cost price for variant ${variant.color}`);
        }
        if (variant.marketPrice < variant.sellingPrice) {
          throw new Error(`Market price cannot be less than selling price for variant ${variant.color}`);
        }
      });
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

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

// @desc    Update product inventory
// @route   PUT /api/products/:id/inventory
// @access  Private
exports.updateInventory = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { variantSku, quantity, movementType, reason, notes, costPrice } = req.body;

    const product = await Product.findOne({ 'variants.sku': variantSku });

    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Product variant not found'
      });
    }

    const variant = product.variants.find(v => v.sku === variantSku);
    const previousStock = variant.quantity;

    let newStock = previousStock;

    switch (movementType) {
      case 'in':
        newStock = previousStock + quantity;
        variant.lastRestocked = new Date();
        // Update cost price if provided
        if (costPrice) {
          variant.costPrice = costPrice;
        }
        break;
      case 'out':
        newStock = previousStock - quantity;
        if (newStock < 0 && !product.allowBackorders) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            error: 'Insufficient stock'
          });
        }
        variant.totalSold += quantity;
        product.totalSold += quantity;
        break;
      case 'adjustment':
        newStock = quantity;
        break;
      default:
        newStock = previousStock;
    }

    if (newStock < 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Stock cannot be negative'
      });
    }

    variant.quantity = newStock;

    await product.save({ session });

    // Record inventory movement
    await InventoryMovement.create([{
      product: product._id,
      variantSku,
      movementType,
      quantity,
      previousStock,
      newStock,
      cost: costPrice || variant.costPrice,
      reason: reason || 'Inventory adjustment',
      notes,
      processedBy: req.user.id
    }], { session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: {
        product: product.name,
        variant: variantSku,
        previousStock,
        newStock,
        movementType,
        costPrice: variant.costPrice,
        profitPerUnit: variant.sellingPrice - variant.costPrice
      }
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      error: err.message
    });
  } finally {
    session.endSession();
  }
};

// @desc    Get low stock products
// @route   GET /api/products/inventory/low-stock
// @access  Private
exports.getLowStockProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      $or: [
        { 'variants.quantity': { $lte: 5 } },
        { 'variants.quantity': { $lte: '$lowStockThreshold' } }
      ],
      'variants.isActive': true
    }).populate('category', 'name');

    // Categorize by stock level
    const categorized = {
      red: [],    // Out of stock
      yellow: [], // Low stock (<= threshold)
      green: []   // Good stock
    };

    products.forEach(product => {
      product.variants.forEach(variant => {
        const stockInfo = {
          productId: product._id,
          productName: product.name,
          variantSku: variant.sku,
          color: variant.color,
          size: variant.size,
          category: product.category?.name,
          currentStock: variant.quantity,
          minStockLevel: variant.minStockLevel || product.lowStockThreshold,
          costPrice: variant.costPrice,
          sellingPrice: variant.sellingPrice,
          profitPerUnit: variant.sellingPrice - variant.costPrice,
          totalProfitPotential: (variant.sellingPrice - variant.costPrice) * variant.quantity
        };

        if (variant.quantity === 0) {
          categorized.red.push(stockInfo);
        } else if (variant.quantity <= stockInfo.minStockLevel) {
          categorized.yellow.push(stockInfo);
        } else {
          categorized.green.push(stockInfo);
        }
      });
    });

    res.status(200).json({
      success: true,
      data: categorized
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get inventory summary
// @route   GET /api/products/inventory/summary
// @access  Private
exports.getInventorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      { $unwind: '$variants' },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalVariants: { $sum: 1 },
          totalQuantity: { $sum: '$variants.quantity' },
          totalCostValue: { $sum: { $multiply: ['$variants.quantity', '$variants.costPrice'] } },
          totalSellingValue: { $sum: { $multiply: ['$variants.quantity', '$variants.sellingPrice'] } },
          totalMarketValue: { $sum: { $multiply: ['$variants.quantity', '$variants.marketPrice'] } },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$variants.quantity', 0] }, 1, 0]
            }
          },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$variants.quantity', 0] },
                    { $lte: ['$variants.quantity', '$variants.minStockLevel'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: summary[0] || {
        totalProducts: 0,
        totalVariants: 0,
        totalQuantity: 0,
        totalCostValue: 0,
        totalSellingValue: 0,
        totalMarketValue: 0,
        outOfStockCount: 0,
        lowStockCount: 0
      }
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};