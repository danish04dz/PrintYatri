const User = require("../models/User.models");
const Agency = require("../models/Agency.model");

// ─────────────────────────────────────────────────
// Create Agency (Admin assigns agency to a registered user)
// ─────────────────────────────────────────────────
exports.createAgency = async (req, res, next) => {
  try {
    const { email, phone, agencyName, agencyAddress, city, agencyPhone, agencyEmail, licenseNumber } = req.body;

    // Validate — need at least email or phone to find the user
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email or phone is required to find the user",
      });
    }

    if (!agencyName) {
      return res.status(400).json({
        success: false,
        message: "Agency name is required",
      });
    }

    // Find the user who will become the agency owner
    const user = await User.findOne({ $or: [{ phone }, { email }] });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found. Ask the agency owner to register first at /api/user/register",
      });
    }

    // Check if this user already owns an agency
    const existingAgency = await Agency.findOne({ owner: user._id });
    if (existingAgency) {
      return res.status(409).json({
        success: false,
        message: "This user already has an agency registered",
      });
    }

    // Create agency
    const newAgency = await Agency.create({
      agencyName: agencyName.trim(),
      owner: user._id,
      address: agencyAddress,
      city,
      phone: agencyPhone,
      email: agencyEmail,
      licenseNumber,
      status: "approved", // Admin-created agencies are auto-approved
      trialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day trial
    });

    // Upgrade user role to "agency"
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { role: "agency", agency: newAgency._id },
      { new: true }
    ).select("-password -refreshToken");

    return res.status(201).json({
      success: true,
      message: "Agency created successfully. User role upgraded to agency.",
      agency: newAgency,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Delete / Suspend Agency — ✅ NEW
// ─────────────────────────────────────────────────
exports.deleteAgency = async (req, res, next) => {
  try {
    const { agencyId } = req.params;

    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    // Downgrade owner role back to guest
    await User.findByIdAndUpdate(agency.owner, { role: "guest", agency: null });

    // Deactivate all conductors of this agency
    await User.updateMany(
      { agency: agencyId, role: "conductor" },
      { isActive: false }
    );

    await Agency.findByIdAndDelete(agencyId);

    return res.status(200).json({
      success: true,
      message: "Agency deleted. Owner role reverted. Conductors deactivated.",
    });
  } catch (error) {
    next(error);
  }
};

exports.suspendAgency = async (req, res, next) => {
  try {
    const { agencyId } = req.params;
    const { reason } = req.body;

    const agency = await Agency.findByIdAndUpdate(
      agencyId,
      { status: "suspended" },
      { new: true }
    );

    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Agency suspended${reason ? `: ${reason}` : ""}`,
      agency,
    });
  } catch (error) {
    next(error);
  }
};