const mongoose = require('mongoose');
const ticketSchema = new mongoose.Schema({

    passengerName:{
        type:String,
       
    },

    ticketId : {
        type : String,
        required : true
    },
    fare:{
        type:Number,
        required:true
    },

    route:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Routes",
        required:true
    },

    pickupStop:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Stop",
        required:true
    },

    dropStop:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Stop",
        required:true
    },

    bus:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Bus",
        required:true
    },

    conductor:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    agency:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Agency",
        required:true
    }

},{timestamps:true})


module.exports = mongoose.model("Ticket",ticketSchema)