const express = require('express');
const verifyToken = require('../middleware/authMiddleware'); // Import token verification middleware
const multer = require('multer');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Recipe = require('../models/recipeModel'); // Assuming you have a Recipe model

const router = express.Router();

// Ensure uploads folder exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer configuration for image uploads with validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Store images in the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Generate a unique filename
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 2 MB
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(file.originalname.toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Images only!'));
    }
  },
});


// Get All Recipes API
router.get('/recipelist', verifyToken , async (req, res) => {
  try {
    // Fetch all recipes and populate the creator's name
    const recipes = await Recipe.find()
      .select('title image creatorId') // Select only necessary fields
      .populate('creatorId', 'name -_id'); // Populate the creator's name

    if (recipes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No recipes found',
      });
    }

    // Format the response to include id, title, creator name, and image URL
    const formattedRecipes = recipes.map((recipe) => ({
      id: recipe._id,
      title: recipe.title,
      creator: recipe.creatorId.name,
      imageUrl: `${req.protocol}://${req.get('host')}/${recipe.image}`, // Construct full image URL
    }));

    res.status(200).json({
      success: true,
      recipes: formattedRecipes,
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});


// Get recipes by search term
router.get('/search',verifyToken , async (req, res) => {
  const { search } = req.query;

  if (!search) {
    return res.status(400).json({
      success: false,
      message: 'Search term is required',
    });
  }

  try {
    // Perform case-insensitive search for recipe titles
    const recipes = await Recipe.find({
      title: { $regex: search, $options: 'i' }, // Case-insensitive search
    })
      .select('title image creatorId') // Select necessary fields
      .populate('creatorId', 'name -_id'); // Populate creator's name

    if (recipes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No recipes found for the given search term',
      });
    }

    // Format the response to include id, title, creator name, and image URL
    const formattedRecipes = recipes.map((recipe) => ({
      id: recipe._id,
      title: recipe.title,
      creator: recipe.creatorId.name,
      imageUrl: `${req.protocol}://${req.get('host')}/${recipe.image}`, // Construct full image URL
    }));

    res.status(200).json({
      success: true,
      recipes: formattedRecipes,
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});


// Add Recipe API
router.post(
  '/add',
  verifyToken,  // Token verification middleware
  upload.single('image'),
  [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('ingredients').notEmpty().withMessage('Ingredients are required').trim(),
    body('steps').notEmpty().withMessage('Steps are required').trim(),
    body('cookingTime')
      .isInt({ min: 1 })
      .withMessage('Cooking time must be a positive number'),
    body('difficulty')
      .isIn(['Easy', 'Medium', 'Hard'])
      .withMessage('Invalid difficulty level'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((error) => error.msg),
      });
    }

    try {
      const { title, ingredients, steps, cookingTime, difficulty } = req.body;

      // Check if the image file is uploaded
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Image is required' });
      }

      // Use the creatorId from the decoded token (req.user)
      const creatorId = req.user.userId;

      const newRecipe = new Recipe({
        title,
        ingredients,
        steps,
        cookingTime,
        difficulty,
        creatorId,
        image: req.file.path,
      });

      await newRecipe.save();

      res.status(201).json({ success: true, message: 'Recipe added successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);


// Edit Recipe API
router.put(
  '/edit/:id',
  verifyToken, // Token verification middleware
  upload.single('image'),
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('ingredients').optional().notEmpty().withMessage('Ingredients cannot be empty'),
    body('steps').optional().notEmpty().withMessage('Steps cannot be empty'),
    body('cookingTime')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Cooking time must be a positive number'),
    body('difficulty')
      .optional()
      .isIn(['Easy', 'Medium', 'Hard'])
      .withMessage('Invalid difficulty level'),
  ],
  async (req, res) => {
    const recipeId = req.params.id;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((error) => error.msg),
      });
    }

    try {
      // Retrieve creatorId from the token
      const creatorId = req.user.userId;

      // Find the recipe by ID
      const recipe = await Recipe.findById(recipeId);
      if (!recipe) {
        return res.status(404).json({ success: false, message: 'Recipe not found' });
      }

      // Verify if the logged-in user is the creator of the recipe
      if (recipe.creatorId.toString() !== creatorId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to edit this recipe',
        });
      }

      // Update fields only if they are provided
      recipe.title = req.body.title || recipe.title;
      recipe.ingredients = req.body.ingredients || recipe.ingredients;
      recipe.steps = req.body.steps || recipe.steps;
      recipe.cookingTime = req.body.cookingTime || recipe.cookingTime;
      recipe.difficulty = req.body.difficulty || recipe.difficulty;

      // If a new image is uploaded, replace the old one
      if (req.file) {
        if (recipe.image && fs.existsSync(recipe.image)) {
          fs.unlinkSync(recipe.image); // Remove the old image file
        }
        recipe.image = req.file.path;
      }

      // Save the updated recipe
      const updatedRecipe = await recipe.save();

      res.status(200).json({
        success: true,
        message: 'Recipe updated successfully',
        data: updatedRecipe,
      });
    } catch (error) {
      console.error('Error updating recipe:', error);
      res.status(500).json({ success: false, message: 'Failed to update the recipe' });
    }
  }
);

// Get Recipe Details
router.get('/details/:id', verifyToken , async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate('creatorId', 'name -_id');

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    // Increment the view count by 1
    recipe.viewCount = recipe.viewCount + 1;

    // Save the updated recipe document with the incremented view count
    await recipe.save();

    res.status(200).json({
      success: true,
      recipe: {
        title: recipe.title,
        image: `${req.protocol}://${req.get('host')}/${recipe.image}`,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        cookingTime: recipe.cookingTime,
        difficulty: recipe.difficulty,
        creator: recipe.creatorId,
      },
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// Delete Recipe API
router.delete('/delete/:id', verifyToken, async (req, res) => {
  const recipeId = req.params.id;

  try {
    // Retrieve creatorId from the token
    const creatorId = req.user.userId;

    console.log('Attempting to delete recipe:', { recipeId, creatorId });

    // Find the recipe by ID
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    // Verify if the logged-in user is the creator of the recipe
    if (recipe.creatorId.toString() !== creatorId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this recipe',
      });
    }

    // Delete the associated image file, if it exists
    if (recipe.image) {
      console.log('Deleting image file:', recipe.image);
      try {
        if (fs.existsSync(recipe.image)) {
          fs.unlinkSync(recipe.image);
        } else {
          console.warn('Image file does not exist:', recipe.image);
        }
      } catch (fileError) {
        console.error('Error deleting image file:', fileError);
      }
    }

    // Delete the recipe from the database
    await Recipe.findByIdAndDelete(recipeId);

    console.log('Recipe deleted successfully:', recipeId);
    res.status(200).json({ success: true, message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


module.exports = router;









