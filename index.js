const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const connectToDatabase = require("./database/db");
const navigationRoutes = require("./routes/navigationRoutes");
const sliderRoutes = require("./routes/sliderRoutes"); 

dotenv.config();

const app = express();

// Middleware
const corsOptions = {
  origin: true,
  credentials: true,
  optionSuccessStatus: 200
};
app.use(cors(corsOptions));

// Increase payload limit for file uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Connect to MongoDB
connectToDatabase();

// Routes
app.use("/api/navigation", navigationRoutes);
app.use("/api/sliders", sliderRoutes);

// Health check route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'File upload error',
      message: err.message
    });
  }

  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Upload directory: ${path.join(__dirname, 'public/uploads')}`);
});