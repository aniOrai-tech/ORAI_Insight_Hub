/**
 * Bot Details Model
 * Chatbot configuration and credentials per client
 */

const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  accountId: {
    type: String,
    required: [true, 'Account ID is required'],
    trim: true
  },
  password: {
    type: String,
    // Encrypted storage recommended for production
  },
  apiKey: {
    type: String,
    trim: true
  },
  namespace: {
    type: String,
    trim: true
  },
  number: {
    type: String,
    trim: true
  },
  accountType: {
    type: String,
    enum: ['standard', 'premium', 'enterprise', 'trial'],
    default: 'standard'
  },
  remark: {
    type: String,
    enum: ['CRM Integration', 'GSheet Integration', 'External API Integration', 'None'],
    default: 'None'
  },
  smartLink: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

botSchema.index({ accountId: 1 });
botSchema.index({ department: 1 });

/**
 * Client Details Model
 * SPOC and contact information
 */
const clientSchema = new mongoose.Schema({
  spocName: {
    type: String,
    required: [true, 'SPOC name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    trim: true
  },
  companyName: {
    type: String,
    trim: true
  },
  accountId: {
    type: String,
    trim: true
    // Optional link to bot account
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

clientSchema.index({ email: 1 });
clientSchema.index({ department: 1 });

/**
 * Upsell Tracker Model
 * Proposal and payment tracking
 */
const upsellSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  proposal: {
    type: String,
    required: [true, 'Proposal description is required']
  },
  proposalFile: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String
  },
  proposalAmount: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  utrNumber: {
    type: String,
    trim: true
  },
  paymentReceived: {
    type: Boolean,
    default: false
  },
  paymentDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'negotiation', 'closed_won', 'closed_lost'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true
  },
  linkedProposalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal'
  }
}, {
  timestamps: true
});

upsellSchema.index({ department: 1, status: 1 });
upsellSchema.index({ paymentReceived: 1 });

/**
 * New Requirement Model
 * For Implementation and Dev teams
 */
const requirementSchema = new mongoose.Schema({
  accountName: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true
  },
  accountManagerName: {
    type: String,
    required: [true, 'Account manager name is required'],
    trim: true
  },
  usecaseSummary: {
    type: String,
    required: [true, 'Usecase summary is required']
  },
  recording: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['new', 'in_review', 'in_progress', 'completed', 'rejected'],
    default: 'new'
  },
  estimatedCompletionDate: {
    type: Date
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

requirementSchema.index({ department: 1, status: 1 });
requirementSchema.index({ createdAt: -1 });

module.exports = {
  Bot: mongoose.model('Bot', botSchema),
  Client: mongoose.model('Client', clientSchema),
  Upsell: mongoose.model('Upsell', upsellSchema),
  Requirement: mongoose.model('Requirement', requirementSchema)
};
