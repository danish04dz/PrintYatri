const User = require("../models/User.models");
const jwt = require("jsonwebtoken");

// ─────────────────────────────────────────────────
// Helper: Generate access + refresh tokens
// ─────────────────────────────────────────────────
const generateAccessAndRefreshTokens = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

// ─────────────────────────────────────────────────
// Cookie options — ✅ FIXED: secure only in production
// ─────────────────────────────────────────────────
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// ─────────────────────────────────────────────────
// Register User (Guest / Self Registration)
// ─────────────────────────────────────────────────
exports.registerUser = async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required (name, phone, email, password)",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    // Validate phone (10-digit Indian mobile)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number (10-digit Indian mobile required)",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Phone number already registered",
      });
    }

    const user = await User.create({ name, phone, email, password });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: createdUser,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Login User
// ─────────────────────────────────────────────────
exports.loginUser = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    if (!password || !(email || phone)) {
      return res.status(400).json({
        success: false,
        message: "Email/phone and password are required",
      });
    }

    const user = await User.findOne({ $or: [{ phone }, { email }] });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found. Please register first.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact your agency admin.",
      });
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    const loggedInUser = await User.findById(user._id)
      .select("-password -refreshToken")
      .populate("agency", "agencyName status logo phone city")
      .populate("assignedBus", "busNumber busName busType totalSeats");

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions())
      .cookie("refreshToken", refreshToken, cookieOptions())
      .json({
        success: true,
        message: "Login successful",
        user: loggedInUser,
        accessToken,
        refreshToken,
      });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Logout User
// ─────────────────────────────────────────────────
exports.logoutUser = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { refreshToken: null },
    });

    const opts = cookieOptions();
    return res
      .status(200)
      .clearCookie("accessToken", opts)
      .clearCookie("refreshToken", opts)
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Get Current User (used after app reload)
// ─────────────────────────────────────────────────
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password -refreshToken")
      .populate("agency", "agencyName status logo phone city")
      .populate("assignedBus", "busNumber busName busType totalSeats");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Refresh Access Token — ✅ NEW
// ─────────────────────────────────────────────────
exports.refreshAccessToken = async (req, res, next) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token. Please login again.",
      });
    }

    const user = await User.findById(decoded._id);
    if (!user || user.refreshToken !== incomingRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token mismatch. Please login again.",
      });
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions())
      .cookie("refreshToken", refreshToken, cookieOptions())
      .json({
        success: true,
        message: "Token refreshed",
        accessToken,
        refreshToken,
      });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Update Profile — ✅ NEW
// ─────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    if (!name && !phone) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update (name, phone)",
      });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number",
        });
      }
      updateData.phone = phone;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -refreshToken");

    return res.status(200).json({
      success: true,
      message: "Profile updated",
      user,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Upload Profile Photo (self) — ✅ NEW
// ─────────────────────────────────────────────────
exports.uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const imageUrl = req.file.path; // Cloudinary URL

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: imageUrl },
      { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json({
      success: true,
      message: "Profile photo updated",
      profileImage: imageUrl,
      user,
    });
  } catch (error) {
    next(error);
  }
};