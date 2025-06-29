const Ticket = require('../models/Ticket');
const Conductor = require('../models/Conductor');
const Bus = require('../models/Bus');

// Create a new ticket
exports.createTicket = async (req, res) => {
    try {
        const { passengerName, pickupLocation, dropLocation, fare } = req.body;
        // Validate required fields
        if (!passengerName || !pickupLocation || !dropLocation || !fare) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // get conductor ID from token
        const conductorId = req.user.id; // Assuming req.user is set by authentication middleware
        // find conductor info
        const conductor = await Conductor.findById(conductorId).populate('assignedBuses');
        if (!conductor || !conductor.assignedBuses) {
            return res.status(404).json({ message: 'Conductor not found or no assigned bus' });
        }
        // Create new ticket
        const newTicket = new Ticket({
            passengerName,
            pickupLocation,
            dropLocation,
            fare,
            busName: conductor.assignedBuses.busName,
            busNumber: conductor.assignedBuses.busNumber,
            conductorName: conductor.name,
            conductorPhone: conductor.phone,
        });

        // Save the ticket to the database
        await newTicket.save();
        res.status(201).json({
            message: 'Ticket created successfully',
            ticket:newTicket
        });

        }
        catch (error) {
            console.error('Error creating ticket:', error);
            res.status(500).json({ message: 'Internal server error' });
        }

        
 
    }
    