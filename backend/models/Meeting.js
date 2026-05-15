/**
 * Meeting Model
 * Tracks meetings with 60-day expiry and email automation
 */

const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  // Header / Title
  header: {
    type: String,
    required: [true, 'Meeting header is required'],
    trim: true,
    maxlength: [200, 'Header cannot exceed 200 characters']
  },

  // Meeting Title/Subject (from calendar)
  title: {
    type: String,
    trim: true,
    maxlength: [300, 'Title cannot exceed 300 characters']
  },

  // Client / Account association
  clientName: {
    type: String,
    trim: true
  },

  // Teams integration
  teamsId: {
    type: String,
    unique: true,
    sparse: true
  },
  calendarEventId: {
    type: String,
    unique: true,
    sparse: true
  },
  source: {
    type: String,
    enum: ['manual', 'teams_sync', 'recording_import', 'auto_sync', 'calendar_sync'],
    default: 'manual'
  },
  joinUrl: {
    type: String
  },

  // Calendar-specific fields
  location: {
    type: String,
    trim: true
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  isAllDay: {
    type: Boolean,
    default: false
  },

  // Recording file path
  recording: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String
  },

  // AI/Manual summary
  summary: {
    type: String,
    trim: true
  },

  // Full transcript
  transcript: {
    type: String
  },

  // Additional metadata
  duration: {
    type: String
  },
  participants: [{
    type: String
  }],

  // Dates
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
  expiryDate: {
    type: Date
    // Auto-set to scheduledDate + 60 days
  },

  // Reminder tracking
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: {
    type: Date
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'expired', 'archived'],
    default: 'active'
  },

  // Who created this meeting
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  meetingOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ownerEmail: {
    type: String // Store email separately for reminder sending
  },

  // Department context
  department: {
    type: String,
    required: true
  },

  // Teams Extra Data
  recordingUrl: String,
  organizerName: String,

  // Proposal linking
  linkedProposalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal'
  }
}, {
  timestamps: true
});

// Auto-calculate expiry date (60 days from scheduled date)
meetingSchema.pre('save', function(next) {
  // If title is missing, use header
  if (!this.title && this.header) {
    this.title = this.header;
  }

  if (this.isModified('scheduledDate') || this.isNew) {
    const expiry = new Date(this.scheduledDate);
    expiry.setDate(expiry.getDate() + 60);
    this.expiryDate = expiry;
    
    // Auto-update status if date is already past
    if (expiry < new Date()) {
      this.status = 'expired';
    } else if (this.status === 'expired') {
      this.status = 'active'; // Re-activate if date moved to future
    }
  }
  next();
});

// Virtual: days until expiry
meetingSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const diff = this.expiryDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual: is expired
meetingSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiryDate;
});

// Indexes for efficient queries
meetingSchema.index({ expiryDate: 1, status: 1 });
meetingSchema.index({ department: 1, createdAt: -1 });
meetingSchema.index({ createdBy: 1 });
meetingSchema.index({ calendarEventId: 1 });

meetingSchema.set('toJSON', { virtuals: true });
meetingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Meeting', meetingSchema);
