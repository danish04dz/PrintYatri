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
    StartingPoint: {
        type: String,
        required: true
    },
    Destination: {
        type: String,
        required: true
    },
    totalSeats: {
        type: Number,   
        required: true,
    },

    // Relationship with Agency
    agencyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agency',
        required: true
    },
    // Relationship with Conductor
    conductorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conductor',
        required: true

    },
    // add timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
   
})

module.exports = mongoose.model("Bus", busSchema);