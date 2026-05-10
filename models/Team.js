const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  dept: { type: String, required: true },
  bio: { type: String, required: true },
  imageUrl: { type: String },
  social: {
    linkedin: { type: String },
    twitter: { type: String },
    github: { type: String }
  },
  badge: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
