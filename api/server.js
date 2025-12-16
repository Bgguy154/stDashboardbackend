import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();

/* ------------------ MIDDLEWARE ------------------ */
app.use(express.json());
app.use(
  cors({
    origin: "*", // baad mein frontend URL daal dena
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

/* ------------------ MONGODB (SERVERLESS SAFE) ------------------ */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/* ------------------ ROUTES ------------------ */
app.get("/api/courses", async (req, res) => {
  try {
    await connectDB();
    res.json([
      { id: 1, name: "Maths" },
      { id: 2, name: "Science" },
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "DB error" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

/* ------------------ EXPORT (MOST IMPORTANT) ------------------ */
export default app;
