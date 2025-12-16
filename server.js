const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* =====================
   CORS (SAFE & SIMPLE)
===================== */
app.use(
  cors({
    origin: "*", // pehle confirm karne ke liye
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());
app.use(express.json());

/* =====================
   MONGODB (SERVERLESS SAFE)
===================== */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        bufferCommands: false,
      })
      .then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB connection failed", err);
    res.status(500).json({ message: "Database connection failed" });
  }
});

/* =====================
   MODELS
===================== */
const Student = mongoose.models.Student || mongoose.model(
  "Student",
  new mongoose.Schema(
    {
      name: String,
      email: { type: String, unique: true },
      course: String,
      enrollmentDate: Date,
      status: { type: String, default: "active" },
    },
    { timestamps: true }
  )
);

const Course = mongoose.models.Course || mongoose.model(
  "Course",
  new mongoose.Schema(
    {
      name: { type: String, unique: true },
      description: String,
      duration: Number,
      status: { type: String, default: "active" },
    },
    { timestamps: true }
  )
);

/* =====================
   ROUTES
===================== */
app.get("/api/courses", async (req, res) => {
  const courses = await Course.find().sort({ name: 1 });
  res.json(courses);
});

app.post("/api/courses", async (req, res) => {
  const course = await Course.create(req.body);
  res.status(201).json(course);
});

app.get("/api/students", async (req, res) => {
  const students = await Student.find().sort({ createdAt: -1 });
  res.json(students);
});

app.post("/api/students", async (req, res) => {
  const student = await Student.create(req.body);
  res.status(201).json(student);
});

app.get("/api/dashboard/stats", async (req, res) => {
  const totalStudents = await Student.countDocuments();
  const activeStudents = await Student.countDocuments({ status: "active" });
  const totalCourses = await Course.countDocuments();

  res.json({ totalStudents, activeStudents, totalCourses });
});

app.get("/health", (req, res) => {
  res.json({ status: "UP", time: new Date() });
});

/* =====================
   EXPORT (VERCEL)
===================== */
module.exports = app;
