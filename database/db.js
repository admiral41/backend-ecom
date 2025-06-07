const mongoose = require("mongoose")
const dotenv = require("dotenv")

dotenv.config();

// const db = process.env.DB_URL

const connectToDatabase = () => {
    mongoose.connect(process.env.DB_URL).then(() => {
        console.log(`Database is connected`)
    })
}

module.exports = connectToDatabase;