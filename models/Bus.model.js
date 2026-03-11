const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
    busNumber: {
        type: String,
        required: true,
        unique: true
    },
    busName:{
        type: String,
        required: true
    },
    
    totalSeats: {
        type: Number,   
        required: true,
    },
 agency:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
 
   
    // Relationship with Conductor
    assignedConductor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
},

  

   
},{timestamps: true});

module.exports = mongoose.model("Bus", busSchema);