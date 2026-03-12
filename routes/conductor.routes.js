const express = require('express');
const router = express.Router();

// import auth
const { isConductor, verifyJWT } = require('../middleware/auth');

// import controller
const { getRoutesAndSTops } = require('../controllers/conductor.controller');

// create routes
router.get('/getRoutesAndStops', verifyJWT, isConductor, getRoutesAndSTops);

module.exports = router;