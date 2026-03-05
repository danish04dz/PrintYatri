const express = require('express');
const router = express.Router();

//impoerting the auth middleware
const {  } = require('../middleware/auth');

// Importing the agency controller functions
const { agencyLogin, agencyDashboard } = require('../controllers/agency');

// importing the bus controller functions
const { createBus } = require('../controllers/bus');

// importing Conductor controller functions
const { createConductor } = require('../controllers/conductor');

// Agency Login Route
router.post('/login', agencyLogin);
// Agency Dashboard Route
router.get('/dashboard',agencyDashboard);

// create Bus Route
router.post('/createBus', createBus);

// create Conductor Route
router.post('/createConductor', createConductor);


module.exports = router;