const Product = require('../models/Product');
const InventoryMovement = require('../models/Inventory');

/**
 * Check and categorize inventory levels
 */
const checkInventoryAlerts = async () => {
  try {
    const products = await Product.find({
      'variants.isActive': true,
      'variants.quantity': { $exists: true }
    }).populate('category', 'name');

    const alerts = {
      red: [],    // Out of stock
      yellow: [], // Low stock
      green: [],  // Good stock
      reorder: [] // Need reordering
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
          reorderPoint: variant.reorderPoint || 10,
          cost: variant.cost,
          showOnWebsite: variant.showOnWebsite
        };

        if (variant.quantity === 0) {
          // Red zone - Out of stock
          alerts.red.push({
            ...stockInfo,
            alert: 'OUT_OF_STOCK',
            message: `${product.name} - ${variant.color}${variant.size ? ` (${variant.size})` : ''} is out of stock`
          });
        } else if (variant.quantity <= stockInfo.minStockLevel) {
          // Yellow zone - Low stock
          alerts.yellow.push({
            ...stockInfo,
            alert: 'LOW_STOCK',
            message: `${product.name} - ${variant.color}${variant.size ? ` (${variant.size})` : ''} is low on stock (${variant.quantity} left)`
          });

          // Check if needs reordering
          if (variant.quantity <= stockInfo.reorderPoint) {
            alerts.reorder.push({
              ...stockInfo,
              alert: 'REORDER_NEEDED',
              suggestedOrder: Math.max(stockInfo.reorderPoint * 2, 20), // Suggest ordering at least 20 or 2x reorder point
              message: `Consider reordering ${product.name} - ${variant.color}`
            });
          }
        } else {
          // Green zone - Good stock
          alerts.green.push({
            ...stockInfo,
            alert: 'IN_STOCK',
            message: `${product.name} - ${variant.color} has good stock level`
          });
        }
      });
    });

    return alerts;
  } catch (error) {
    console.error('Error checking inventory alerts:', error);
    return { red: [], yellow: [], green: [], reorder: [] };
  }
};

/**
 * Get inventory summary for dashboard
 */
const getInventorySummary = async () => {
  try {
    const [totalProducts, lowStockCount, outOfStockCount, totalValue] = await Promise.all([
      Product.countDocuments({ 'variants.0': { $exists: true } }),
      Product.countDocuments({ 'variants.quantity': { $lte: 5 } }),
      Product.countDocuments({ 'variants.quantity': 0 }),
      Product.aggregate([
        { $unwind: '$variants' },
        {
          $group: {
            _id: null,
            totalCostValue: { $sum: { $multiply: ['$variants.quantity', '$variants.cost'] } },
            totalRetailValue: { $sum: { $multiply: ['$variants.quantity', '$variants.price'] } },
            totalItems: { $sum: '$variants.quantity' }
          }
        }
      ])
    ]);

    const recentMovements = await InventoryMovement.find()
      .populate('product', 'name')
      .populate('processedBy', 'name')
      .sort('-createdAt')
      .limit(5);

    return {
      summary: {
        totalProducts,
        totalVariants: totalValue[0]?.totalItems || 0,
        lowStockCount,
        outOfStockCount,
        totalCostValue: totalValue[0]?.totalCostValue || 0,
        totalRetailValue: totalValue[0]?.totalRetailValue || 0
      },
      recentMovements
    };
  } catch (error) {
    console.error('Error getting inventory summary:', error);
    return {
      summary: {
        totalProducts: 0,
        totalVariants: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalCostValue: 0,
        totalRetailValue: 0
      },
      recentMovements: []
    };
  }
};

/**
 * Get stock movement history
 */
const getStockMovementHistory = async (productId, variantSku, days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const movements = await InventoryMovement.find({
      ...(productId && { product: productId }),
      ...(variantSku && { variantSku }),
      date: { $gte: startDate }
    })
    .populate('product', 'name')
    .populate('processedBy', 'name')
    .sort('-date');

    return movements;
  } catch (error) {
    console.error('Error getting stock movement history:', error);
    return [];
  }
};

module.exports = {
  checkInventoryAlerts,
  getInventorySummary,
  getStockMovementHistory
};