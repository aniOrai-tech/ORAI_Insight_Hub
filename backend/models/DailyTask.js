/**
 * Daily Task Model
 * Redesigned for automatic productivity tracking based on task durations.
 */

const mongoose = require('mongoose');

const dailyTaskSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Member is required']
  },
  memberName: {
    type: String,
    trim: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },
  clientName: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  // Note: Login/Logout are now optional metadata
  loginTime: {
    type: String, 
    default: ''
  },
  logoutTime: {
    type: String,
    default: ''
  },
  sessionDurationMinutes: {
    type: Number,
    default: 0
  },
  taskTimeSpentMinutes: {
    type: Number,
    required: [true, 'Task Time Spent is required'],
    min: [1, 'Time spent must be at least 1 minute'],
    default: 0
  },
  workHoursFormatted: {
    type: String,
    default: '0h 00m'
  },
  taskActivity: {
    type: String,
    required: [true, 'Task/Activity description is required'],
    trim: true
  },
  taskType: {
    type: String,
    enum: ['development', 'support', 'meeting', 'research', 'testing', 'documentation', 'other'],
    default: 'development'
  },
  comments: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'pending', 'completed'],
    default: 'completed'
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Auto-calculate formatting before saving
dailyTaskSchema.pre('save', function(next) {
  // Ensure session duration is driven by task time spent
  this.sessionDurationMinutes = this.taskTimeSpentMinutes || 0;
  
  const h = Math.floor(this.sessionDurationMinutes / 60);
  const m = String(this.sessionDurationMinutes % 60).padStart(2, '0');
  this.workHoursFormatted = `${h}h ${m}m`;
  
  console.log('[PRODUCTIVE HOURS CALCULATED]', { 
    id: this._id, 
    minutes: this.taskTimeSpentMinutes, 
    formatted: this.workHoursFormatted 
  });
  
  next();
});

module.exports = mongoose.model('DailyTask', dailyTaskSchema);
