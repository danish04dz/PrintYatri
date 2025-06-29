const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    passengerName: {
        type: String,
        required: true
    },
    pickupLocation: {
        type: String,
        required: true
    },
    dropLocation: {
        type: String,
        required: true
    },
    fare: {
        type: Number,   
        required: true
    },
    busNumber: {
        type: String,
        required: true
    },  
    conductorName: {
        type: String,   
        required: true
    },
    conductorPhone: {
        type: String,
        required: true
    },
   busName: {
        type: String,
        required: true
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    busId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: true
    },
    conductorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conductor',
        required: true
    },
}, {
    timestamps: true}
);  

module.exports = mongoose.model('Ticket', ticketSchema);