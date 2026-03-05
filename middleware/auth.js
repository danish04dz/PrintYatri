const jwt = require("jsonwebtoken");
const User = require("../models/User.models")


exports.verifyJWT = async (req,res,next) => {
    try {
       const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","")

       if(!token){
        return res.status(401).json({message: "Unauthorized request"})
       }
      const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,)

      const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

      if(!user){
        return res.status(401).json({message: "Invalid Access token"})
      }
      req.user = user
      next()


    } catch (error) {
        console.log(error);
        
    }

}

exports.isAdmin = (req,res,next)=>{
  if(req.user.role!=="admin"){
    return res.status(403).json({message:'Admin only access'})
  }
  next();
}

exports.isConductor = (req,res,next)=>{
  if(req.user.role!=="conductor"){
    return res.status(403).json({message:'Conductor only access'})
  }
  next();
}

exports.isAgency = (req,res,next)=>{
  if(req.user.role!=="agency"){
    return res.status(403).json({message:'Agency only access'})
  }
  next();
} 