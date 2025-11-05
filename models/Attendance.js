const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date
  },
  hoursWorked: {
    type: Number,
    default: 0,
    min: 0
  },
  breakTime: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'holiday', 'leave'],
    default: 'present'
  },
  notes: {
    type: String,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  ipAddress: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index for staff and date
attendanceSchema.index({ staff: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

// Pre-save to calculate hours worked
attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const diff = this.checkOut - this.checkIn;
    this.hoursWorked = (diff / (1000 * 60 * 60)) - (this.breakTime || 0);
    
    // Auto-detect late arrival (after 10 AM)
    const checkInHour = this.checkIn.getHours();
    if (checkInHour > 10) {
      this.status = 'late';
    }
  }
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);