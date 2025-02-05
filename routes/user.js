const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/userModel"); // Assuming you have a User model
const Recipe = require("../models/recipeModel"); // Assuming you have a Recipe model
const { body, validationResult } = require("express-validator");
const verifyToken = require("../middleware/authMiddleware"); // Token verification middleware

const router = express.Router();

// Get user profile and recipes
router.get("/profile", verifyToken, async (req, res) => {
  const userId = req.user.userId; // Use userId from the verified token

  if (!userId) {
    return res.status(400).json({ success: false, message: "User ID is required" });
  }

  try {
    // Fetch the user's details
    const user = await User.findById(userId).select("name email");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Fetch the user's recipes
    const recipes = await Recipe.find({ creatorId: userId }).select(
      "id title image viewCount"
    );

    recipes.forEach((recipe) => {
      recipe.image = `${req.protocol}://${req.get("host")}/${recipe.image}`;
    });

    res.status(200).json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
      },
      recipes,
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update user's name
router.patch("/updateName", verifyToken, async (req, res) => {
  const userId = req.user.userId; // Use userId from the verified token
  const { newName } = req.body;

  if (!newName) {
    return res.status(400).json({
      success: false,
      message: "New name is required",
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update the user's name
    user.name = newName;

    // Save the updated user
    await user.save();

    res.status(200).json({
      success: true,
      message: "Name updated successfully",
      user: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error updating name:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Change password API
router.patch(
  "/changePassword",
  verifyToken,
  // Validation for password fields
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .isLength({ max: 20 })
    .withMessage("Password cannot be longer than 20 characters")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Password must contain at least one special character"),
  body("confirmNewPassword")
    .notEmpty()
    .withMessage("Confirm new password is required")
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("New passwords do not match"),

    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Extract the first error message
        const errorMessage = errors.array()[0].msg;
        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }

    const userId = req.user.userId; // Use userId from the verified token
    const { currentPassword, newPassword } = req.body;

    try {
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Check if the new password is the same as the current password
      if (await bcrypt.compare(newPassword, user.password)) {
        return res.status(400).json({
          success: false,
          message: "New password cannot be the same as the current password",
        });
      }

      // Hash and save new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

module.exports = router;
