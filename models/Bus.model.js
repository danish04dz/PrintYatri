const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
    busNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase:true,   // ✅ automatically uppercase
        trim:true,
        match: [/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/, "Invalid Bus Number Format"]
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
        ref:"Agency"
    },
 
   
    // Relationship with Conductor
    assignedConductor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
},

  

   
},{timestamps: true});

module.exports = mongoose.model("Bus", busSchema);