const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema({

    stopName:{
        type:String,
        required:true
    },

    order:{
        type:Number,
        required:true
    },

    route:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Route",
        required:true
    }

},{timestamps:true})

module.exports = mongoose.model("Stop",stopSchema)