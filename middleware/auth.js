const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }
    
    req.user = decoded;
    next();
  });
}
// This middleware checks for a JWT in the Authorization header, verifies it, and attaches the decoded user info to the request object.
// If the token is missing or invalid, it responds with an appropriate error message...       


// protected routes for Admin only
// This middleware checks if the user has an admin role
exports.isAdmin =(req,res,next) =>{
  if(req.user.role!=="admin"){
    return res.status(403).json({message:'Admin only acces'})
  }
  next();
}

// This middleware check is the user is Agency or not
//protected routes for agency only
exports.isAgency = (req, res, next) => {
  if (req.user.role !== "agency") {
    return res.status(403).json({ message: 'Agency only access' });
  }
  next();
}