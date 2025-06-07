const express = require("express");
const dotenv = require("dotenv")
const connectToDatabase = require("./database/db");

const app = express();
dotenv.config();

connectToDatabase();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

