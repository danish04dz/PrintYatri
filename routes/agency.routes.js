const express = require('express');
const router = express.Router();

//importing the auth middleware
const { isAgency, verifyJWT } = require('../middleware/auth');

// Importing the agency controller functions
const { addBus,addRoutesAndStops,assignConductor } = require('../controllers/agency.controller');

// importing the bus controller functions


// importing Conductor controller functions
const { createConductor } = require('../controllers/conductor');



// create Bus Route
router.post('/addBus',verifyJWT,isAgency, addBus);

// add routes and stop
router.post('/addRoutesAndStops',verifyJWT,isAgency,addRoutesAndStops);

// assign conductor
router.post('/assignConductor',verifyJWT,isAgency,assignConductor)

// create Conductor Route
router.post('/createConductor', createConductor);


module.exports = router;