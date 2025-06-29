const express = require('express');
const router = express.Router();

// Importing the auth middleware
const { authenticate, isConductor } = require('../middleware/auth');

// Importing the conductor controller functions
const { conductorLogin,conductorDashboard } = require('../controllers/conductor');
 const { createTicket } = require('../controllers/ticket');


// Conductor Login Route
router.post('/login', conductorLogin);

// Conductor Dashboard Route
router.get('/dashboard', authenticate, isConductor,conductorDashboard)

// Generating a new ticket
router.post('/ticket', authenticate, isConductor, createTicket);



module.exports = router;