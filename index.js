const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectToDatabase = require("./database/db");
const navigationRoutes = require("./routes/navigationRoutes");

dotenv.config();

const app = express();

// Middleware
app.use(cors()); // Optional: enable CORS for all origins
app.use(express.json()); // Parse incoming JSON

// Connect to MongoDB
connectToDatabase();

// Routes
app.use("/api/navigation", navigationRoutes);

// Health check route (optional)
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
