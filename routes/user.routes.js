const express = require('express');
const router = express.Router(); 


// importing the auth middleware and controllers
const { registerUser, loginUser, logoutUser , getCurrentUser} = require('../controllers/user.controller');
const { verifyJWT } = require('../middleware/auth');


// user register Routes
router.post('/register', registerUser);

// login
router.post('/login',loginUser)

// logout
router.post('/logout',verifyJWT,logoutUser)

router.get('/me',verifyJWT,getCurrentUser)


module.exports = router;