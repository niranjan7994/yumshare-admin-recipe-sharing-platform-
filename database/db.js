const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/yumshare_db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection failed:", err));
