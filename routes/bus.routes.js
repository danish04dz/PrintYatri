const express = require('express');
const { getAllConductorsAndBusData,getRoutesWithBus, getConductorTickets} = require('../controllers/bus.controller');
const { isAgency, verifyJWT, isConductor } = require('../middleware/auth');
const router = express.Router(); 
 

router.get('/getConductorsAndBusses',verifyJWT,isAgency,getAllConductorsAndBusData) 

router.get('/getRoutes',verifyJWT,isAgency,getRoutesWithBus)

router.get('/tickets',verifyJWT,isConductor,getConductorTickets);




module.exports = router;
