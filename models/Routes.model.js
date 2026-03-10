const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema({

    startRouteName:{
        type:String,
        required:true
    },

    endRouteName:{
        type:String,
        required:true
    },

    bus:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Bus",
        required:true
    },

    agency:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Agency",
        required:true
    }

},{timestamps:true})

module.exports = mongoose.model("Route",routeSchema)