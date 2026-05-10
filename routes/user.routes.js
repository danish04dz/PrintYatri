const express = require("express");
const router = express.Router();
const { verifyJWT } = require("../middleware/auth");
const { uploadUserPhoto } = require("../middleware/upload");

const {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken,
  updateProfile,
  uploadProfilePhoto,
} = require("../controllers/user.controller");

// ─── Public Routes ────────────────────────────────
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken); // ✅ NEW

// ─── Protected Routes ────────────────────────────
router.post("/logout", verifyJWT, logoutUser);
router.get("/me", verifyJWT, getCurrentUser);
router.put("/profile", verifyJWT, updateProfile);                           // ✅ NEW
router.post("/upload-photo", verifyJWT, uploadUserPhoto, uploadProfilePhoto); // ✅ NEW (Cloudinary)

module.exports = router;