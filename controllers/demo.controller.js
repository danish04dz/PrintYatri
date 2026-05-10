const DemoRequest = require('../models/DemoRequest.model');

// Submit a new demo request (Public)
exports.submitDemoRequest = async (req, res) => {
    try {
        const { name, agencyName, phone, email } = req.body;
        
        if (!name || !agencyName || !phone || !email) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const newRequest = await DemoRequest.create({
            name,
            agencyName,
            phone,
            email
        });

        res.status(201).json({
            message: "Demo request submitted successfully. We will contact you soon.",
            request: newRequest
        });
    } catch (error) {
        console.error("Error submitting demo request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get all demo requests (Admin only)
exports.getAllDemoRequests = async (req, res) => {
    try {
        const requests = await DemoRequest.find().sort({ createdAt: -1 });
        res.status(200).json({ requests });
    } catch (error) {
        console.error("Error fetching demo requests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update demo request status (Admin only)
exports.updateDemoRequestStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status, notes } = req.body;

        const updatedRequest = await DemoRequest.findByIdAndUpdate(
            requestId,
            { status, notes },
            { new: true }
        );

        if (!updatedRequest) {
            return res.status(404).json({ message: "Demo request not found" });
        }

        res.status(200).json({
            message: "Demo request updated successfully",
            request: updatedRequest
        });
    } catch (error) {
        console.error("Error updating demo request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
