const express = require("express");
const router = express.Router();
const { verifyJWT, isAgency, isAgencyOrAdmin } = require("../middleware/auth");
const {
  getAllConductorsAndBusData,
  getRoutesWithBus,
} = require("../controllers/bus.controller");

// ─── Agency/Admin Data Routes ─────────────────────
router.get("/getConductorsAndBusses", verifyJWT, isAgency, getAllConductorsAndBusData);
router.get("/getRoutes", verifyJWT, isAgencyOrAdmin, getRoutesWithBus);

// NOTE: /tickets moved to /api/conductor/tickets (correct namespace)

module.exports = router;
