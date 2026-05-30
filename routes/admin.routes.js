const express = require("express");
const router = express.Router();
const { verifyJWT, isAdmin } = require("../middleware/auth");
const { agencyStream } = require("../utils/sseStream");

const {
  adminLogin,
  adminDashboard,
  getDashboardStats,
  getAllAgencies,
  getAllConductors,
  getAllTickets,
  getAllDemoRequests,
  updateDemoRequestStatus,
  getAllBuses,
  updateBusStatus,
  getRevenueAnalytics,
  getRoutesAndStops,
  updateRouteStops,
  getAllPlatformUsers,
} = require("../controllers/admin.js");

const {
  createAgency,
  deleteAgency,
  suspendAgency,
  unsuspendAgency,
  upgradePlan,
  resetUserPassword,
} = require("../controllers/admin.controller");

// ─── Public ──────────────────────────────────────
router.post("/login", adminLogin);

// ─── Real-Time SSE Stream (Admin only) ───────────
// Admin panel subscribes here to receive instant agency status updates.
// Uses verifyJWT via query param token for EventSource compatibility.
router.get("/stream/agencies", (req, res, next) => {
  // EventSource doesn't support headers, so accept token via query
  if (req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, verifyJWT, isAdmin, agencyStream);

// ─── Protected (Admin only) ───────────────────────
router.get("/dashboard", verifyJWT, isAdmin, adminDashboard);
router.get("/stats", verifyJWT, isAdmin, getDashboardStats);

// Agency Management
router.get("/agencies", verifyJWT, isAdmin, getAllAgencies);
router.post("/create-agency", verifyJWT, isAdmin, createAgency);
router.delete("/agencies/:agencyId", verifyJWT, isAdmin, deleteAgency);
router.patch("/agencies/:agencyId/suspend", verifyJWT, isAdmin, suspendAgency);
router.patch("/agencies/:agencyId/unsuspend", verifyJWT, isAdmin, unsuspendAgency);
router.patch("/agencies/:agencyId/upgrade-plan", verifyJWT, isAdmin, upgradePlan);

// User / Password Management
router.patch("/users/:userId/reset-password", verifyJWT, isAdmin, resetUserPassword);

// Conductors
router.get("/conductors", verifyJWT, isAdmin, getAllConductors);

// Buses — NEW
router.get("/buses", verifyJWT, isAdmin, getAllBuses);
router.patch("/buses/:busId/status", verifyJWT, isAdmin, updateBusStatus);

// Tickets
router.get("/tickets", verifyJWT, isAdmin, getAllTickets);

// Revenue Analytics — NEW
router.get("/revenue", verifyJWT, isAdmin, getRevenueAnalytics);

// Routes & Stops — NEW
router.get("/routes", verifyJWT, isAdmin, getRoutesAndStops);
router.patch("/routes/:routeId/stops", verifyJWT, isAdmin, updateRouteStops);

// Users — NEW
router.get("/users", verifyJWT, isAdmin, getAllPlatformUsers);

// Demo Requests
router.get("/demo-requests", verifyJWT, isAdmin, getAllDemoRequests);
router.put("/demo-requests/:requestId", verifyJWT, isAdmin, updateDemoRequestStatus);

module.exports = router;
