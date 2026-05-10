const jwt = require("jsonwebtoken");
const User = require("../models/User.models");
const Admin = require("../models/Admin");

// ─────────────────────────────────────────────────
// verifyJWT — works for BOTH User and Admin tokens
// ─────────────────────────────────────────────────
exports.verifyJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized — no token provided" });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: jwtErr.name === "TokenExpiredError"
          ? "Token expired — please login again"
          : "Invalid token",
      });
    }

    let user = null;
    if (decodedToken.role === "admin") {
      user = await Admin.findById(decodedToken._id).select("-password -refreshToken");
    } else {
      user = await User.findById(decodedToken._id)
        .select("-password -refreshToken")
        .populate("agency", "status subscriptionPlan trialExpiresAt maxBuses");
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid token — user not found" });
    }

    // ── Check user is active ──
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        isInactive: true,
        message: "Your account is deactivated. Contact your agency admin.",
      });
    }

    // ── Check agency status ──
    if (user.role !== "admin" && user.agency) {
      const { status, subscriptionPlan, trialExpiresAt } = user.agency;

      // Suspended — hard block for everyone
      if (status === "suspended") {
        return res.status(403).json({
          success: false,
          isSuspended: true,
          message: "Your agency has been suspended. Please contact PrintYatri Admin.",
        });
      }

      // Expired plan — hard block for everyone
      if (subscriptionPlan === "expired") {
        return res.status(403).json({
          success: false,
          isExpired: true,
          message: "Your agency subscription has expired. Please contact PrintYatri Admin to renew.",
        });
      }

      // Free trial expired by date — block conductor ticket generation (handled at route level)
      if (
        subscriptionPlan === "free_trial" &&
        trialExpiresAt &&
        new Date() > new Date(trialExpiresAt)
      ) {
        // Mark as expired in the request so downstream controllers can check
        req.trialExpired = true;
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("verifyJWT error:", error);
    return res.status(500).json({ success: false, message: "Internal server error during authentication" });
  }
};

// ─────────────────────────────────────────────────
// Role Guards
// ─────────────────────────────────────────────────
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied — Admins only" });
  }
  next();
};

exports.isAgency = (req, res, next) => {
  if (req.user.role !== "agency") {
    return res.status(403).json({ success: false, message: "Access denied — Agency owners only" });
  }
  next();
};

exports.isConductor = (req, res, next) => {
  if (req.user.role !== "conductor") {
    return res.status(403).json({ success: false, message: "Access denied — Conductors only" });
  }
  next();
};

exports.isAgencyOrAdmin = (req, res, next) => {
  if (req.user.role !== "agency" && req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied — Agency or Admin required" });
  }
  next();
};

// ─────────────────────────────────────────────────
// Plan Guard — blocks if plan is "free_trial" (ad tool restricted)
// Use on routes that require PRO plan (advertisement upload etc.)
// ─────────────────────────────────────────────────
exports.requireProPlan = (req, res, next) => {
  const plan = req.user?.agency?.subscriptionPlan;
  if (plan !== "paid") {
    return res.status(403).json({
      success: false,
      isPlanRestricted: true,
      message: "This feature requires a PRO plan. Please contact PrintYatri Admin to upgrade.",
    });
  }
  next();
};