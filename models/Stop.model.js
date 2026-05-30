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
        required:true,
        index: true,
    }

},{timestamps:true})

// ✅ NEW: Index for sorting
stopSchema.index({ route: 1, order: 1 });

module.exports = mongoose.model("Stop",stopSchema)