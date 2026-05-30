const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema(
  {
    startRouteName: {
      type: String,
      required: true,
      trim: true,
    },

    startTime: {
      type: String,
      trim: true,
    },

    endRouteName: {
      type: String,
      required: true,
      trim: true,
    },

    endTime: {
      type: String,
      trim: true,
    },

    // ✅ FIXED: was typo "totlaDuration"
    totalDuration: {
      type: String,
      trim: true,
    },

    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },

    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
    },
  },
  { timestamps: true }
);

// ✅ NEW: Indexes for filtering
routeSchema.index({ bus: 1 });
routeSchema.index({ agency: 1 });
routeSchema.index({ bus: 1, agency: 1 });

module.exports = mongoose.model("Route", routeSchema);