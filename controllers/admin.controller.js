const User = require('../models/User.models')
const Agency = require('../models/Agency.model')

exports.createAgency = async (req, res) => {

    try {

        // 1️⃣ get data from body
        const { email, phone, agencyName, agencyAddress } = req.body;

        if (!email && !phone) {
            return res.status(400).json({
                message: "Email or phone is required"
            })
        }

        // 2️⃣ find user
        const user = await User.findOne({
            $or: [{ phone }, { email }]
        })

        // 3️⃣ if user not found
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }

        // 4️⃣ check if agency already exists
        const existingAgency = await Agency.findOne({
            owner: user._id
        })

        if (existingAgency) {
            return res.status(400).json({
                message: 'Agency already exists for this user'
            })
        }

        // 5️⃣ create agency
        const newAgency = await Agency.create({
            agencyName,
            owner: user._id,
            address: agencyAddress,

        })
        // update user role
        const updateUserRole = await User.findByIdAndUpdate(user._id, {
            role: "agency",
            agency: newAgency._id
        }, { new: true })


        // 6️⃣ success response
        return res.status(201).json({
            message: 'Agency created successfully',
            agency: newAgency,
            user : updateUserRole
        })

    } catch (error) {

        console.error(error)

        return res.status(500).json({
            message: "Internal Server Error"
        })

    }

}