const express = require('express');
const router = express.Router(); 
 

// middleware for authentication and authorization
const {  isAdmin, verifyJWT } = require('../middleware/auth');

// Importing the admin controller functions
const {adminLogin,adminDashboard} = require('../controllers/admin');

const { createAgency } = require('../controllers/admin.controller');


// Admin Login Route
 router.post('/login',adminLogin)


 // admin  Dashboard Route
router.get('/dashboard', verifyJWT, isAdmin,adminDashboard)

// Create Agency Route
router.post('/create-agency',verifyJWT, isAdmin, createAgency);



module.exports = router;
