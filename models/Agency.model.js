const mongoose = require("mongoose");

const agencySchema = new mongoose.Schema({

    agencyName:{
        type:String,
        required:true
    },

    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    address:{
        type:String
    }

},{timestamps:true})

module.exports = mongoose.model("Agency",agencySchema)