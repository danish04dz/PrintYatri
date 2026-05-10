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
      totalUsers,
      totalConductors,
      pendingDemoRequests,
      ticketStats,
    ] = await Promise.all([
      Agency.countDocuments(),
      Agency.countDocuments({ status: "approved" }),
      Agency.countDocuments({ status: "pending" }),
      User.countDocuments({ role: { $ne: "admin" } }),
      User.countDocuments({ role: "conductor" }),
      DemoRequest.countDocuments({ status: "pending" }),
      Ticket.aggregate([
        { $match: { status: "active" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$fare" },
            totalTickets: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalRevenue = ticketStats[0]?.totalRevenue || 0;
    const totalTickets = ticketStats[0]?.totalTickets || 0;

    // Revenue trend — last 7 days
    const last7Days = await Ticket.aggregate([
      {
        $match: {
          status: "active",
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$fare" },
          tickets: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalAgencies,
        activeAgencies,
        pendingAgencies,
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
// Get All Tickets (Admin view) — ✅ NEW
// ─────────────────────────────────────────────────
exports.getAllTickets = async (req, res, next) => {
  try {
    const { agencyId, conductorId, filter = "all", page = 1, limit = 30 } = req.query;

    const match = {};
    if (agencyId) match.agency = agencyId;
    if (conductorId) match.conductor = conductorId;

    const now = new Date();
    if (filter === "today") {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
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
    const { status, notes } = req.body;

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
