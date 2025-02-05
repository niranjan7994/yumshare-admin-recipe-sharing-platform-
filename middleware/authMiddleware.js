const jwt = require("jsonwebtoken");
const JWT_SECRET = "my_jwt_secret_key"; // Use your actual secret key here

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  // Get the token from the authorization header
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach the user data (userId, email) to the request object
    req.user = decoded;
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Invalid token" });
  }
};

module.exports = verifyToken;
