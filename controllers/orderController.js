const mongoose = require('mongoose'); // Add this import
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const InventoryMovement = require('../models/Inventory');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customer, items, paymentMethod, notes, orderType, discount = 0 } = req.body;

    // Find or create customer
    let customerDoc;
    if (customer._id) {
      customerDoc = await Customer.findById(customer._id);
    } else {
      customerDoc = await Customer.create({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        customerType: 'walk-in'
      });
    }

    if (!customerDoc) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Customer not found or could not be created'
      });
    }

    let subtotal = 0;
    const orderItems = [];

    // Process each item
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          error: `Product not found: ${item.product}`
        });
      }

      const variant = product.variants.find(v => v.sku === item.variantSku);
      if (!variant) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          error: `Variant not found: ${item.variantSku}`
        });
      }

      // Check stock availability
      if (variant.quantity < item.quantity && !product.allowBackorders) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${product.name} - ${variant.color}${variant.size ? ` (${variant.size})` : ''}. Available: ${variant.quantity}`
        });
      }

      const itemTotal = variant.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        variant: {
          sku: variant.sku,
          color: variant.color,
          size: variant.size
        },
        quantity: item.quantity,
        unitPrice: variant.price,
        totalPrice: itemTotal,
        serialNumber: item.serialNumber
      });

      // Update inventory if trackInventory is enabled
      if (product.trackInventory) {
        variant.quantity -= item.quantity;
        product.totalSold += item.quantity;
        await product.save({ session });

        // Record inventory movement
        await InventoryMovement.create([{
          product: product._id,
          variantSku: variant.sku,
          movementType: 'out',
          quantity: item.quantity,
          previousStock: variant.quantity + item.quantity,
          newStock: variant.quantity,
          reference: 'order',
          reason: 'Sale',
          processedBy: req.user.id
        }], { session });
      }
    }

    // Calculate totals
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax - discount;

    // Create order
    const order = await Order.create([{
      customer: customerDoc._id,
      items: orderItems,
      subtotal,
      tax,
      discount,
      total,
      paymentMethod,
      paymentStatus: 'paid',
      orderStatus: orderType === 'online' ? 'pending' : 'completed',
      orderType: orderType || 'instore',
      staff: req.user.id,
      notes,
      shippingAddress: customer.shippingAddress,
      billingAddress: customer.billingAddress
    }], { session });

    // Update customer stats
    customerDoc.totalOrders += 1;
    customerDoc.totalSpent += total;
    customerDoc.lastPurchase = new Date();
    await customerDoc.save({ session });

    await session.commitTransaction();

    // Populate and return order
    const populatedOrder = await Order.findById(order[0]._id)
      .populate('customer', 'name phone email')
      .populate('staff', 'name')
      .populate('items.product', 'name brand model');

    res.status(201).json({
      success: true,
      data: populatedOrder
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Order creation error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  } finally {
    session.endSession();
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone email address')
      .populate('staff', 'name email')
      .populate('items.product', 'name brand model category');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Process refund
// @route   POST /api/orders/:id/refund
// @access  Private
exports.processRefund = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, reason } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    let totalRefund = 0;
    const refundItems = [];

    for (const refundItem of items) {
      const orderItem = order.items.id(refundItem.orderItemId);
      if (!orderItem) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          error: 'Order item not found'
        });
      }

      const refundQuantity = Math.min(refundItem.quantity, orderItem.quantity - (orderItem.refundedQuantity || 0));
      
      if (refundQuantity <= 0) {
        continue;
      }

      const refundAmount = (orderItem.unitPrice * refundQuantity);
      totalRefund += refundAmount;

      // Update order item
      orderItem.refundedQuantity = (orderItem.refundedQuantity || 0) + refundQuantity;
      orderItem.refundedAmount = (orderItem.refundedAmount || 0) + refundAmount;

      // Restock inventory
      const product = await Product.findById(orderItem.product);
      if (product && product.trackInventory) {
        const variant = product.variants.find(v => v.sku === orderItem.variant.sku);
        
        if (variant) {
          variant.quantity += refundQuantity;
          await product.save({ session });

          // Record inventory movement
          await InventoryMovement.create([{
            product: product._id,
            variantSku: variant.sku,
            movementType: 'in',
            quantity: refundQuantity,
            previousStock: variant.quantity - refundQuantity,
            newStock: variant.quantity,
            reference: 'refund',
            reason: `Refund: ${reason}`,
            processedBy: req.user.id
          }], { session });
        }
      }

      refundItems.push({
        orderItemId: refundItem.orderItemId,
        quantity: refundQuantity,
        amount: refundAmount
      });
    }

    if (totalRefund === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'No items to refund'
      });
    }

    // Add refund record
    order.refunds.push({
      amount: totalRefund,
      reason,
      processedBy: req.user.id,
      items: refundItems
    });

    // Update payment status
    if (totalRefund === order.total) {
      order.paymentStatus = 'refunded';
    } else if (totalRefund > 0) {
      order.paymentStatus = 'partially-refunded';
    }

    await order.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: {
        order: order._id,
        refundAmount: totalRefund,
        refundReason: reason,
        refundItems
      }
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Refund processing error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  } finally {
    session.endSession();
  }
};

// @desc    Get all orders with pagination
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;

    let query = Order.find()
      .populate('customer', 'name phone email')
      .populate('staff', 'name')
      .sort('-createdAt');

    // Filter by status
    if (req.query.status) {
      query = query.where('orderStatus').equals(req.query.status);
    }

    // Filter by payment status
    if (req.query.paymentStatus) {
      query = query.where('paymentStatus').equals(req.query.paymentStatus);
    }

    // Filter by order type
    if (req.query.orderType) {
      query = query.where('orderType').equals(req.query.orderType);
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query = query.where('createdAt').gte(new Date(req.query.startDate)).lte(new Date(req.query.endDate));
    }

    // Filter by customer
    if (req.query.customer) {
      query = query.where('customer').equals(req.query.customer);
    }

    const total = await Order.countDocuments(query);
    const orders = await query.skip(startIndex).limit(limit);

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      },
      data: orders
    });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, notes } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        orderStatus,
        ...(notes && { notes })
      },
      {
        new: true,
        runValidators: true
      }
    ).populate('customer', 'name phone email');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get orders by customer
// @route   GET /api/orders/customer/:customerId
// @access  Private
exports.getOrdersByCustomer = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;

    const orders = await Order.find({ customer: req.params.customerId })
      .populate('staff', 'name')
      .sort('-createdAt')
      .skip(startIndex)
      .limit(limit);

    const total = await Order.countDocuments({ customer: req.params.customerId });

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      },
      data: orders
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};