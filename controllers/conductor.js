const Conductor = require('../models/Conductor');
const Bus = require('../models/Bus');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// conductor crete controller

exports.createConductor = async (req, res) => {
    const { name, email, phone, password, busNumber } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password || !busNumber) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    // Check if conductor already exists
    try {
        const existingConductor = await Conductor.findOne({ email });
        if (existingConductor) {
            return res.status(400).json({ message: 'Conductor already exists' });
        }
        // check is the bus alredy assigned to a conductor
        const existingBus = await Bus.findOne({ busNumber });
        if (!existingBus) {
            return res.status(404).json({ message: 'Bus not found' });
        }
        if (existingBus.assignedConductor) {
            return res.status(400).json({ message: 'Bus is already assigned to a conductor' });
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create new conductor
        const newConductor = new Conductor({
            name,
            email,
            phone,
            password: hashedPassword,
            agencyId: req.user.id, // Assuming req.user is set by authentication middleware
            assignedBuses: existingBus._id // Assigning the bus to the conductor
        });
        // Save the conductor to the database
        await newConductor.save();
        // Update the bus with the conductor's ID and also genrate token
        existingBus.assignedConductor = newConductor._id;       

        await existingBus.save();
        // Generate JWT token for the conductor
        const token = jwt.sign({ id: newConductor._id, role: newConductor.role, name: newConductor.name, email: newConductor.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            message: 'Conductor created successfully',
            token,
            conductor: {
                id: newConductor._id,
                name: newConductor.name,
                email: newConductor.email,
                phone: newConductor.phone,
                role: newConductor.role,
                assignedBuses: existingBus._id
            }
        });
    }
    catch (error) {
        console.error('Error creating conductor:', error);
        res.status(500).json({ message: 'Internal server error' });
    }   

}