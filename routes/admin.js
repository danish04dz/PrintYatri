const expreess = require('express');
const router = expreess.Router(); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');  

// middleware for authentication and authorization
const {  authenticate, isAdmin } = require('../middleware/auth');

// Importing the admin controller functions
const {adminLogin,adminDashboard, createAgency} = require('../controllers/admin');



// Admin Login Route
 router.post('/login',adminLogin)


 // admin  Dashboard Route
router.get('/dashboard', authenticate, isAdmin,adminDashboard)




module.exports = router;
