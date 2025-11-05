const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orderRoutes');
const repairRoutes = require('./routes/repairRoutes');
const staffRoutes = require('./routes/staff');
const customerRoutes = require('./routes/customers');
const navigationRoutes = require('./routes/navigationRoutes');
const sliderRoutes = require('./routes/sliderRoutes');

// Import admin seeder
const createAdminUser = require('./utils/adminSeeder');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
// app.use(xss());
// app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/sliders', sliderRoutes);

// Home route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Tech Store API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      orders: '/api/orders',
      repairs: '/api/repairs',
      staff: '/api/staff',
      customers: '/api/customers',     
      navigation: '/api/navigation'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('/', (req, res) => {
  res.status(404).json({
    success: false,
    error: '🔍 Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 Error Stack:', err.stack);
  
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

// Database connection and server start
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB Connected Successfully');
    
    // Create admin user on startup
    await createAdminUser();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
      console.log(`📧 Default Admin: admin@techstore.com`);
      console.log(`🔑 Default Password: admin123`);
      console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;