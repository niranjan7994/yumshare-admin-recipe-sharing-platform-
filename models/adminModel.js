const mongoose = require("mongoose");

// Define the admin schema
const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

// Create the Admin model based on the schema
const Admin = mongoose.model("Admin", adminSchema);

// Export the Admin model
module.exports = Admin;
