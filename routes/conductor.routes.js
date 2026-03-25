const express = require('express');
const router = express.Router();

// import auth
const { isConductor, verifyJWT } = require('../middleware/auth');

// import controller
const { getRoutesAndSTops, generateTicket } = require('../controllers/conductor.controller');

// create routes
router.get('/getRoutesAndStops', verifyJWT, isConductor, getRoutesAndSTops);
router.post('/generateTicket', verifyJWT,isConductor, generateTicket)

module.exports = router;