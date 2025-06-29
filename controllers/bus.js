const Bus = require('../models/Bus');
const Conductor = require('../models/Conductor');

// Create Bus Controller
exports.createBus = async (req, res) =>{
    const { busNumber, busName, StartingPoint, Destination, totalSeats} = req.body;

    // Validate required fields
    if (!busNumber || !busName || !StartingPoint || !Destination || !totalSeats) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if bus already exists
    try {
        const existingBus = await Bus.findOne({ busNumber })

        if (existingBus) {
            return res.status(400).json({ message: 'Bus already exists' });
        }
        // Create new bus
        const newBus = new Bus({
            busNumber,
            busName,
            StartingPoint,
            Destination,
            totalSeats,
            agencyId: req.user.id, // Assuming req.user is set by authentication middleware
        });
        // Save the bus to the database
        await newBus.save();
        res.status(201).json({
            message: 'Bus created successfully',
            bus: {
                id: newBus._id,
                busNumber: newBus.busNumber,
                busName: newBus.busName,
                StartingPoint: newBus.StartingPoint,
                Destination: newBus.Destination,
                totalSeats: newBus.totalSeats
            }
        });
       
    }
     catch (error) {
        console.error('Error creating bus:', error);    
        res.status(500).json({ message: 'Internal server error' });
}

}