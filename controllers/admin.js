
const bcrypt = require ('bcrypt');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Agency = require("../models/Agency");


// Admin Login Controller
 
exports.adminLogin = async (req, res) => {
     const { email, password } = req.body;
    try {
        const admin = await Admin.findOne({ email});
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });

        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });

        }
        const token = jwt.sign({ id: admin._id, role: admin.role, name:admin.name,email:admin.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({
            message: 'Login successful',
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });  
    }
}


// Admin Dashboard Controller
exports.adminDashboard = async (req, res) => {
    res.status(200).json({
        message: 'Welcome to the admin dashboard',
        admin: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role
        }
        });
}


// controller for creteAgency
exports.createAgency = async (req, res) =>{
    try {
        const { ownerName, agencyName, email, phone, password } = req.body;
        if (!ownerName || !agencyName || !email || !phone || !password){
            return res.status(400).json({ message: "All fields are required" });

        }
        // Check if agency already exists
        const existingAgency =await Agency.findOne({
            email: email
        })
        if (existingAgency) {
            return res.status(400).json({ message: "Agency already exists" });
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new agency
        const newAgency = new Agency({
            ownerName,
            agencyName,
            email,
            phone,
            password: hashedPassword,
            createdBy: req.user._id // Assuming req.user is set by authentication middleware
        });
        // Save the agency to the database
        await newAgency.save();
        res.status(201).json({ message: "Agency created successfully",
            agency : {
                id: newAgency._id,
                ownerName: newAgency.ownerName,
                agencyName: newAgency.agencyName,
                email: newAgency.email,
                phone: newAgency.phone,
            }
            
         });
        }

         catch (error) {
            console.error("Error creating agency:", error);
            res.status(500).json({ message: "Internal server error" });

         } 

}

