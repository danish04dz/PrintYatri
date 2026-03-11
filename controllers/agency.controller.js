
const Bus = require ('../models/Bus.model')
const Route = require('../models/Routes.model')
const Stop = require('../models/Stop.model')
const User = require('../models/User.models')

// Agency owner add Busses to the system
exports.addBus = async (req, res) => {
    try {
        // 1:- get bus details from req.body   
        const { busNumber, busName, totalSeats } = req.body;
        
        // 2:- validate the details is any field are missing or not
        if(!busNumber || !busName || !totalSeats) {
            return res.status(400).json({msg : "Please provide all the details"});
        }

        // 3:- check the bus is already exist or not
        const existingBus = await Bus.findOne({ busNumber });
        if(existingBus) {
            return res.status(400).json({msg : "bus is Already Registered"});
        }

        // 4:- create bus entry in the database
        const newBus = new Bus ({
            busNumber,
            busName,
            totalSeats,
            agency : req.user._id
        })
        await newBus.save();    

        //  5:- return response
        res.status(201).json({msg : "Bus added successfully", bus : newBus});

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "err while creating bus" });
    }
}

// Agency owner add routes and stops of selected bus to the system
exports.addRoutesAndStops = async (req, res) => {
   try {

        // 1️⃣ get data from body
        const { busNumber, startRouteName, endRouteName, stops } = req.body

        // 2️⃣ validate
        if(!busNumber || !startRouteName || !endRouteName || !stops){
            return res.status(400).json({
                message:"Please provide all fields"
            })
        }

        // 3️⃣ find bus
        const bus = await Bus.findOne({ busNumber })

        if(!bus){
            return res.status(404).json({
                message:"Bus not found"
            })
        }

        // 4️⃣ check route already exists
        const existingRoute = await Route.findOne({
            bus: bus._id
        })

        if(existingRoute){
            return res.status(400).json({
                message:"Route already exists for this bus"
            })
        }

        // 5️⃣ create route
        const newRoute = await Route.create({

            startRouteName,
            endRouteName,
            bus: bus._id,
            

        })

        // 6️⃣ create stops
        const stopDocs = stops.map((stop)=>{

            return {
                stopName: stop.stopName,
                order: stop.order,
                route: newRoute._id
            }

        })

        await Stop.insertMany(stopDocs)

        // 7️⃣ response
        res.status(201).json({

            message:"Route and Stops created successfully",
            route:newRoute,
            stops:stopDocs

        })

    } catch (error) {

        console.log(error)

        res.status(500).json({
            message:"Error while creating route"
        })

    }

}

// Agency owner assign conductor to the bus
exports.assignConductor = async (req, res) => {

    try {

        // 1️⃣ get data
        const { phone, email, busNumber } = req.body

        // 2️⃣ validate
        if(!(phone || email) || !busNumber){
            return res.status(400).json({
                msg:"phone/email and busNumber required"
            })
        }

        // 3️⃣ find conductor
        const user = await User.findOne({
            $or:[{phone},{email}]
        })

        if(!user){
            return res.status(404).json({
                msg:"User not found"
            })
        }

        // role check
        if(user.role !== "conductor"){
            return res.status(400).json({
                msg:"User is not a conductor"
            })
        }

        // 4️⃣ find bus
        const bus = await Bus.findOne({ busNumber })

        if(!bus){
            return res.status(404).json({
                msg:"Bus not found"
            })
        }

        // 5️⃣ check conductor already assigned
        if(user.assignedBus){
            return res.status(400).json({
                msg:"Conductor already assigned to another bus"
            })
        }

        // 6️⃣ check bus already has conductor
        if(bus.assignedConductor){
            return res.status(400).json({
                msg:"Bus already has a conductor"
            })
        }

        // 7️⃣ assign conductor
        bus.assignedConductor = user._id
        await bus.save()

        user.assignedBus = bus._id
        await user.save()

        // 8️⃣ response
        res.status(200).json({

            msg:"Conductor assigned successfully",
            bus,
            conductor:user

        })

    } catch (error) {

        console.log(error)

        res.status(500).json({
            msg:"Error while assigning conductor"
        })

    }

}


