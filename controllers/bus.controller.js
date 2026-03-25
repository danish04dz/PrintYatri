const Bus = require('../models/Bus.model');
const User = require('../models/User.models');
const Agency = require('../models/Agency.model');
const Route = require('../models/Routes.model');
const Ticket = require('../models/Ticket.model')

exports.getAllConductorsAndBusData = async (req, res) => {
  try {
    let agencyId;

    // ✅ Get agency
    if (req.user.role === "agency") {
      const agency = await Agency.findOne({ owner: req.user._id });
      if (!agency) {
        return res.status(404).json({ msg: "Agency not found" });
      }
      agencyId = agency._id;
    } else {
      agencyId = req.user.agency;
    }

    if (!agencyId) {
      return res.status(404).json({ msg: "Agency not linked" });
    }

    // ✅ ALL DATA
    const conductors = await User.find({
      agency: agencyId,
      role: "conductor",
    }).select("name phone assignedBus");

    const buses = await Bus.find({
      agency: agencyId,
    }).populate("assignedConductor", "name phone");


    // ✅ COUNTS
    const totalConductors = conductors.length;
    const totalBuses = buses.length;

    // ✅ FREE DATA
    const freeConductors = conductors.filter((c) => !c.assignedBus);
    const freeBuses = buses.filter((b) => !b.assignedConductor);

    // ✅ ASSIGNED DATA
    const assigned = buses
      .filter((b) => b.assignedConductor)
      .map((b) => ({
        _id: b._id,
        busNumber: b.busNumber,
        busName: b.busName,
        conductor: {
          name: b.assignedConductor.name,
          phone: b.assignedConductor.phone,
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
    console.log(error);
    return res.status(500).json({
      msg: "Error while fetching data",
    });
  }
};

// get all routes
exports.getRoutesWithBus = async (req, res) => {
  try {
    const routes = await Route.find()
      .populate("bus", "busNumber busName");

    res.status(200).json({
      success: true,
      routes,
    });
  } catch (error) {
    res.status(500).json({ msg: "Error fetching routes" });
  }
};

// view All tickets and export in
exports.getConductorTickets = async (req, res) => {
  try {
    const { filter } = req.query; // today, yesterday, week, month, all

    const conductorId = req.user._id;

    let dateFilter = {};

    const now = new Date();

    if (filter === "today") {
      const start = new Date(now.setHours(0, 0, 0, 0));
      const end = new Date(now.setHours(23, 59, 59, 999));
      dateFilter = { createdAt: { $gte: start, $lte: end } };
    }

    if (filter === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const start = new Date(yesterday.setHours(0, 0, 0, 0));
      const end = new Date(yesterday.setHours(23, 59, 59, 999));

      dateFilter = { createdAt: { $gte: start, $lte: end } };
    }

    if (filter === "week") {
      const start = new Date();
      start.setDate(start.getDate() - 7);

      dateFilter = { createdAt: { $gte: start } };
    }

    if (filter === "month") {
      const start = new Date();
      start.setMonth(start.getMonth() - 1);

      dateFilter = { createdAt: { $gte: start } };
    }

    // 👉 Fetch tickets
    const tickets = await Ticket.find({
      conductor: conductorId,
      ...dateFilter,
    })
      .populate("pickupStop", "stopName")
      .populate("dropStop", "stopName")
      .populate("bus", "busName busNumber")
      .sort({ createdAt: -1 });

    // 👉 Summary
    const totalTickets = tickets.length;

    const totalAmount = tickets.reduce((sum, t) => sum + t.fare, 0);

    return res.status(200).json({
      tickets,
      totalTickets,
      totalAmount,
    });

  } catch (error) {
    console.log("History Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};