const mongoose = require("mongoose");

const agencySchema = new mongoose.Schema(
  {
    agencyName: {
      type: String,
      required: true,
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ NEW: contact details
    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    // ✅ NEW: transport license
    licenseNumber: {
      type: String,
      trim: true,
    },

    // ✅ NEW: agency logo / owner profile photo (Cloudinary URL)
    logo: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },

    subscriptionPlan: {
      type: String,
      enum: ["free_trial", "paid", "expired"],
      default: "free_trial",
    },

    trialExpiresAt: {
      type: Date,
    },

    // ✅ NEW: plan-based bus limit
    maxBuses: {
      type: Number,
      default: 5,
    },

    // ✅ NEW: local shop advertisement image (shows on printed ticket bottom)
    advertiseImage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Agency", agencySchema);