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
            return res.status(404).json({
                msg: "Agency not linked"
            });
        }

        // ✅ FIX: Sync data (important 🔥)
        const conductorsWithBus = await User.find({
            agency: agencyId,
            role: "conductor",
            assignedBus: { $ne: null }
        });

        for (let conductor of conductorsWithBus) {
            const bus = await Bus.findById(conductor.assignedBus);

            // ❗ agar bus me conductor missing hai → fix karo
            if (bus && !bus.assignedConductor) {
                bus.assignedConductor = conductor._id;
                await bus.save();
            }
        }

        // ✅ Total
        const totalConductors = await User.countDocuments({
            agency: agencyId,
            role: "conductor"
        });

        const totalBuses = await Bus.countDocuments({
            agency: agencyId
        });

        // ✅ Unassigned Conductors
        const unassignedConductors = await User.find({
            agency: agencyId,
            role: "conductor",
            assignedBus: null
        }).select("name phone email");

        // ✅ Unassigned Buses
        const unassignedBuses = await Bus.find({
            agency: agencyId,
            assignedConductor: null
        }).select("busName busNumber totalSeats");

        // ✅ Assigned Data (FINAL)
        const assignedData = await Bus.find({
            agency: agencyId,
            assignedConductor: { $ne: null }
        }).populate("assignedConductor", "name phone email");

        return res.status(200).json({
            success: true,

            totalConductors,
            totalBuses,

            unassignedConductors,
            unassignedBuses,
            assignedData
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            msg: "Error while fetching data"
        });
    }
};


// view All tickets and export in
