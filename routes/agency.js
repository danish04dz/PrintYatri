const express = require('express');
const router = express.Router();

//impoerting the auth middleware
const { authenticate, isAgency } = require('../middleware/auth');

// Importing the agency controller functions
const { agencyLogin, agencyDashboard } = require('../controllers/agency');

// importing the bus controller functions
const { createBus } = require('../controllers/bus');

// importing Conductor controller functions
const { createConductor } = require('../controllers/conductor');

// Agency Login Route
router.post('/login', agencyLogin);
// Agency Dashboard Route
router.get('/dashboard', authenticate, isAgency,agencyDashboard);

// create Bus Route
router.post('/createBus',authenticate, isAgency, createBus);

// create Conductor Route
router.post('/createConductor', authenticate, isAgency, createConductor);


module.exports = router;