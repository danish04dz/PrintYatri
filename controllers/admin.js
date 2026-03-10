
const Admin = require('../models/Admin');
const Agency = require("../models/Agency.model");


const generateAccessAndRefreshTokens = async (userId)=>{
    try {
       const user = await Admin.findById(userId)

       const accessToken = user.generateAccessToken ()
       const refreshToken = user.generateRefreshToken ()

       user.refreshToken =refreshToken
       await user.save({
        validateBeforeSave : false
       })
       return  {accessToken, refreshToken}

        
    } catch (error) {
        console.log("error while generating access token",error);
        
    }
}

// Admin Login Controller
 
exports.adminLogin = async (req, res) => {
     const { email, password } = req.body;
    try {
        if(!email || !password){
            return res.status(400).json({message: "Email and password are required"})
          }
        const admin = await Admin.findOne({ email});
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });

        }
       if(!admin){
           return res.status(400).json({message: " user does not exist"})
          }
       
          const isPasswordValid = await admin.isPasswordCorrect(password)
       
          if(!isPasswordValid){
           return res.status(400).json({message: " Invalid user credentials"})
          }
       
          const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(admin._id)
       
          const  loggedinAdmin = await Admin.findById(admin._id).select("-password -refreshToken")
       
          const options = {
           httpOnly : true,
           secure: true
          }
          return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json({Admin : loggedinAdmin,accessToken,refreshToken})
               
           } catch (error) {
               console.log("error in login controller", error)
           }
}


// Admin Dashboard Controller
exports.adminDashboard = async (req, res) => {
    res.status(200).json({
        message: 'Welcome to the admin dashboard',
        admin: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role
        }
        });
}


// controller for creteAgency
exports.createAgency = async (req, res) =>{
    try {
        const { ownerName, agencyName, email, phone, password } = req.body;
        if (!ownerName || !agencyName || !email || !phone || !password){
            return res.status(400).json({ message: "All fields are required" });

        }
        // Check if agency already exists
        const existingAgency =await Agency.findOne({
            email: email
        })
        if (existingAgency) {
            return res.status(400).json({ message: "Agency already exists" });
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new agency
        const newAgency = new Agency({
            ownerName,
            agencyName,
            email,
            phone,
            password: hashedPassword,
            createdBy: req.user._id // Assuming req.user is set by authentication middleware
        });
        // Save the agency to the database
        await newAgency.save();
        res.status(201).json({ message: "Agency created successfully",
            agency : {
                id: newAgency._id,
                ownerName: newAgency.ownerName,
                agencyName: newAgency.agencyName,
                email: newAgency.email,
                phone: newAgency.phone,
            }
            
         });
        }

         catch (error) {
            console.error("Error creating agency:", error);
            res.status(500).json({ message: "Internal server error" });

         } 

}

