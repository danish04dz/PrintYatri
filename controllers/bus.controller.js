const Bus = require('../models/Bus.model');
const User = require('../models/User.models');
const Agency = require('../models/Agency.model');

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

// view All tickets and export in
