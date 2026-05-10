const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  youtubeUrl: { type: String },
  thumbnailUrl: { type: String },
  tags: [String],
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' },
  views: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);
