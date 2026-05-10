const jwt = require("jsonwebtoken");
const User = require("../models/User.models");
const Admin = require("../models/Admin");

// ─────────────────────────────────────────────────
// verifyJWT — works for BOTH User and Admin tokens
// ─────────────────────────────────────────────────
exports.verifyJWT = async (req, res, next) => {
  try {
    // ✅ FIXED: was missing space after "Bearer" — tokens were never parsed correctly
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — no token provided",
      });
    }

    // Verify token signature
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (jwtErr) {
      // ✅ FIXED: was silently swallowing errors — requests would hang forever
      return res.status(401).json({
        success: false,
        message:
          jwtErr.name === "TokenExpiredError"
            ? "Token expired — please login again"
            : "Invalid token",
      });
    }

    // ✅ FIXED: now checks BOTH User AND Admin collections
    // Admin tokens have role:"admin", lookup Admin collection first
    let user = null;

    if (decodedToken.role === "admin") {
      user = await Admin.findById(decodedToken._id).select(
        "-password -refreshToken"
      );
    } else {
      user = await User.findById(decodedToken._id).select(
        "-password -refreshToken"
      );
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token — user not found",
      });
    }

    // Check if user is active (only for regular users)
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact your agency.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("verifyJWT error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
};

// ─────────────────────────────────────────────────
// Role Guards
// ─────────────────────────────────────────────────

exports.isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied — Admins only",
    });
  }
  next();
};

exports.isAgency = (req, res, next) => {
  if (req.user.role !== "agency") {
    return res.status(403).json({
      success: false,
      message: "Access denied — Agency owners only",
    });
  }
  next();
};

exports.isConductor = (req, res, next) => {
  if (req.user.role !== "conductor") {
    return res.status(403).json({
      success: false,
      message: "Access denied — Conductors only",
    });
  }
  next();
};

// ✅ NEW: Agency OR Admin can access (for shared dashboard data)
exports.isAgencyOrAdmin = (req, res, next) => {
  if (req.user.role !== "agency" && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied — Agency or Admin required",
    });
  }
  next();
};