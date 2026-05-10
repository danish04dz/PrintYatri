const express = require('express');
const router = express.Router();
const demoController = require('../controllers/demo.controller');

// Public route to submit demo
router.post('/submit', demoController.submitDemoRequest);

// Admin routes for demo requests
// Note: Assuming there's a middleware to verify admin token, we will apply it in Server.js or here.
router.get('/', demoController.getAllDemoRequests);
router.put('/:requestId', demoController.updateDemoRequestStatus);

module.exports = router;
