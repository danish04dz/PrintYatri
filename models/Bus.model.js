const mongoose = require("mongoose");

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z]{2}\s?[0-9]{2}\s?[A-Z]{1,2}\s?[0-9]{4}$/,
        "Invalid Bus Number Format (e.g. UP 32 AB 1234)",
      ],
    },

    busName: {
      type: String,
      required: true,
      trim: true,
    },

    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },

    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: true,
    },

    assignedConductor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ✅ NEW: bus type for POS display
    busType: {
      type: String,
      enum: ["AC", "Non-AC", "Sleeper", "Semi-Sleeper"],
      default: "Non-AC",
    },

    // ✅ NEW: soft delete
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// ✅ NEW: Indexes for filtering and performance
busSchema.index({ agency: 1, isActive: 1 });
busSchema.index({ busNumber: 1 });
busSchema.index({ agency: 1, createdAt: -1 });

module.exports = mongoose.model("Bus", busSchema);