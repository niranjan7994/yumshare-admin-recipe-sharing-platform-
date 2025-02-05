var express = require('express');
const bcrypt = require('bcrypt');
const Recipe = require('../models/recipeModel');
const User = require('../models/userModel');
const Admin = require('../models/adminModel');
var router = express.Router();


router.get('/', function(req, res, next) {
  res.redirect('/login');
});

// Admin login route (GET)
router.get('/login', (req, res) => {
  res.render('login', { message: null });
});

// Admin login route (POST)
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  Admin.findOne({ username })
    .then(admin => {
      if (!admin) {
        return res.render('login', { message: 'Incorrect Username.' });
      } else {
        return bcrypt.compare(password, admin.password)
          .then(isPasswordValid => {
            if (!isPasswordValid) {
              return res.render('login', { message: 'Incorrect password.' });
            } else {
              // Set session data
              req.session.adminId = admin._id;
              req.session.adminUsername = admin.username;
              console.log('Session after login:', req.session); // Check session object here
              res.redirect('/home'); // Change to your admin dashboard route
            }
          });
      }
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Internal Server Error');
    });
});


// Admin logout route
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Error logging out.');
    }
    console.log('Session destroyed:', req.session); // Should be null or undefined
    res.redirect('/login');
  });
});


// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session && req.session.adminId) {
    // If the session exists and adminId is set, proceed to the next middleware or route
    return next();
  } else {
    // If not authenticated, redirect to the login page
    res.redirect('/login');
  }
}


router.get('/home', isAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Get current page from query params
    const limit = 3; // Number of recipes per page

    // Fetch paginated recipes
    const options = {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: { path: 'creatorId', select: 'name' }, // Populate creator's name
    };

    const result = await Recipe.paginate({}, options);

    // Render the view with paginated recipes and pagination data
    res.render('Home', {
      recipes: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/mostviewedrecipe', isAuthenticated, async (req, res) => {
  try {
    // Fetch the recipes sorted by viewCount in descending order
    const recipes = await Recipe.find({}, 'title viewCount')
      .sort({ viewCount: -1 }) // Sort by viewCount in descending order
      .limit(10); // Limit to the top 10 most viewed recipes

    // Render the MostViewedRecipe page with the fetched recipes
    res.render('MostViewedRecipe', { recipes });
  } catch (error) {
    console.error('Error fetching most viewed recipes:', error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/recipelist', isAuthenticated, async (req, res) => {
  try {
    // Fetch all recipes with the creator's details populated
    const recipes = await Recipe.find()
      .populate('creatorId', 'name') // Assuming 'name' is a field in the User model
      // .sort({ createdAt: -1 }); // Sort by most recent recipes

    res.render('RecipeList', { recipes });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).send('Internal Server Error');
  }
});



router.get('/userlist', isAuthenticated, async (req, res) => {
  try {
    // Fetch all users from the database
    const users = await User.find({}, 'name email isBlocked'); // Retrieve relevant fields

    if (!users || users.length === 0) {
      return res.render('UserList', { users: [] });
    }

    // Render the UserList template with the fetched users
    res.render('UserList', { users });
  } catch (error) {
    console.error('Error fetching user list:', error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/userlist/:id/toggleBlock', isAuthenticated, async (req, res) => {
  try {
    const userId = req.params.id;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Toggle the isBlocked field
    user.isBlocked = !user.isBlocked;
    await user.save();

    // Redirect back to the User List page
    res.redirect('/userlist');
  } catch (error) {
    console.error('Error toggling block status:', error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/recipedetails/:id', isAuthenticated, async (req, res) => {
  try {
    const recipeId = req.params.id;

    // Fetch the recipe by its ID and populate the creator's details
    const recipe = await Recipe.findById(recipeId).populate('creatorId', 'name');

    if (!recipe) {
      return res.status(404).send('Recipe not found');
    }

   
    recipe.image =  `${req.protocol}://${req.get('host')}/${recipe.image.replace(/\\/g, '/')}`;

    res.render('RecipeDetails', { recipe });
    console.log(recipe);
  } catch (error) {
    console.error('Error fetching recipe details:', error);
    res.status(500).send('Internal Server Error');
  }
});


router.post("/deleterecipe/:id", isAuthenticated , async (req, res) => {
  try {
    const recipeId = req.params.id;

    // Find and delete the recipe
    const recipe = await Recipe.findByIdAndDelete(recipeId);
    if (!recipe) {
      return res.status(404).send("Recipe not found");
    }

    // Redirect back to the recipe list page
    res.redirect("/recipelist"); // Adjust the route as per your app's navigation
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get('/userprofile/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.params.id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Fetch recipes created by the user
    const recipes = await Recipe.find({ creatorId: userId }); // Use `creatorId` to fetch recipes

    res.render('UserProfile', { user, recipes });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).send('Internal Server Error');
  }
});


module.exports = router;
