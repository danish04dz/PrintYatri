const Bus = require("../models/Bus.model");
const Route = require("../models/Routes.model");
const Stop = require("../models/Stop.model");
const User = require("../models/User.models");
const Agency = require("../models/Agency.model");
const Ticket = require("../models/Ticket.model");

// ─────────────────────────────────────────────────
// Helper: Get agency for the logged-in agency owner
// ─────────────────────────────────────────────────
const getAgencyForOwner = async (userId) => {
  const agency = await Agency.findOne({ owner: userId });
  return agency;
};

// ─────────────────────────────────────────────────
// Add Bus
// ─────────────────────────────────────────────────
exports.addBus = async (req, res, next) => {
  try {
    const { busNumber, busName, totalSeats, busType } = req.body;

    if (!busNumber || !busName || !totalSeats) {
      return res.status(400).json({
        success: false,
        message: "busNumber, busName, and totalSeats are required",
      });
    }

    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    if (agency.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Your agency is not approved yet. Contact admin.",
      });
    }

    // Check bus count vs plan limit
    const busCount = await Bus.countDocuments({ agency: agency._id, isActive: true });
    if (busCount >= agency.maxBuses) {
      return res.status(403).json({
        success: false,
        message: `Bus limit reached (${agency.maxBuses}). Upgrade your plan.`,
      });
    }

    const existing = await Bus.findOne({ busNumber: busNumber.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A bus with this number is already registered",
      });
    }

    const newBus = await Bus.create({
      busNumber,
      busName,
      totalSeats,
      busType: busType || "Non-AC",
      agency: agency._id,
    });

    return res.status(201).json({
      success: true,
      message: "Bus added successfully",
      bus: newBus,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Get All Buses of Agency — ✅ NEW
// ─────────────────────────────────────────────────
exports.getBuses = async (req, res, next) => {
  try {
    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const buses = await Bus.find({ agency: agency._id, isActive: true })
      .populate("assignedConductor", "name phone profileImage")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, buses });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Update Bus — ✅ NEW
// ─────────────────────────────────────────────────
exports.updateBus = async (req, res, next) => {
  try {
    const { busId } = req.params;
    const { busName, totalSeats, busType } = req.body;

    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const bus = await Bus.findOne({ _id: busId, agency: agency._id });
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found or does not belong to your agency",
      });
    }

    if (busName) bus.busName = busName.trim();
    if (totalSeats) bus.totalSeats = totalSeats;
    if (busType) bus.busType = busType;
    await bus.save();

    return res.status(200).json({ success: true, message: "Bus updated", bus });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Delete Bus (soft delete) — ✅ NEW
// ─────────────────────────────────────────────────
exports.deleteBus = async (req, res, next) => {
  try {
    const { busId } = req.params;

    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const bus = await Bus.findOne({ _id: busId, agency: agency._id });
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found" });
    }

    // Unassign conductor first
    if (bus.assignedConductor) {
      await User.findByIdAndUpdate(bus.assignedConductor, { assignedBus: null });
    }

    bus.isActive = false;
    bus.assignedConductor = null;
    await bus.save();

    return res.status(200).json({ success: true, message: "Bus removed successfully" });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Add Routes and Stops
// ─────────────────────────────────────────────────
exports.addRoutesAndStops = async (req, res, next) => {
  try {
    const { busNumber, startRouteName, startTime, endRouteName, endTime, totalDuration, stops } = req.body;

    if (!busNumber || !startRouteName || !endRouteName || !stops) {
      return res.status(400).json({
        success: false,
        message: "busNumber, startRouteName, endRouteName, and stops are required",
      });
    }

    if (!Array.isArray(stops) || stops.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Stops must be an array with at least 2 stops",
      });
    }

    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const bus = await Bus.findOne({
      busNumber: busNumber.toUpperCase(),
      agency: agency._id,
    });
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found in your agency",
      });
    }

    // Check if route already exists — allow update
    const existingRoute = await Route.findOne({ bus: bus._id });
    if (existingRoute) {
      // Update existing route
      existingRoute.startRouteName = startRouteName;
      existingRoute.startTime = startTime;
      existingRoute.endRouteName = endRouteName;
      existingRoute.endTime = endTime;
      existingRoute.totalDuration = totalDuration; // ✅ FIXED: was "totlaDuration" in old model
      await existingRoute.save();

      // Delete old stops and re-add
      await Stop.deleteMany({ route: existingRoute._id });
      const stopDocs = stops.map((s) => ({
        stopName: s.stopName,
        order: s.order,
        route: existingRoute._id,
      }));
      const newStops = await Stop.insertMany(stopDocs);

      return res.status(200).json({
        success: true,
        message: "Route and stops updated",
        route: existingRoute,
        stops: newStops,
      });
    }

    // Create new route
    const newRoute = await Route.create({
      startRouteName,
      startTime,
      endRouteName,
      endTime,
      totalDuration, // ✅ FIXED
      bus: bus._id,
      agency: agency._id,
    });

    const stopDocs = stops.map((s) => ({
      stopName: s.stopName,
      order: s.order,
      route: newRoute._id,
    }));
    const createdStops = await Stop.insertMany(stopDocs);

    return res.status(201).json({
      success: true,
      message: "Route and stops created successfully",
      route: newRoute,
      stops: createdStops,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Update Route — ✅ NEW
// ─────────────────────────────────────────────────
exports.updateRoute = async (req, res, next) => {
  try {
    const { routeId } = req.params;
    const { startRouteName, startTime, endRouteName, endTime, totalDuration, stops } = req.body;

    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const route = await Route.findOne({ _id: routeId, agency: agency._id });
    if (!route) {
      return res.status(404).json({ success: false, message: "Route not found" });
    }

    if (startRouteName) route.startRouteName = startRouteName;
    if (startTime) route.startTime = startTime;
    if (endRouteName) route.endRouteName = endRouteName;
    if (endTime) route.endTime = endTime;
    if (totalDuration) route.totalDuration = totalDuration;
    await route.save();

    if (stops && Array.isArray(stops) && stops.length >= 2) {
      await Stop.deleteMany({ route: route._id });
      const stopDocs = stops.map((s) => ({
        stopName: s.stopName,
        order: s.order,
        route: route._id,
      }));
      await Stop.insertMany(stopDocs);
    }

    const updatedStops = await Stop.find({ route: route._id }).sort({ order: 1 });

    return res.status(200).json({
      success: true,
      message: "Route updated",
      route,
      stops: updatedStops,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Register Conductor
// ─────────────────────────────────────────────────
exports.registerConductor = async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "name, phone, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const existing = await User.findOne({ $or: [{ phone }, { email }] });
    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          existing.email === email
            ? "Email already registered"
            : "Phone already registered",
      });
    }

    const conductor = await User.create({
      name,
      phone,
      email,
      password,
      role: "conductor",
      agency: agency._id,
    });

    const created = await User.findById(conductor._id).select(
      "-password -refreshToken"
    );

    return res.status(201).json({
      success: true,
      message: "Conductor registered successfully",
      conductor: created,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Get All Conductors of Agency — ✅ NEW
// ─────────────────────────────────────────────────
exports.getConductors = async (req, res, next) => {
  try {
    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const conductors = await User.find({ agency: agency._id, role: "conductor" })
      .select("-password -refreshToken")
      .populate("assignedBus", "busNumber busName busType")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: conductors.length,
      conductors,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Assign Conductor to Bus
// ─────────────────────────────────────────────────
exports.assignConductor = async (req, res, next) => {
  try {
    const { phone, email, busNumber } = req.body;

    if (!(phone || email) || !busNumber) {
      return res.status(400).json({
        success: false,
        message: "phone/email and busNumber are required",
      });
    }

    const conductor = await User.findOne({ $or: [{ phone }, { email }] });
    if (!conductor) {
      return res.status(404).json({ success: false, message: "Conductor not found" });
    }

    if (conductor.role !== "conductor") {
      return res.status(400).json({
        success: false,
        message: "This user is not a conductor",
      });
    }

    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    // ✅ FIXED: was crashing when conductor.agency is null
    if (!conductor.agency || conductor.agency.toString() !== agency._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "This conductor does not belong to your agency",
      });
    }

    const bus = await Bus.findOne({
      busNumber: busNumber.toUpperCase(),
      agency: agency._id,
      isActive: true,
    });
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found in your agency",
      });
    }

    if (conductor.assignedBus) {
      return res.status(400).json({
        success: false,
        message: "Conductor is already assigned to a bus. Unassign first.",
      });
    }

    if (bus.assignedConductor) {
      return res.status(400).json({
        success: false,
        message: "This bus already has a conductor assigned",
      });
    }

    bus.assignedConductor = conductor._id;
    await bus.save();

    conductor.assignedBus = bus._id;
    await conductor.save({ validateBeforeSave: false });

    const updatedConductor = await User.findById(conductor._id)
      .select("-password -refreshToken")
      .populate("assignedBus", "busNumber busName");

    return res.status(200).json({
      success: true,
      message: "Conductor assigned to bus successfully",
      conductor: updatedConductor,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Unassign Conductor from Bus — ✅ NEW
// ─────────────────────────────────────────────────
exports.unassignConductor = async (req, res, next) => {
  try {
    const { conductorId } = req.params;

    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const conductor = await User.findOne({
      _id: conductorId,
      agency: agency._id,
      role: "conductor",
    });
    if (!conductor) {
      return res.status(404).json({ success: false, message: "Conductor not found" });
    }

    if (!conductor.assignedBus) {
      return res.status(400).json({
        success: false,
        message: "Conductor is not assigned to any bus",
      });
    }

    // Remove from bus
    await Bus.findByIdAndUpdate(conductor.assignedBus, {
      assignedConductor: null,
    });

    conductor.assignedBus = null;
    await conductor.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "Conductor unassigned from bus",
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Delete / Deactivate Conductor — ✅ NEW
// ─────────────────────────────────────────────────
exports.deleteConductor = async (req, res, next) => {
  try {
    const { conductorId } = req.params;

    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const conductor = await User.findOne({
      _id: conductorId,
      agency: agency._id,
      role: "conductor",
    });
    if (!conductor) {
      return res.status(404).json({ success: false, message: "Conductor not found" });
    }

    // Unassign from bus
    if (conductor.assignedBus) {
      await Bus.findByIdAndUpdate(conductor.assignedBus, {
        assignedConductor: null,
      });
    }

    conductor.isActive = false;
    conductor.assignedBus = null;
    conductor.refreshToken = null;
    await conductor.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "Conductor deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Agency Dashboard Stats — ✅ NEW
// ─────────────────────────────────────────────────
exports.getAgencyStats = async (req, res, next) => {
  try {
    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const mongoose = require("mongoose");
    const agencyId = new mongoose.Types.ObjectId(agency._id);

    const [totalBuses, totalConductors, assignedConductors, ticketStats, todayStats] =
      await Promise.all([
        Bus.countDocuments({ agency: agency._id, isActive: true }),
        User.countDocuments({ agency: agency._id, role: "conductor", isActive: true }),
        User.countDocuments({ agency: agency._id, role: "conductor", assignedBus: { $ne: null } }),
        Ticket.aggregate([
          { $match: { agency: agencyId, status: "active" } },
          { $group: { _id: null, totalRevenue: { $sum: "$fare" }, totalTickets: { $sum: 1 } } },
        ]),
        Ticket.aggregate([
          {
            $match: {
              agency: agencyId,
              status: "active",
              createdAt: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                $lte: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
          },
          { $group: { _id: null, todayRevenue: { $sum: "$fare" }, todayTickets: { $sum: 1 } } },
        ]),
      ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalBuses,
        totalConductors,
        assignedConductors,
        freeConductors: totalConductors - assignedConductors,
        totalRevenue: ticketStats[0]?.totalRevenue || 0,
        totalTickets: ticketStats[0]?.totalTickets || 0,
        todayRevenue: todayStats[0]?.todayRevenue || 0,
        todayTickets: todayStats[0]?.todayTickets || 0,
        subscriptionPlan: agency.subscriptionPlan,
        maxBuses: agency.maxBuses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Agency Ticket History — ✅ NEW
// ─────────────────────────────────────────────────
exports.getAgencyTickets = async (req, res, next) => {
  try {
    const { filter = "today", conductorId, busId, page = 1, limit = 30 } = req.query;

    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const match = { agency: agency._id, status: "active" };
    if (conductorId) match.conductor = conductorId;
    if (busId) match.bus = busId;

    const now = new Date();
    if (filter === "today") {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      match.createdAt = { $gte: start, $lte: end };
    } else if (filter === "yesterday") {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const start = new Date(y); start.setHours(0, 0, 0, 0);
      const end = new Date(y); end.setHours(23, 59, 59, 999);
      match.createdAt = { $gte: start, $lte: end };
    } else if (filter === "week") {
      match.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (filter === "month") {
      match.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      Ticket.find(match)
        .populate("conductor", "name phone profileImage")
        .populate("bus", "busNumber busName")
        .populate("pickupStop", "stopName")
        .populate("dropStop", "stopName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Ticket.countDocuments(match),
    ]);

    const totalRevenue = tickets.reduce((s, t) => s + t.fare, 0);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      totalRevenue,
      tickets,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Upload Conductor Photo — ✅ NEW (Cloudinary)
// ─────────────────────────────────────────────────
exports.uploadConductorPhoto = async (req, res, next) => {
  try {
    const { conductorId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image provided" });
    }

    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const conductor = await User.findOne({
      _id: conductorId,
      agency: agency._id,
      role: "conductor",
    });
    if (!conductor) {
      return res.status(404).json({ success: false, message: "Conductor not found" });
    }

    const imageUrl = req.file.path; // Cloudinary URL

    conductor.profileImage = imageUrl;
    await conductor.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "Conductor photo uploaded",
      profileImage: imageUrl,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Upload Agency Logo — ✅ NEW (Cloudinary)
// ─────────────────────────────────────────────────
exports.uploadAgencyLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image provided" });
    }

    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const imageUrl = req.file.path;
    agency.logo = imageUrl;
    await agency.save();

    return res.status(200).json({
      success: true,
      message: "Agency logo uploaded",
      logo: imageUrl,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Remove Agency Logo
// ─────────────────────────────────────────────────
exports.removeAgencyLogo = async (req, res, next) => {
  try {
    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    agency.logo = null;
    await agency.save();

    return res.status(200).json({
      success: true,
      message: "Agency logo removed",
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Upload Advertise Image — ✅ NEW
// ─────────────────────────────────────────────────
exports.uploadAdvertiseImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image provided" });
    }

    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const imageUrl = req.file.path; // Cloudinary URL
    agency.advertiseImage = imageUrl;
    await agency.save();

    return res.status(200).json({
      success: true,
      message: "Advertisement image uploaded successfully",
      advertiseImage: imageUrl,
    });
  } catch (error) {
    console.error("uploadAdvertiseImage error:", error);
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Remove Advertise Image
// ─────────────────────────────────────────────────
exports.removeAdvertiseImage = async (req, res, next) => {
  try {
    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    agency.advertiseImage = null;
    await agency.save();

    return res.status(200).json({
      success: true,
      message: "Advertisement image removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Update Agency Details
// ─────────────────────────────────────────────────
exports.updateAgencyProfile = async (req, res, next) => {
  try {
    const { agencyName, phone, city } = req.body;
    const agency = await getAgencyForOwner(req.user._id);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    if (agencyName) agency.agencyName = agencyName;
    if (phone) agency.phone = phone;
    if (city) agency.city = city;

    await agency.save();

    return res.status(200).json({
      success: true,
      message: "Agency details updated",
      agency,
    });
  } catch (error) {
    next(error);
  }
};
