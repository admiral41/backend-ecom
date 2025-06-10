const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Dynamic storage configuration
const getStorage = (uploadPath) => multer.diskStorage({
  destination: function (req, file, cb) {
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter configuration
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
};

// Limits configuration
const limits = {
  fileSize: 5 * 1024 * 1024 // 5MB
};

// Create upload middleware for different types
const createUploader = (type) => {
  let uploadPath;
  
  switch(type) {
    case 'slider':
      uploadPath = path.join(__dirname, '../public/uploads/sliders/');
      break;
    case 'product':
      uploadPath = path.join(__dirname, '../public/uploads/products/');
      break;
    default:
      uploadPath = path.join(__dirname, '../public/uploads/');
  }
  
  return multer({ 
    storage: getStorage(uploadPath),
    fileFilter,
    limits
  });
};

// Specific uploaders
const sliderUpload = createUploader('slider');
const productUpload = createUploader('product');
const generalUpload = createUploader();

module.exports = {
  sliderUpload,
  productUpload,
  generalUpload
};