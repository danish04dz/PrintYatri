/**
 * createAdmin.js — Run this ONCE to seed the admin account
 * Usage: node createAdmin.js
 *
 * The Admin model's pre('save') hook handles password hashing automatically.
 * DO NOT manually hash the password here — that causes double-hashing.
 */

const mongoose = require("mongoose");
const Admin = require("./models/Admin");
require("dotenv").config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    const existingAdmin = await Admin.findOne({
      email: process.env.ADMIN_EMAIL,
    });

    if (existingAdmin) {
      console.log("⚠️  Admin already exists:", existingAdmin.email);
      console.log("   To reset password, delete the admin doc and re-run.");
      return;
    }

    // ✅ FIXED: Let the model's pre('save') hook hash the password.
    // Do NOT call bcrypt.hash() manually here.
    const newAdmin = new Admin({
      name: process.env.ADMIN_NAME?.trim() || "Admin",
      email: process.env.ADMIN_EMAIL?.toLowerCase().trim(),
      password: process.env.ADMIN_PASSWORD, // plain — model will hash it
      role: "admin",
    });

    await newAdmin.save();
    console.log("🎉 Admin created successfully!");
    console.log("   Email   :", newAdmin.email);
    console.log("   Name    :", newAdmin.name);
    console.log("   Login at: POST /api/admin/login");
  })
  .catch((err) => {
    console.error("❌ Error:", err.message);
  })
  .finally(() => {
    mongoose.connection.close();
    console.log("🔌 MongoDB connection closed.");
  });
