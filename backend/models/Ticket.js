/**
 * Ticket Model — Zoho Desk Style
 * Support ticket tracking with SLA, assignments, notes, and client linking
 */

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  content:   { type: String, required: true },
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName:{ type: String },
  isInternal:{ type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [300, 'Subject cannot exceed 300 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'pending', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  category: {
    type: String,
    enum: ['bug', 'feature_request', 'support', 'billing', 'onboarding', 'integration', 'other'],
    default: 'support'
  },

  // Client linking
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    index: true
  },
  clientName: { type: String, trim: true },
  contactEmail: { type: String, trim: true, lowercase: true },
  contactPhone: { type: String, trim: true },

  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  assignedToName: { type: String },
  implementationTeam: { 
    type: String, 
    enum: ['Development', 'Design', 'Implementation', 'Operations', 'Quality Assurance', 'None'],
    default: 'None'
  },
  csSpoc: { type: String, trim: true },

  // Meeting linking
  linkedMeetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting'
  },

  // Invoice linking
  linkedInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },

  // SLA Tracking
  slaDeadline: { type: Date },
  slaBreach: { type: Boolean, default: false },
  firstResponseAt: { type: Date },
  resolvedAt: { type: Date },
  closedAt: { type: Date },

  // Conversation / Notes timeline
  notes: [noteSchema],

  // Attachments
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Tags for filtering
  tags: [{ type: String, trim: true }],

  // Ownership
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true,
    index: true
  },

  // Soft delete
  isDeleted: { type: Boolean, default: false, index: true }
}, {
  timestamps: true
});

// Auto-generate ticket ID
ticketSchema.pre('validate', async function(next) {
  if (this.isNew && !this.ticketId) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketId = `TKT-${String(count + 1001).padStart(6, '0')}`;
  }
  next();
});

// Auto-calculate SLA deadline based on priority
ticketSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('priority')) {
    const slaHours = { critical: 4, high: 8, medium: 24, low: 48 };
    const hours = slaHours[this.priority] || 24;
    this.slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  // Track resolution/close times
  if (this.isModified('status')) {
    if (this.status === 'resolved' && !this.resolvedAt) this.resolvedAt = new Date();
    if (this.status === 'closed' && !this.closedAt) this.closedAt = new Date();
  }

  // Check SLA breach
  if (this.slaDeadline && new Date() > this.slaDeadline && !['resolved', 'closed'].includes(this.status)) {
    this.slaBreach = true;
  }

  next();
});

// Indexes
ticketSchema.index({ department: 1, status: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ clientId: 1 });
ticketSchema.index({ ticketId: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ slaDeadline: 1, slaBreach: 1 });

ticketSchema.set('toJSON', { virtuals: true });
ticketSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Ticket', ticketSchema);
