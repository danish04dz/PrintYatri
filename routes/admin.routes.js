const express = require("express");
const router = express.Router();
const { verifyJWT, isAdmin } = require("../middleware/auth");

const {
  adminLogin,
  adminDashboard,
  getDashboardStats,
  getAllAgencies,
  updateAgencyStatus,
  getAllConductors,
  getAllTickets,
  getAllDemoRequests,
  updateDemoRequestStatus,
} = require("../controllers/admin.js");

const {
  createAgency,
  deleteAgency,
  suspendAgency,
} = require("../controllers/admin.controller");

// ─── Public ──────────────────────────────────────
router.post("/login", adminLogin);

// ─── Protected (Admin only) ───────────────────────
router.get("/dashboard", verifyJWT, isAdmin, adminDashboard);
router.get("/stats", verifyJWT, isAdmin, getDashboardStats);

// Agency Management
router.get("/agencies", verifyJWT, isAdmin, getAllAgencies);
router.post("/create-agency", verifyJWT, isAdmin, createAgency);
router.put("/agencies/:agencyId", verifyJWT, isAdmin, updateAgencyStatus);
router.delete("/agencies/:agencyId", verifyJWT, isAdmin, deleteAgency);       // ✅ NEW
router.patch("/agencies/:agencyId/suspend", verifyJWT, isAdmin, suspendAgency); // ✅ NEW

// Conductors
router.get("/conductors", verifyJWT, isAdmin, getAllConductors); // ✅ NEW

// Tickets
router.get("/tickets", verifyJWT, isAdmin, getAllTickets); // ✅ NEW

// Demo Requests
router.get("/demo-requests", verifyJWT, isAdmin, getAllDemoRequests);       // ✅ NEW
router.put("/demo-requests/:requestId", verifyJWT, isAdmin, updateDemoRequestStatus); // ✅ NEW

module.exports = router;
