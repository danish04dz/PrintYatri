const express = require("express");
const router = express.Router();
const { verifyJWT, isConductor } = require("../middleware/auth");

const {
  getRoutesAndStops,
  generateTicket,
  getConductorTickets,
  getDashboardStats,
  getConductorProfile,
} = require("../controllers/conductor.controller");

// ─── All routes require conductor auth ───────────
router.get("/routes", verifyJWT, isConductor, getRoutesAndStops);      // alias
router.get("/getRoutesAndStops", verifyJWT, isConductor, getRoutesAndStops); // legacy compat

router.post("/generateTicket", verifyJWT, isConductor, generateTicket);

router.get("/tickets", verifyJWT, isConductor, getConductorTickets);   // ✅ NEW (moved here)
router.get("/stats", verifyJWT, isConductor, getDashboardStats);        // ✅ NEW
router.get("/profile", verifyJWT, isConductor, getConductorProfile);    // ✅ NEW

module.exports = router;