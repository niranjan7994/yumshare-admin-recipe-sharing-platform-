const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    ingredients: {
      type: String,
      required: true,
      trim: true,
    },
    steps: {
      type: String,
      required: true,
      trim: true,
    },
    cookingTime: {
      type: Number,
      required: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ["Easy", "Medium", "Hard"], // Restrict to specific values
    },
    image: {
      type: String,
      required: true,
    },
    viewCount: {
      type: Number,
      default: 0, // Default value for view count
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true, // Mark it as required to ensure every recipe has a creator
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Add pagination plugin
recipeSchema.plugin(mongoosePaginate);

// Create the model
const Recipe = mongoose.model("Recipe", recipeSchema);

module.exports = Recipe;


