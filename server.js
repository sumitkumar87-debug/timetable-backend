const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => console.log(err));

// ================= MODELS =================

// User Model
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});
const User = mongoose.model("User", userSchema);

// Timetable Model
const timetableSchema = new mongoose.Schema({
  userId: String,
  subjects: Array,
  schedule: Object,
  createdAt: {
    type: Date,
    default: Date.now
  }
});
const Timetable = mongoose.model("Timetable", timetableSchema);

// ================= ROUTES =================

// Test
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword
    });

    await user.save();

    res.json({ message: "User registered ✅" });

  } catch (error) {
    res.status(500).json({ error: "Signup error" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (error) {
    res.status(500).json({ error: "Login error" });
  }
});

// Middleware to verify token
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Generate timetable
app.post("/generate", (req, res) => {
  const { subjects } = req.body;

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const times = ["9-10", "10-11", "11-12", "12-1", "2-3", "3-4"];

  let schedule = {};
  days.forEach(day => schedule[day] = {});

  subjects.forEach(sub => {
    let count = sub.hours;

    while (count > 0) {
      let day = days[Math.floor(Math.random() * days.length)];
      let time = times[Math.floor(Math.random() * times.length)];

      if (!schedule[day][time]) {
        schedule[day][time] = sub.name;
        count--;
      }
    }
  });

  res.json(schedule);
});

// Save timetable (Protected)
app.post("/save", authMiddleware, async (req, res) => {
  try {
    const { subjects, schedule } = req.body;

    const newTimetable = new Timetable({
      userId: req.userId,
      subjects,
      schedule
    });

    await newTimetable.save();

    res.json({ message: "Saved successfully ✅" });

  } catch (error) {
    res.status(500).json({ error: "Save error" });
  }
});

// Get user timetables
app.get("/timetable", authMiddleware, async (req, res) => {
  try {
    const data = await Timetable.find({ userId: req.userId });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Fetch error" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});