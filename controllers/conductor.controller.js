const Bus = require("../models/Bus.model");
const Route = require("../models/Routes.model");
const Stop = require("../models/Stop.model");
const User = require("../models/User.models");
const Ticket = require("../models/Ticket.model");

// ─────────────────────────────────────────────────
// Get Routes and Stops for Conductor's Bus
// ─────────────────────────────────────────────────
exports.getRoutesAndStops = async (req, res, next) => {
  try {
    const conductor = await User.findById(req.user._id).populate("assignedBus");

    if (!conductor) {
      return res.status(404).json({ success: false, message: "Conductor not found" });
    }

    if (!conductor.assignedBus) {
      return res.status(400).json({
        success: false,
        message: "No bus assigned. Contact your agency admin.",
      });
    }

    const route = await Route.findOne({ bus: conductor.assignedBus._id });
    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not configured for this bus. Contact your agency.",
      });
    }

    const stops = await Stop.find({ route: route._id }).sort({ order: 1 });

    return res.status(200).json({
      success: true,
      bus: conductor.assignedBus,
      route,
      stops,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Generate Ticket (Core POS Action)
// ─────────────────────────────────────────────────
exports.generateTicket = async (req, res, next) => {
  try {
    const {
      passengerName,
      startRouteName,
      endRouteName,
      fare,            // fare per passenger
      numberPassengers,
      paymentMode,
    } = req.body;

    if (!startRouteName || !endRouteName || !fare) {
      return res.status(400).json({
        success: false,
        message: "startRouteName, endRouteName, and fare are required",
      });
    }

    const passengerCount = Number(numberPassengers) || 1;
    if (passengerCount < 1 || passengerCount > 50) {
      return res.status(400).json({
        success: false,
        message: "Passenger count must be between 1 and 50",
      });
    }

    const farePerPassenger = Number(fare);
    if (isNaN(farePerPassenger) || farePerPassenger <= 0) {
      return res.status(400).json({ success: false, message: "Invalid fare amount" });
    }

    // Get conductor with bus and agency
    const conductor = await User.findById(req.user._id)
      .populate("assignedBus")
      .populate("agency", "status subscriptionPlan trialExpiresAt agencyName logo advertiseImage");

    if (!conductor) {
      return res.status(404).json({ success: false, message: "Conductor not found" });
    }

    // Conductor inactive check
    if (conductor.isActive === false) {
      return res.status(403).json({
        success: false,
        isInactive: true,
        message: "Your account has been deactivated. Contact your agency admin.",
      });
    }

    if (!conductor.assignedBus) {
      return res.status(400).json({
        success: false,
        message: "No bus assigned to you. Contact your agency.",
      });
    }

    if (!conductor.agency) {
      return res.status(400).json({ success: false, message: "Agency not found" });
    }

    // Find route
    const route = await Route.findOne({ bus: conductor.assignedBus._id });
    if (!route) {
      return res.status(404).json({ success: false, message: "Route not configured" });
    }

    // Find pickup and drop stops (case-insensitive)
    const [pickupStop, dropStop] = await Promise.all([
      Stop.findOne({
        route: route._id,
        stopName: { $regex: new RegExp(`^${startRouteName}$`, "i") },
      }),
      Stop.findOne({
        route: route._id,
        stopName: { $regex: new RegExp(`^${endRouteName}$`, "i") },
      }),
    ]);

    if (!pickupStop) {
      return res.status(404).json({
        success: false,
        message: `Pickup stop "${startRouteName}" not found on this route`,
      });
    }

    if (!dropStop) {
      return res.status(404).json({
        success: false,
        message: `Drop stop "${endRouteName}" not found on this route`,
      });
    }

    if (pickupStop._id.toString() === dropStop._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Pickup and drop stop cannot be the same",
      });
    }

    // Generate unique ticket ID
    const ticketId = `PY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const totalFare = farePerPassenger * passengerCount;

    const ticket = await Ticket.create({
      passengerName: passengerName || "Passenger",
      numberPassengers: passengerCount,
      ticketId,
      fare: totalFare,
      farePerPassenger,
      route: route._id,
      pickupStop: pickupStop._id,
      dropStop: dropStop._id,
      bus: conductor.assignedBus._id,
      conductor: conductor._id,
      agency: conductor.agency._id,
      paymentMode: paymentMode || "cash",
    });

    const ticketDetails = await Ticket.findById(ticket._id)
      .populate("bus", "busNumber busName busType")
      .populate("route", "startRouteName endRouteName totalDuration")
      .populate("pickupStop", "stopName order")
      .populate("dropStop", "stopName order")
      .populate("conductor", "name phone")
      .populate("agency", "agencyName logo advertiseImage");

    return res.status(201).json({
      success: true,
      message: "Ticket generated successfully",
      ticket: ticketDetails,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Get Conductor Ticket History
// ─────────────────────────────────────────────────
exports.getConductorTickets = async (req, res, next) => {
  try {
    const { filter = "today" } = req.query;
    const conductorId = req.user._id;
    const now = new Date();

    let dateFilter = {};

    if (filter === "today") {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      dateFilter = { createdAt: { $gte: start, $lte: end } };
    } else if (filter === "yesterday") {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const start = new Date(y); start.setHours(0, 0, 0, 0);
      const end = new Date(y); end.setHours(23, 59, 59, 999);
      dateFilter = { createdAt: { $gte: start, $lte: end } };
    } else if (filter === "week") {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (filter === "month") {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    }

    const tickets = await Ticket.find({
      conductor: conductorId,
      status: "active",
      ...dateFilter,
    })
      .populate("pickupStop", "stopName")
      .populate("dropStop", "stopName")
      .populate("bus", "busName busNumber busType")
      .sort({ createdAt: -1 });

    const totalTickets = tickets.length;
    const totalAmount = tickets.reduce((sum, t) => sum + t.fare, 0);
    const totalPassengers = tickets.reduce((sum, t) => sum + t.numberPassengers, 0);

    return res.status(200).json({
      success: true,
      filter,
      totalTickets,
      totalAmount,
      totalPassengers,
      tickets,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Conductor Dashboard Stats — ✅ FIXED ObjectId casting
// ─────────────────────────────────────────────────
exports.getDashboardStats = async (req, res, next) => {
  try {
    const mongoose = require("mongoose");
    // ✅ CRITICAL FIX: aggregate $match needs ObjectId, not string
    const conductorId = new mongoose.Types.ObjectId(req.user._id);

    // Today's range
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [todayStats, weekStats, allTimeStats] = await Promise.all([
      Ticket.aggregate([
        {
          $match: {
            conductor: conductorId,
            status: "active",
            createdAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$fare" },
            tickets: { $sum: 1 },
            passengers: { $sum: "$numberPassengers" },
          },
        },
      ]),
      Ticket.aggregate([
        {
          $match: {
            conductor: conductorId,
            status: "active",
            createdAt: { $gte: weekStart },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$fare" },
            tickets: { $sum: 1 },
          },
        },
      ]),
      Ticket.aggregate([
        {
          $match: {
            conductor: conductorId,
            status: "active",
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$fare" },
            tickets: { $sum: 1 },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        today: {
          tickets: todayStats[0]?.tickets || 0,
          revenue: todayStats[0]?.revenue || 0,
          passengers: todayStats[0]?.passengers || 0,
        },
        week: {
          tickets: weekStats[0]?.tickets || 0,
          revenue: weekStats[0]?.revenue || 0,
        },
        allTime: {
          tickets: allTimeStats[0]?.tickets || 0,
          revenue: allTimeStats[0]?.revenue || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────────
// Get Conductor Profile — ✅ NEW
// ─────────────────────────────────────────────────
exports.getConductorProfile = async (req, res, next) => {
  try {
    const conductor = await User.findById(req.user._id)
      .select("-password -refreshToken")
      .populate("assignedBus", "busNumber busName busType totalSeats")
      .populate("agency", "agencyName logo city phone");

    if (!conductor) {
      return res.status(404).json({ success: false, message: "Conductor not found" });
    }

    return res.status(200).json({ success: true, conductor });
  } catch (error) {
    next(error);
  }
};