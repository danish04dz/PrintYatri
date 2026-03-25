const express = require('express');
const { getAllConductorsAndBusData } = require('../controllers/bus.controller');
const { isAgency, verifyJWT } = require('../middleware/auth');
const router = express.Router(); 
 

router.get('/getConductorsAndBusses',verifyJWT,isAgency,getAllConductorsAndBusData) 






module.exports = router;
