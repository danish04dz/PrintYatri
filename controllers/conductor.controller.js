// conductor.controller.js
const Bus = require ('../models/Bus.model')
const Route = require('../models/Routes.model')
const Stop = require('../models/Stop.model')
const User = require('../models/User.models')
const Agency = require('../models/Agency.model')
const Ticket = require('../models/Ticket.model')

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




// generate Ticket by conductor

exports.generateTicket = async (req, res) => {
  try {
    const {
      passengerName,
      startRouteName,
      endRouteName,
      fare,
      numberPassenger
    } = req.body;

    // ✅ validation
    if (!startRouteName || !endRouteName || !fare) {
      return res.status(400).json({
        message: "startRouteName, endRouteName and fare are required"
      });
    }

    // ✅ default passenger count
    const passengerCount = numberPassenger ? Number(numberPassenger) : 1;

    if (passengerCount <= 0) {
      return res.status(400).json({
        message: "Invalid passenger count"
      });
    }

    // ✅ get conductor
    const conductor = await User.findById(req.user._id)
      .populate("assignedBus agency");

    if (!conductor) {
      return res.status(404).json({
        message: "Conductor not found"
      });
    }

    if (!conductor.assignedBus) {
      return res.status(400).json({
        message: "No bus assigned to conductor"
      });
    }

    // ✅ get route
    const route = await Route.findOne({
      bus: conductor.assignedBus._id
    });

    if (!route) {
      return res.status(404).json({
        message: "Route not found for this bus"
      });
    }

    // ✅ get stops
    const pickupStop = await Stop.findOne({
      route: route._id,
      stopName: startRouteName
    });

    const dropStop = await Stop.findOne({
      route: route._id,
      stopName: endRouteName
    });

    if (!pickupStop || !dropStop) {
      return res.status(404).json({
        message: "Stops not found"
      });
    }

    // ✅ generate ticket id
    const ticketId = `TKT-${Date.now()}`;

    // ✅ total fare
    const totalFare = Number(fare) * passengerCount;

    // ✅ create ticket
    const ticket = await Ticket.create({
      passengerName,
      numberPasanger: passengerCount,
      ticketId,
      fare: totalFare,
      route: route._id,
      pickupStop: pickupStop._id,
      dropStop: dropStop._id,
      bus: conductor.assignedBus._id,
      conductor: conductor._id,
      agency: conductor.agency._id
    });

    // ✅ populate response (optional but useful)
    const ticketDetails = await Ticket.findById(ticket._id)
      .populate("bus", "busNumber busName")
      .populate("route", "startRouteName endRouteName")
      .populate("pickupStop", "stopName")
      .populate("dropStop", "stopName")
      .populate("conductor", "name")
      .populate("agency", "agencyName");

    // ✅ response
    return res.status(201).json({
      message: "Ticket generated successfully",
      ticket: ticketDetails
    });

  } catch (error) {
    console.log("Generate Ticket Error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};