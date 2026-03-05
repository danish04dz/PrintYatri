const mongoose = require ('mongoose');
const bcrypt = require ('bcryptjs');
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema({

    name :{
        type: String,
        required : true
    },
    email : {
        type : String,
        required :true
    },
    password :{
        type : String,
        required : true
    },
    role:{
        type : String,
        default : "admin"
    },
    refreshToken : {
        type : String
    }

},{timestamps: true})

adminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});


// Method to compare passwords
adminSchema.methods.isPasswordCorrect = async function (password) {
   return await  bcrypt.compare(password,this.password)
    
}

// access token

adminSchema.methods.generateAccessToken = function(){

    return  jwt.sign(
        {
            _id :this._id,
            email : this.email,
            name : this.name,
            role : this.role
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
    
}
adminSchema.methods.generateRefreshToken = function(){
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







module.exports = mongoose.model("Admin",adminSchema);