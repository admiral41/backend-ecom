const mongoose = require('mongoose');

const sliderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: false
  },
  offerText: {
    type: String,
    required: false
  },
  image: {
    type: String,
    required: true
  },
  buttons: [{
    text: {
      type: String,
      required: true
    },
    link: {
      type: String,
      required: true
    },
    variant: {
      type: String,
      enum: ['primary', 'secondary'],
      default: 'primary'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Add this before exporting the model
sliderSchema.pre('remove', function(next) {
  if (this.image) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../', this.image);
    
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting slider image:', err);
      next();
    });
  } else {
    next();
  }
});

module.exports = mongoose.model('Slider', sliderSchema);