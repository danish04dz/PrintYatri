const User = require ('../models/User.models')


// generate access and refresh token
const generateAccessAndRefreshTokens = async (userId)=>{
    try {
       const user = await User.findById(userId)

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

// user Register controller
exports.registerUser = async (req,res) => {
    try {
        //user register logic

        // get use detail from from frontend
        // validation lagan hai - koi field empty to nhi
        // check user already exist hai ya nhi
        
       
        
        // create user object - crete entry in db
        // remove password and refresh token field from response
        // check for user creation
        // return response

        const {name, phone, email, password} = req.body
        // console.log("email :" , email)

        if(!name || !phone || !email || !password){
            return res.status(400).json({message: "All fields are Required"})
        }
        
       const existingUser= await User.findOne({
            $or: [{ phone },{ email }]
        })

        if(existingUser){
            return res.status(409).json({message: " phone or email already exist"})
        }

       


        const user  = await User.create({
            name,
            phone,
            email,
            password,    
        })
        

        const createdUser = await User.findById(user._id).select("-password -refreshToken")

        if(!createdUser){
            return res.status(400).json({message: " something went wrong during creating user!"})
        }

        return res.status(201).json(
            {message: "User created successfully",
            user: createdUser}
        )
        
    } catch (error) {
        console.log(error);
        
    }
    
}


// User Login Controller
exports.loginUser = async (req,res) =>{
    try {
        // user se email ya username aur password  body se
    // find user hai ya nhi
    // password check
    //access and refresh token agar password correct hai to
    // send cookies 
    // send success response

   const {email, phone, password} = req.body
   if(!(phone || email)){
    return res.status(400).json({message:"Username or email required"})
   }

   const user = await User.findOne({
    $or : [{phone},{email}]
   })

   if(!user){
    return res.status(400).json({message: " user does not exist"})
   }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if(!isPasswordValid){
    return res.status(400).json({message: " Invalid user credentials"})
   }

   const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

   const  loggedinUser = await User.findById(user._id).select("-password -refreshToken")

   const options = {
    httpOnly : true,
    secure: true
   }
   return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json({user : loggedinUser,accessToken,refreshToken})
        
    } catch (error) {
        console.log("error in login controller", error)
    }
   
}

// User Logout Controller
exports.logoutUser = async (req,res) =>{
    try {
       await User.findByIdAndUpdate(req.user._id,{
            $set : {
                refreshToken: undefined
            }
        }) 

        const options = {
            httpOnly: true,
            secure: true
        }
        return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json({message: "User logged out successfully"})
        
    } catch (error) {
        console.log("error in logout controller", error)
        return res.status(500).json({message: "Internal server error"})
    }
}


// get current user controller


   
// get current user controller

exports.getCurrentUser = async (req, res) => {
    try {

        const user = await User.findById(req.user._id).select("-password -refreshToken")

        if(!user){
            return res.status(404).json({
                message: "User not found"
            })
        }

        return res.status(200).json({
            user
        })

    } catch (error) {
        console.log("error in getCurrentUser", error)

        return res.status(500).json({
            message: "Internal server error"
        })
    }
}