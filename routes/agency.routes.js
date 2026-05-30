const express = require("express");
const router = express.Router();
const { verifyJWT, isAgency, requireProPlan } = require("../middleware/auth");
const { uploadConductorPhoto, uploadAgencyLogo, uploadAdvertiseImage } = require("../middleware/upload");

const {
  addBus,
  getBuses,
  updateBus,
  deleteBus,
  addRoutesAndStops,
  updateRoute,
  getBusRoutes,
  getRouteDetails,
  updateRouteStopsAgency,
  registerConductor,
  getConductors,
  assignConductor,
  unassignConductor,
  deleteConductor,
  getAgencyStats,
  getAgencyTickets,
  uploadConductorPhoto: uploadConductorPhotoCtrl,
  uploadAgencyLogo: uploadAgencyLogoCtrl,
  removeAgencyLogo,
  uploadAdvertiseImage: uploadAdvertiseImageCtrl,
  removeAdvertiseImage,
  updateAgencyProfile,
} = require("../controllers/agency.controller");

// ... later in the file ...
router.patch("/update-profile", verifyJWT, isAgency, updateAgencyProfile);


// ─── All routes require agency auth ──────────────

// Dashboard Stats
router.get("/stats", verifyJWT, isAgency, getAgencyStats);     // ✅ NEW

// Bus Management
router.post("/addBus", verifyJWT, isAgency, addBus);
router.get("/buses", verifyJWT, isAgency, getBuses);            // ✅ NEW
router.put("/buses/:busId", verifyJWT, isAgency, updateBus);    // ✅ NEW
router.delete("/buses/:busId", verifyJWT, isAgency, deleteBus); // ✅ NEW

// Route & Stop Management
router.post("/addRoutesAndStops", verifyJWT, isAgency, addRoutesAndStops);
router.put("/routes/:routeId", verifyJWT, isAgency, updateRoute);
router.get("/bus/:busId/routes", verifyJWT, isAgency, getBusRoutes);                    // ✅ NEW
router.get("/routes/:routeId", verifyJWT, isAgency, getRouteDetails);                   // ✅ NEW
router.patch("/routes/:routeId/stops", verifyJWT, isAgency, updateRouteStopsAgency);   // ✅ NEW

// Conductor Management
router.post("/registerConductor", verifyJWT, isAgency, registerConductor);
router.get("/conductors", verifyJWT, isAgency, getConductors);                            // ✅ NEW
router.post("/assignConductor", verifyJWT, isAgency, assignConductor);
router.put("/conductors/:conductorId/unassign", verifyJWT, isAgency, unassignConductor); // ✅ NEW
router.delete("/conductors/:conductorId", verifyJWT, isAgency, deleteConductor);          // ✅ NEW

// Image Uploads (Cloudinary)
router.post(                                                                              // ✅ NEW
  "/conductors/:id/upload-photo",
  verifyJWT,
  isAgency,
  uploadConductorPhoto,
  uploadConductorPhotoCtrl
);
router.post(                                                                              // ✅ NEW
  "/upload-logo",
  verifyJWT,
  isAgency,
  uploadAgencyLogo,
  uploadAgencyLogoCtrl
);
router.delete("/remove-logo", verifyJWT, isAgency, removeAgencyLogo);

// Ticket History (Agency-level)
router.get("/tickets", verifyJWT, isAgency, getAgencyTickets); // ✅ NEW

// Advertise Image (Local Shop Ad on Ticket) — PRO PLAN ONLY
router.post(
  "/upload-advertise",
  verifyJWT,
  isAgency,
  requireProPlan,
  uploadAdvertiseImage,
  uploadAdvertiseImageCtrl
);
router.delete("/remove-advertise", verifyJWT, isAgency, requireProPlan, removeAdvertiseImage);

module.exports = router;