const mongoose = require('mongoose');

// Conductor Schema
const conductorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["conductor"],
        default: "conductor"
    },
    agencyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agency',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // relation with Bus
    assignedBuses: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        default: null   
    },


    createdAt: {
        type: Date,
        default: Date.now
    }

})

module.exports = mongoose.model("Conductor", conductorSchema);