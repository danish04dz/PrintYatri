const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');
const Agency = require('../models/Agency');


//Agency Login Controller
exports.agencyLogin = async (req, res) =>{
    const { email, password } = req.body;
    // check if email and password are provided
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    // check if agency exists
    try {
        const agency = await Agency.findOne({email})
        if (!agency) {
            return res.status(404).json({ message: 'Agency not found' });       
        }
        // check if password is correct
        const isMatch = await bcrypt.compare(password,agency.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // generate JWT token
        const token = jwt.sign({ id: agency._id, role: agency.role, name: agency.name, email: agency.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({
            message: 'Login successful',
            token,
            agency: {
                id: agency._id,
                name: agency.name,
                email: agency.email,
                role: agency.role
            }
        }); 
    }catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

// Agency Dashboard Controller
exports.agencyDashboard = async (req, res) => {
    res.status(200).json({
        message: 'Welcome to the agency dashboard',
        agency: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role
        }
    });
}