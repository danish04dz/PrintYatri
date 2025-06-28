const express = require('express');
const router = express.Router();

//impoerting the auth middleware
const { authenticate, isAgency } = require('../middleware/auth');

// Importing the agency controller functions
const { agencyLogin, agencyDashboard } = require('../controllers/agency');

// Agency Login Route
router.post('/login', agencyLogin);
// Agency Dashboard Route
router.get('/dashboard', authenticate, isAgency,agencyDashboard);


module.exports = router;