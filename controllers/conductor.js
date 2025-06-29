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
        // check is the bus already assigned to a conductor
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
        // Update the bus with the conductor's ID 
        existingBus.assignedConductor = newConductor._id;       

        await existingBus.save();
        
        res.status(201).json({
            message: 'Conductor created successfully',
            conductor: {
                id: newConductor._id,
                name: newConductor.name,
                email: newConductor.email,
                phone: newConductor.phone,
                assignedBus: existingBus.busNumber
            }
        });
    }
    catch (error) {
        console.error('Error creating conductor:', error);
        res.status(500).json({ message: 'Internal server error' });
    }   

}

// controller for conductor login

exports.conductorLogin = async (req, res) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }   
    try {
        // Find the conductor by email
        const conductor = await Conductor.findOne({ email }).populate('assignedBuses');
        if (!conductor) {
            return res.status(404).json({ message: 'Conductor not found' });
        }   
        // Check the password
        const isPasswordValid = await bcrypt.compare(password, conductor.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }   
        // Generate JWT token
        const token = jwt.sign({
            id: conductor._id,
            name: conductor.name,
            email: conductor.email,
            role: conductor.role,
        }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({
            message: 'Conductor logged in successfully',
            token,
            conductor: {
                id: conductor._id,
                name: conductor.name,
                email: conductor.email,
                phone: conductor.phone,
                assignedBus: conductor.assignedBuses ? conductor.assignedBuses.busNumber: null,
                isActive: conductor.isActive
            }
        });
    } catch (error) {
        console.error('Error during conductor login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }   
}

// controller for Conductor Profile/dashboard using isConductor middleware

exports.conductorDashboard = async (req, res) => {
    res.status(200).json({
        message: 'Welcome to the conductor dashboard',  
        conductor: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone,
            assignedBus: req.user.assignedBuses ? req.user.assignedBuses.busNumber : null,
            isActive: req.user.isActive 
        }
    });

}

