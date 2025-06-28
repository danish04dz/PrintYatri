const expreess = require('express');
const router = expreess.Router();   
const {  authenticate, isAdmin } = require('../middleware/auth');
const Admin = require('../models/admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Admin Login Route

 router.post('/login', async (req, res) =>{
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
 })


 // admin  Dashboard Route
router.get('/dashboard', authenticate, isAdmin, async (req, res) => {
    res.status(200).json({
        message: 'Welcome to the admin dashboard',
        admin: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role
        }
        
    });

})

 module.exports = router;
