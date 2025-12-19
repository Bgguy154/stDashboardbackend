const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// =====================
// MIDDLEWARE - FIXED ORDER
// =====================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// FIXED CORS - Handles preflight & multiple origins
app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "http://127.0.0.1:3000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Handle preflight requests explicitly

// =====================
// MODELS
// =====================
const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  course: { type: String, required: true },
  enrollmentDate: { type: Date, default: Date.now },
  status: { type: String, default: "active", enum: ["active", "graduated", "inactive"] }
}, { timestamps: true });

const CourseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  duration: { type: Number, required: true, min: 1 },
  status: { type: String, default: "active", enum: ["active", "inactive"] }
}, { timestamps: true });

const Student = mongoose.models.Student || mongoose.model("Student", StudentSchema);
const Course = mongoose.models.Course || mongoose.model("Course", CourseSchema);

// =====================
// DATABASE CONNECTION
// =====================
async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  
  try {
    // ✅ Modern Mongoose connection (simple)
await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

// =====================
// COURSE ROUTES
// =====================
app.get("/api/courses", async (req, res) => {
  try {
    await connectDB();
    const courses = await Course.find().sort({ name: 1 });
    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Server error fetching courses" });
  }
});

app.get("/api/courses/:id", async (req, res) => {
  try {
    await connectDB();
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/courses", async (req, res) => {
  try {
    await connectDB();
    const course = await Course.create(req.body);
    res.status(201).json(course);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Course name already exists" });
    }
    res.status(500).json({ message: "Error creating course" });
  }
});

app.put("/api/courses/:id", async (req, res) => {
  try {
    await connectDB();
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: "Error updating course" });
  }
});

app.delete("/api/courses/:id", async (req, res) => {
  try {
    await connectDB();
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting course" });
  }
});

// =====================
// STUDENT ROUTES
// =====================
app.get("/api/students", async (req, res) => {
  try {
    await connectDB();
    const students = await Student.find().sort({ createdAt: -1 }).populate("course");
    res.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Server error fetching students" });
  }
});

app.get("/api/students/:id", async (req, res) => {
  try {
    await connectDB();
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/students", async (req, res) => {
  try {
    await connectDB();
    const student = await Student.create({
      ...req.body,
      enrollmentDate: req.body.enrollmentDate || new Date()
    });
    res.status(201).json(student);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Error creating student" });
  }
});

app.put("/api/students/:id", async (req, res) => {
  try {
    await connectDB();
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Error updating student" });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  try {
    await connectDB();
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting student" });
  }
});

// =====================
// DASHBOARD STATS
// =====================
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    await connectDB();
    const totalStudents = await Student.countDocuments();
    const activeCourses = await Course.countDocuments({ status: "active" });
    const graduates = await Student.countDocuments({ status: "graduated" });
    const successRate = totalStudents === 0 ? 0 : Math.round((graduates / totalStudents) * 100);

    res.json({
      totalStudents,
      activeCourses,
      graduates,
      successRate
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Server error fetching stats" });
  }
});

// =====================
// HEALTH CHECK
// =====================
app.get("/health", (req, res) => {
  res.json({ status: "UP", timestamp: new Date().toISOString() });
});

// =====================
// 404 HANDLER
// =====================
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// =====================
// GLOBAL ERROR HANDLER
// =====================
app.use((error, req, res, next) => {
  console.error("Global error:", error);
  res.status(500).json({ message: "Internal server error" });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  try {
    await connectDB();
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
  } catch (error) {
    console.error("Failed to start server:", error);
  }
});
