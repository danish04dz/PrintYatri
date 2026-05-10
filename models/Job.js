const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, required: true },
  experience: { type: String },
  skills: { type: String },
  description: { type: String, required: true },
  selectionProcess: [String],
  status: { type: String, enum: ['Active', 'Paused', 'Closed'], default: 'Active' },
  urgent: { type: Boolean, default: false },
  applicants: { type: Number, default: 0 },
  postedDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
