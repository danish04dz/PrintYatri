const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");

dotenv.config();

const app = express();

// ─────────────────────────────────────────────────
// Security Headers
// ─────────────────────────────────────────────────
app.use(helmet());

// ─────────────────────────────────────────────────
// Request Logging
// ─────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ─────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:8081",
  "http://localhost:5173",
  "http://10.196.16.136:8081",
  "http://10.196.16.240:8081",
  "http://10.85.153.136:8081",
  "exp://10.98.155.136:8081",
  "https://printyatri.netlify.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, mobile apps, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─────────────────────────────────────────────────
// Body Parsers
// ─────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ─────────────────────────────────────────────────
// Rate Limiters
// ─────────────────────────────────────────────────

// Strict limiter for auth routes (brute force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  skip: (req) => process.env.NODE_ENV === "development",
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

app.use("/api/", apiLimiter);
app.use("/api/user/login", authLimiter);
app.use("/api/user/register", authLimiter);
app.use("/api/admin/login", authLimiter);

// ─────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PrintYatri API is running",
    version: "2.0.0",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

app.get("/", (req, res) => {
  res.json({ message: "PrintYatri API v2.0 — use /api/health to check status" });
});

// ─────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────
app.use("/api/user", require("./routes/user.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/agency", require("./routes/agency.routes"));
app.use("/api/conductor", require("./routes/conductor.routes"));
app.use("/api/data", require("./routes/bus.routes"));
app.use("/api/demo", require("./routes/demo.routes"));
app.use("/api/company", require("./routes/company.routes"));

// ─────────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─────────────────────────────────────────────────
// Global Error Handler (must be last)
// ─────────────────────────────────────────────────
app.use(errorHandler);

// ─────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// Bind the port immediately so Render (and other platforms) detect it right away.
// MongoDB connects in parallel — if it fails we log the error but keep the server
// alive so health-check routes remain reachable.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 PrintYatri Server running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV}`);
});

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    // Do NOT exit — keep the server alive so Render doesn't mark the deploy as failed
    // purely due to a transient DB connection issue.
  });