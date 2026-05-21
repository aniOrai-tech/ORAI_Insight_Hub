/**
 * Member Model
 * Team members for task tracking (can be users or separate profiles)
 */

const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Member name is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true
  },
  designation: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    enum: ['CS Team', 'Implementation Team', 'Dev Team', 'Sales Team', 'Operations', 'Management'],
    default: 'Operations'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Member', memberSchema);
