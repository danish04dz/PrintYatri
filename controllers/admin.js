const Admin = require("../models/Admin");
const Agency = require("../models/Agency.model");
const User = require("../models/User.models");
const Ticket = require("../models/Ticket.model");
const DemoRequest = require("../models/DemoRequest.model");

// ─────────────────────────────────────────────────
// Cookie options
// ─────────────────────────────────────────────────
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// ─────────────────────────────────────────────────
// Helper: Generate tokens for Admin
// ─────────────────────────────────────────────────
const generateAdminTokens = async (adminId) => {
  const admin = await Admin.findById(adminId);
  if (!admin) throw new Error("Admin not found");
  const accessToken = admin.generateAccessToken();
  const refreshToken = admin.generateRefreshToken();
  admin.refreshToken = refreshToken;
  await admin.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

// ─────────────────────────────────────────────────
// Admin Login
// ─────────────────────────────────────────────────
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const isPasswordValid = await admin.isPasswordCorrect(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    const { accessToken, refreshToken } = await generateAdminTokens(admin._id);
    const loggedInAdmin = await Admin.findById(admin._id).select(
      "-password -refreshToken"
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions())
      .cookie("refreshToken", refreshToken, cookieOptions())
      .json({
        success: true,
        message: "Admin login successful",
        admin: loggedInAdmin,
        accessToken,
        refreshToken,
      });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Admin Dashboard Info
// ─────────────────────────────────────────────────
exports.adminDashboard = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Welcome to PrintYatri Admin Dashboard",
      admin: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────────────
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalAgencies,
      activeAgencies,
      pendingAgencies,
      suspendedAgencies,
      proPlanAgencies,
      totalUsers,
      totalConductors,
      pendingDemoRequests,
      ticketStats,
    ] = await Promise.all([
      Agency.countDocuments(),
      Agency.countDocuments({ status: "approved" }),
      Agency.countDocuments({ status: "pending" }),
      Agency.countDocuments({ status: "suspended" }),
      Agency.countDocuments({ subscriptionPlan: "paid" }),
      User.countDocuments({ role: { $ne: "admin" } }),
      User.countDocuments({ role: "conductor" }),
      DemoRequest.countDocuments({ status: "pending" }),
      Ticket.aggregate([
        { $match: { status: "active" } },
        { $group: { _id: null, totalRevenue: { $sum: "$fare" }, totalTickets: { $sum: 1 } } },
      ]),
    ]);

    const totalRevenue = ticketStats[0]?.totalRevenue || 0;
    const totalTickets = ticketStats[0]?.totalTickets || 0;

    // Revenue trend — last 7 days
    const last7Days = await Ticket.aggregate([
      { $match: { status: "active", createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$fare" }, tickets: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalAgencies,
        activeAgencies,
        pendingAgencies,
        suspendedAgencies,
        proPlanAgencies,
        totalUsers,
        totalConductors,
        pendingDemoRequests,
        totalRevenue,
        totalTickets,
      },
      revenueTrend: last7Days,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Get All Agencies
// ─────────────────────────────────────────────────
exports.getAllAgencies = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [agencies, total] = await Promise.all([
      Agency.find(filter)
        .populate("owner", "name email phone profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Agency.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      agencies,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Update Agency Status
// ─────────────────────────────────────────────────
exports.updateAgencyStatus = async (req, res, next) => {
  try {
    const { agencyId } = req.params;
    const { status, subscriptionPlan } = req.body;

    const validStatuses = ["pending", "approved", "rejected", "suspended"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be: ${validStatuses.join(", ")}`,
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (subscriptionPlan) updateData.subscriptionPlan = subscriptionPlan;

    const agency = await Agency.findByIdAndUpdate(agencyId, updateData, {
      new: true,
      runValidators: true,
    }).populate("owner", "name email phone");

    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Agency updated successfully",
      agency,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Get All Conductors (Admin view) — ✅ NEW
// ─────────────────────────────────────────────────
exports.getAllConductors = async (req, res, next) => {
  try {
    const { agencyId, page = 1, limit = 20 } = req.query;
    const filter = { role: "conductor" };
    if (agencyId) filter.agency = agencyId;

    const skip = (page - 1) * limit;

    const [conductors, total] = await Promise.all([
      User.find(filter)
        .select("-password -refreshToken")
        .populate("agency", "agencyName city status")
        .populate("assignedBus", "busNumber busName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      conductors,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Get All Tickets (Admin view) — ✅ ENHANCED
// ─────────────────────────────────────────────────
exports.getAllTickets = async (req, res, next) => {
  try {
    const { 
      agencyId, 
      busId,
      busNumber,
      conductorId, 
      paymentMode,
      startDate,
      endDate,
      filter = "all", 
      page = 1, 
      limit = 30 
    } = req.query;

    const match = {};
    if (agencyId) match.agency = agencyId;
    if (busId) match.bus = busId;
    if (conductorId) match.conductor = conductorId;
    if (paymentMode) match.paymentMode = paymentMode;

    // Handle busNumber filter (requires lookup)
    let busIdFilter = null;
    if (busNumber) {
      const Bus = require("../models/Bus.model");
      const bus = await Bus.findOne({ busNumber: busNumber.toUpperCase() });
      if (bus) busIdFilter = bus._id;
      else {
        return res.status(200).json({
          success: true,
          total: 0,
          page: Number(page),
          totalPages: 0,
          totalRevenue: 0,
          tickets: [],
        });
      }
    }
    if (busIdFilter) match.bus = busIdFilter;

    const now = new Date();
    let dateMatch = null;
    
    if (startDate && endDate) {
      dateMatch = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (filter === "today") {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      dateMatch = { $gte: start, $lte: end };
    } else if (filter === "week") {
      dateMatch = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (filter === "month") {
      dateMatch = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }
    
    if (dateMatch) match.createdAt = dateMatch;

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      Ticket.find(match)
        .populate("conductor", "name phone profileImage")
        .populate("agency", "agencyName")
        .populate("bus", "busNumber busName")
        .populate("pickupStop", "stopName")
        .populate("dropStop", "stopName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Ticket.countDocuments(match),
    ]);

    const totalRevenue = tickets.reduce((sum, t) => sum + t.fare, 0);

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
// Demo Request Management — ✅ NEW
// ─────────────────────────────────────────────────
exports.getAllDemoRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const requests = await DemoRequest.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    next(error);
  }
};

exports.updateDemoRequestStatus = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status, notes } = req.body || {};

    const validStatuses = ["pending", "contacted", "demo_done", "rejected"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be: ${validStatuses.join(", ")}`,
      });
    }

    const updated = await DemoRequest.findByIdAndUpdate(
      requestId,
      { status, notes },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Demo request updated",
      request: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Get All Buses (Admin view) — ✅ NEW
// ─────────────────────────────────────────────────
exports.getAllBuses = async (req, res, next) => {
  try {
    const { agencyId, status = "all", page = 1, limit = 20, search } = req.query;
    const Bus = require("../models/Bus.model");
    const filter = {};
    
    if (agencyId) filter.agency = agencyId;
    if (status !== "all") {
      if (status === "active") filter.isActive = true;
      else if (status === "inactive") filter.isActive = false;
    }
    
    if (search) {
      filter.$or = [
        { busNumber: new RegExp(search, "i") },
        { busName: new RegExp(search, "i") },
      ];
    }

    const skip = (page - 1) * limit;
    const [buses, total] = await Promise.all([
      Bus.find(filter)
        .populate("agency", "agencyName city subscriptionPlan")
        .populate("assignedConductor", "name phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Bus.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      buses,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Update Bus Status (freeze/stop/activate)
// ─────────────────────────────────────────────────
exports.updateBusStatus = async (req, res, next) => {
  try {
    const { busId } = req.params;
    const { isActive, reason } = req.body;
    const Bus = require("../models/Bus.model");

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be boolean (true=activate, false=freeze/stop)",
      });
    }

    const bus = await Bus.findByIdAndUpdate(
      busId,
      { isActive },
      { new: true, runValidators: true }
    ).populate("agency", "agencyName");

    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found" });
    }

    // Broadcast status change
    broadcast("bus_status_changed", {
      busId: bus._id,
      busNumber: bus.busNumber,
      agencyId: bus.agency._id,
      isActive,
      reason: reason || null,
      ts: Date.now(),
    });

    return res.status(200).json({
      success: true,
      message: `Bus ${isActive ? "activated" : "stopped"}`,
      bus,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Get Revenue Analytics
// ─────────────────────────────────────────────────
exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const { agencyId, startDate, endDate, groupBy = "daily" } = req.query;
    const match = { status: "active" };

    if (agencyId) match.agency = agencyId;

    if (startDate && endDate) {
      match.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      // Default: last 30 days
      match.createdAt = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };
    }

    // Overall revenue
    const [overallRevenue] = await Ticket.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$fare" },
          totalTickets: { $sum: 1 },
          avgFare: { $avg: "$fare" },
        },
      },
    ]);

    // Revenue by payment mode
    const revenueByMode = await Ticket.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$paymentMode",
          revenue: { $sum: "$fare" },
          tickets: { $sum: 1 },
        },
      },
    ]);

    // Revenue trend
    let groupFormat = "%Y-%m-%d";
    if (groupBy === "weekly") groupFormat = "%Y-%W";
    else if (groupBy === "monthly") groupFormat = "%Y-%m";

    const revenueTrend = await Ticket.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
          revenue: { $sum: "$fare" },
          tickets: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Revenue by agency (if admin view, not filtered by agencyId)
    let revenueByAgency = [];
    if (!agencyId) {
      revenueByAgency = await Ticket.aggregate([
        { $match: { status: "active", ...match } },
        { $group: { _id: "$agency", revenue: { $sum: "$fare" }, tickets: { $sum: 1 } } },
        {
          $lookup: {
            from: "agencies",
            localField: "_id",
            foreignField: "_id",
            as: "agencyInfo",
          },
        },
        { $unwind: "$agencyInfo" },
        {
          $project: {
            _id: 0,
            agencyId: "$_id",
            agencyName: "$agencyInfo.agencyName",
            revenue: 1,
            tickets: 1,
          },
        },
        { $sort: { revenue: -1 } },
      ]);
    }

    return res.status(200).json({
      success: true,
      overall: overallRevenue || { totalRevenue: 0, totalTickets: 0, avgFare: 0 },
      byPaymentMode: revenueByMode,
      byAgency: revenueByAgency,
      trend: revenueTrend,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Get Routes & Stops (Admin view)
// ─────────────────────────────────────────────────
exports.getRoutesAndStops = async (req, res, next) => {
  try {
    const { agencyId, busId, page = 1, limit = 20 } = req.query;
    const Route = require("../models/Routes.model");
    const Stop = require("../models/Stop.model");

    const matchRoute = {};
    if (agencyId) matchRoute.agency = agencyId;
    if (busId) matchRoute.bus = busId;

    const skip = (page - 1) * limit;

    const [routes, total] = await Promise.all([
      Route.find(matchRoute)
        .populate("bus", "busNumber busName agency")
        .populate("agency", "agencyName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Route.countDocuments(matchRoute),
    ]);

    // Get stops for each route
    const routesWithStops = await Promise.all(
      routes.map(async (route) => {
        const stops = await Stop.find({ route: route._id }).sort({ order: 1 });
        return { ...route.toObject(), stops };
      })
    );

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      routes: routesWithStops,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Update Route Stops (add/edit/delete/reorder)
// ─────────────────────────────────────────────────
exports.updateRouteStops = async (req, res, next) => {
  try {
    const { routeId } = req.params;
    const { stops } = req.body; // Array of { stopName, order, _id? }
    const Route = require("../models/Routes.model");
    const Stop = require("../models/Stop.model");

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ success: false, message: "Route not found" });
    }

    // Delete existing stops
    await Stop.deleteMany({ route: routeId });

    // Create new stops
    const newStops = await Stop.create(
      stops.map((s, idx) => ({
        stopName: s.stopName,
        order: s.order || idx + 1,
        route: routeId,
      }))
    );

    return res.status(200).json({
      success: true,
      message: "Route stops updated",
      route: { ...route.toObject(), stops: newStops },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Get All Platform Users
// ─────────────────────────────────────────────────
exports.getAllPlatformUsers = async (req, res, next) => {
  try {
    const { role, agencyId, status = "all", page = 1, limit = 20, search } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (agencyId) filter.agency = agencyId;
    if (status !== "all") {
      if (status === "active") filter.isActive = true;
      else if (status === "inactive") filter.isActive = false;
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -refreshToken")
        .populate("agency", "agencyName city")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      users,
    });
  } catch (error) {
    next(error);
  }
};
