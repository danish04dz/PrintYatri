const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    passengerName: {
      type: String,
      trim: true,
      default: "Passenger",
    },

    // ✅ FIXED: was "numberPasanger: String" — wrong name + wrong type
    numberPassengers: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    fare: {
      type: Number,
      required: true,
      min: 0,
    },

    // ✅ NEW: per-passenger fare for reference
    farePerPassenger: {
      type: Number,
      required: true,
      min: 0,
    },

    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },

    pickupStop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stop",
      required: true,
    },

    dropStop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stop",
      required: true,
    },

    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },

    conductor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: true,
    },

    // ✅ NEW: ticket lifecycle status
    status: {
      type: String,
      enum: ["active", "cancelled", "refunded"],
      default: "active",
    },

    // ✅ NEW: payment mode for POS
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "card", "free"],
      default: "cash",
    },
  },
  { timestamps: true }
);

// Index for fast conductor history queries
ticketSchema.index({ conductor: 1, createdAt: -1 });
ticketSchema.index({ agency: 1, createdAt: -1 });
// ✅ NEW: Indexes for filtering
ticketSchema.index({ agency: 1, bus: 1, createdAt: -1 });
ticketSchema.index({ bus: 1, createdAt: -1 });
ticketSchema.index({ paymentMode: 1 });
ticketSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Ticket", ticketSchema);