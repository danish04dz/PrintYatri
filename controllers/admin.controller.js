const User = require("../models/User.models");
const Agency = require("../models/Agency.model");
const bcrypt = require("bcryptjs");
const { broadcast } = require("../utils/sseStream");

// ─────────────────────────────────────────────────
// Create Agency — Admin creates agency & provides login credentials
// ─────────────────────────────────────────────────
exports.createAgency = async (req, res, next) => {
  try {
    const {
      ownerName,
      phone,
      password,
      agencyName,
      city,
      agencyPhone,
      agencyEmail,
      licenseNumber,
      subscriptionPlan = "free_trial",
    } = req.body;

    if (!ownerName || !phone || !password || !agencyName) {
      return res.status(400).json({
        success: false,
        message: "ownerName, phone, password, and agencyName are required",
      });
    }

    // Check if phone already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this phone number already exists",
      });
    }

    // Create the user account (hashing happens in pre-save hook)
    // Email is required by User model — generate a synthetic one if not provided
    const ownerEmail = agencyEmail || `${phone}@printyatri.local`;

    const newUser = await User.create({
      name: ownerName,
      phone,
      email: ownerEmail,
      password,
      role: "agency",
      isActive: true,
    });

    // Create the agency linked to this user
    const newAgency = await Agency.create({
      agencyName: agencyName.trim(),
      owner: newUser._id,
      city,
      phone: agencyPhone || phone,
      email: agencyEmail,
      licenseNumber,
      status: "approved",
      subscriptionPlan,
      maxBuses: subscriptionPlan === "paid" ? 50 : 5,
      trialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Link agency back to user
    await User.findByIdAndUpdate(newUser._id, { agency: newAgency._id });

    return res.status(201).json({
      success: true,
      message: "Agency created. Owner can log in with the provided phone & password.",
      credentials: {
        phone,
        password, // Show once — admin must note it down
      },
      agency: newAgency,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Upgrade / Change Plan
// ─────────────────────────────────────────────────
exports.upgradePlan = async (req, res, next) => {
  try {
    const { agencyId } = req.params;
    const { subscriptionPlan } = req.body;

    const validPlans = ["free_trial", "paid", "expired"];
    if (!validPlans.includes(subscriptionPlan)) {
      return res.status(400).json({
        success: false,
        message: `Invalid plan. Must be one of: ${validPlans.join(", ")}`,
      });
    }

    const updateData = {
      subscriptionPlan,
      // Upgrade bus limit based on plan
      maxBuses: subscriptionPlan === "paid" ? 50 : 5,
    };

    // Reset trial expiry if going back to trial
    if (subscriptionPlan === "free_trial") {
      updateData.trialExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const agency = await Agency.findByIdAndUpdate(agencyId, updateData, {
      new: true,
      runValidators: true,
    }).populate("owner", "name email phone");

    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    // 🔴 Real-time broadcast to all connected admin panels
    broadcast("agency_plan_changed", {
      agencyId: agency._id,
      agencyName: agency.agencyName,
      subscriptionPlan,
      maxBuses: agency.maxBuses,
      ts: Date.now(),
    });

    return res.status(200).json({
      success: true,
      message: `Agency plan updated to ${subscriptionPlan}`,
      agency,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Suspend Agency
// ─────────────────────────────────────────────────
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

    // 🔴 Real-time broadcast — mobile apps will see this within their poll cycle
    broadcast("agency_suspended", {
      agencyId: agency._id,
      agencyName: agency.agencyName,
      status: "suspended",
      reason: reason || null,
      ts: Date.now(),
    });

    return res.status(200).json({
      success: true,
      message: `Agency suspended${reason ? `: ${reason}` : ""}`,
      agency,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Unsuspend / Approve Agency
// ─────────────────────────────────────────────────
exports.unsuspendAgency = async (req, res, next) => {
  try {
    const { agencyId } = req.params;

    const agency = await Agency.findByIdAndUpdate(
      agencyId,
      { status: "approved" },
      { new: true }
    );

    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    // 🟢 Real-time broadcast — mobile apps will detect restoration on next poll
    broadcast("agency_unsuspended", {
      agencyId: agency._id,
      agencyName: agency.agencyName,
      status: "approved",
      ts: Date.now(),
    });

    return res.status(200).json({
      success: true,
      message: "Agency reactivated successfully",
      agency,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Reset Agency Owner Password
// ─────────────────────────────────────────────────
exports.resetUserPassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      userId: user._id,
      phone: user.phone,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────
// Delete Agency
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

    // Deactivate all conductors
    await User.updateMany(
      { agency: agencyId, role: "conductor" },
      { isActive: false, agency: null }
    );

    await Agency.findByIdAndDelete(agencyId);

    // 🔴 Real-time broadcast
    broadcast("agency_deleted", {
      agencyId,
      agencyName: agency.agencyName,
      ts: Date.now(),
    });

    return res.status(200).json({
      success: true,
      message: "Agency deleted. Owner role reverted. Conductors deactivated.",
    });
  } catch (error) {
    next(error);
  }
};