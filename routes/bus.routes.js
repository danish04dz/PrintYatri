const express = require('express');
const { getAllConductorsAndBusData,getRoutesWithBus } = require('../controllers/bus.controller');
const { isAgency, verifyJWT } = require('../middleware/auth');
const router = express.Router(); 
 

router.get('/getConductorsAndBusses',verifyJWT,isAgency,getAllConductorsAndBusData) 

router.get('/getRoutes',verifyJWT,isAgency,getRoutesWithBus)




module.exports = router;
