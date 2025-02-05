const express = require("express");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel"); // Import User model
const router = express.Router();

// Secret key for signing the JWT (store in environment variables for better security)
const JWT_SECRET = "my_jwt_secret_key";

// // for generating  secret key
// const crypto = require('crypto');
// const generateSecretKey = () => {
//   return crypto.randomBytes(32).toString('hex');
// };
// console.log(generateSecretKey());

// Signup API with express-validator
router.post(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email address"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long")
      .isLength({ max: 20 })
      .withMessage("Password cannot be longer than 20 characters")
      .matches(/[!@#$%^&*(),.?":{}|<>]/) // Password must contain at least one special character
      .withMessage("Password must contain at least one special character"),
    body("name")
      .isLength({ min: 3 })
      .withMessage("Name should be at least 3 characters long"),
  ],
  async (req, res) => {
    // Collect validation errors
    const errors = validationResult(req);

    // If validation fails, send errors back to the client (only message)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Save new user to the database
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
      });
      await newUser.save();

      // Send success response
      res.status(201).json({ message: "User created successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);


// Login API
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check if the user is blocked
    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account has been blocked.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "3h" } // Token expires in 3 hours
    );

    // Respond with token, email, and name
    res.status(200).json({
      message: "Login successful",
      token: token,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// // Login API
// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Find user by email
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: "Invalid email or password" });
//     }

//     // Verify password
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(400).json({ message: "Invalid email or password" });
//     }

//     // // Generate JWT token
//     // // const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET = generateSecretKey(), { expiresIn: '1h' });
//     // const token = jwt.sign(
//     //   { userId: user._id, email: user.email },
//     //    process.env.JWT_SECRET = generateSecretKey(), // Secret key to sign the JWT
//     //   { expiresIn: "1h" } // Set token expiration time (1 hour here)
//     // );

//     // Generate JWT token
//     const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, {
//       expiresIn: "3h", // Token expires in 3 hour
//     });

//     // Respond with token, email, and name
//     res.status(200).json({
//       message: "Login successful",
//       token: token,
//       email: user.email,
//       name: user.name,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

module.exports = router;
