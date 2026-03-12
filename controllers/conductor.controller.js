// conductor.controller.js
const Bus = require ('../models/Bus.model')
const Route = require('../models/Routes.model')
const Stop = require('../models/Stop.model')
const User = require('../models/User.models')
const Agency = require('../models/Agency.model')

// get Routes And Stops for conductor

exports.getRoutesAndSTops = async (req, res) => {
  try {

    // 1️⃣ get current user
    const user = await User.findById(req.user._id).populate("assignedBus");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // 2️⃣ check conductor has bus
    if (!user.assignedBus) {
      return res.status(400).json({
        message: "No bus assigned to this conductor",
      });
    }

    // 3️⃣ find route using bus
    const route = await Route.findOne({
      bus: user.assignedBus._id,
    });

    if (!route) {
      return res.status(404).json({
        message: "Route not found for this bus",
      });
    }

    // 4️⃣ find stops
    const stops = await Stop.find({
      route: route._id,
    }).sort({ order: 1 });

    // 5️⃣ response
    return res.status(200).json({
      bus: user.assignedBus,
      route,
      stops,
    });

  } catch (error) {
    console.log("Error fetching routes and stops:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};