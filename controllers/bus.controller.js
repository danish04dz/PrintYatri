const Bus = require("../models/Bus.model");
const User = require("../models/User.models");
const Agency = require("../models/Agency.model");
const Route = require("../models/Routes.model");
const Stop = require("../models/Stop.model");

// ─────────────────────────────────────────────────
// Get All Conductors + Buses for Agency Dashboard
// ─────────────────────────────────────────────────
exports.getAllConductorsAndBusData = async (req, res, next) => {
  try {
    let agencyId;

    if (req.user.role === "agency") {
      const agency = await Agency.findOne({ owner: req.user._id });
      if (!agency) {
        return res.status(404).json({ success: false, message: "Agency not found" });
      }
      agencyId = agency._id;
    } else {
      // Admin or internal use
      agencyId = req.query.agencyId;
      if (!agencyId) {
        return res.status(400).json({ success: false, message: "agencyId required for admin" });
      }
    }

    const [conductors, buses] = await Promise.all([
      User.find({ agency: agencyId, role: "conductor", isActive: true })
        .select("name phone assignedBus profileImage isActive")
        .populate("assignedBus", "busNumber busName busType"),
      Bus.find({ agency: agencyId, isActive: true })
        .populate("assignedConductor", "name phone profileImage"),
    ]);

    const totalConductors = conductors.length;
    const totalBuses = buses.length;
    const freeConductors = conductors.filter((c) => !c.assignedBus);
    const freeBuses = buses.filter((b) => !b.assignedConductor);
    const assigned = buses
      .filter((b) => b.assignedConductor)
      .map((b) => ({
        _id: b._id,
        busNumber: b.busNumber,
        busName: b.busName,
        busType: b.busType,
        conductor: {
          _id: b.assignedConductor._id,
          name: b.assignedConductor.name,
          phone: b.assignedConductor.phone,
          profileImage: b.assignedConductor.profileImage,
        },
      }));

    return res.status(200).json({
      success: true,
      totalBuses,
      totalConductors,
      conductors,
      buses,
      assigned,
      freeBuses,
      freeConductors,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Get All Routes for Agency
// ─────────────────────────────────────────────────
exports.getRoutesWithBus = async (req, res, next) => {
  try {
    let agencyId;

    if (req.user.role === "agency") {
      const agency = await Agency.findOne({ owner: req.user._id });
      if (!agency) {
        return res.status(404).json({ success: false, message: "Agency not found" });
      }
      agencyId = agency._id;
    } else {
      agencyId = req.query.agencyId;
    }

    const routesQuery = agencyId ? { agency: agencyId } : {};
    const routes = await Route.find(routesQuery)
      .populate("bus", "busNumber busName busType");

    // Attach stops to each route
    const routesWithStops = await Promise.all(
      routes.map(async (route) => {
        const stops = await Stop.find({ route: route._id }).sort({ order: 1 });
        return { ...route.toObject(), stops };
      })
    );

    return res.status(200).json({ success: true, routes: routesWithStops });
  } catch (error) {
    next(error);
  }
};