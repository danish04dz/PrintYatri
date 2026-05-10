const mongoose = require("mongoose");

const demoRequestSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    agencyName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'contacted', 'demo_done', 'rejected'],
        default: 'pending'
    },
    notes: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model("DemoRequest", demoRequestSchema);
