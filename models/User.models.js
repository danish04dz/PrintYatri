const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require ('jsonwebtoken')


const userSchema = new mongoose.Schema({


    name : {
        type : String,
        required : true
    },
    phone : {
        type : String,
        required : true
    },
    email : { 
        type : String,
        required : true
    },
    password : {
        type : String,
        required : true
    },

   role: {
        type: String,
        enum: ["conductor","agency","guest","admin"],
        default: "guest"
    },
     isActive: {
        type: Boolean,
        default: true
    },
    refreshToken : {
        type : String
    },
    agency : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Agency",
        default : null
    },
    assignedBus : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Bus",
        default : null
    }


},{timestamps: true})

userSchema.pre("save", async function(next) {
     if(!this.isModified("password"))
        return next()
    this.password = await bcrypt.hash(this.password,10)
      next()
})

// Method to compare passwords
userSchema.methods.isPasswordCorrect = async function (password) {
   return await  bcrypt.compare(password,this.password)
    
}

// access token

userSchema.methods.generateAccessToken = function(){

    return  jwt.sign(
        {
            _id :this._id,
            email : this.email,
            phone : this.phone,
            name : this.name,
            role : this.role
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
    
}
userSchema.methods.generateRefreshToken = function(){
     return  jwt.sign(
        {
            _id :this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
    
}

module.exports = mongoose.model("User", userSchema)
