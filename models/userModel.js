const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please add a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff', 'technician', 'customer'],
    default: 'customer'
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[\+]?[1-9][\d]{0,15}$/.test(v);
      },
      message: 'Please add a valid phone number'
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  // Staff specific fields
  salary: {
    type: Number,
    default: 0,
    min: 0
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  workingHours: {
    type: Number,
    default: 8,
    min: 0,
    max: 24
  },
  workingDays: {
    type: [String],
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday','saturday', 'sunday']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  // Customer specific fields
  dateOfBirth: Date,
  preferences: {
    newsletter: {
      type: Boolean,
      default: false
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  avatar: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for staff full profile
userSchema.virtual('staffProfile').get(function() {
  if (this.role === 'customer') return null;
  
  return {
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    salary: this.salary,
    joiningDate: this.joiningDate,
    workingHours: this.workingHours,
    workingDays: this.workingDays,
    isActive: this.isActive
  };
});

// Virtual for attendance records
userSchema.virtual('attendance', {
  ref: 'Attendance',
  localField: '_id',
  foreignField: 'staff'
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
userSchema.methods.correctPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if user is staff
userSchema.methods.isStaff = function() {
  return ['admin', 'manager', 'staff', 'technician'].includes(this.role);
};

// Check if user can manage products
userSchema.methods.canManageProducts = function() {
  return ['admin', 'manager'].includes(this.role);
};

// Check if user can manage orders
userSchema.methods.canManageOrders = function() {
  return ['admin', 'manager', 'staff'].includes(this.role);
};

module.exports = mongoose.model('User', userSchema);