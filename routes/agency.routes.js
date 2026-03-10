const express = require('express');
const router = express.Router();

//importing the auth middleware
const { isAgency } = require('../middleware/auth');

// Importing the agency controller functions
const { addBus,addRoutesAndStops,assignConductor } = require('../controllers/agency.controller');

// importing the bus controller functions
const { createBus } = require('../controllers/bus');

// importing Conductor controller functions
const { createConductor } = require('../controllers/conductor');



// create Bus Route
router.post('/createBus', addBus);

// create Conductor Route
router.post('/createConductor', createConductor);


module.exports = router;