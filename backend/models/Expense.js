/**
 * Expense Model
 * Track business expenses with categories, receipts, and approval
 */

const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  expenseId: {
    type: String,
    unique: true,
    required: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['travel', 'software', 'hardware', 'marketing', 'office', 'salary', 'vendor', 'hosting', 'communication', 'other'],
    default: 'other',
    index: true
  },
  amount:   { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  date:     { type: Date, default: Date.now },

  // Vendor/payee
  vendor: { type: String, trim: true },

  // Receipt
  receipt: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String
  },

  // Client linking (if expense is client-specific)
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    index: true
  },
  clientName: { type: String, trim: true },

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'reimbursed'],
    default: 'approved',
    index: true
  },

  notes: { type: String },

  // Tax
  taxPercent: { type: Number, default: 0 },
  taxAmount:  { type: Number, default: 0 },

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

  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Auto-generate expense ID
expenseSchema.pre('validate', async function(next) {
  if (this.isNew && !this.expenseId) {
    const count = await mongoose.model('Expense').countDocuments();
    this.expenseId = `EXP-${String(count + 1001).padStart(6, '0')}`;
  }
  next();
});

// Indexes
expenseSchema.index({ department: 1, date: -1 });
expenseSchema.index({ category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
