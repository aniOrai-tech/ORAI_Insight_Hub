/**
 * Invoice Model — Zoho Books Style
 * Invoice generation, GST/tax, payment tracking, client-wise ledger
 */

const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  quantity:    { type: Number, required: true, min: 0, default: 1 },
  rate:        { type: Number, required: true, min: 0 },
  amount:      { type: Number, required: true, min: 0 },
  taxPercent:  { type: Number, default: 0, min: 0 },
  taxAmount:   { type: Number, default: 0, min: 0 }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  // Client linking
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    index: true
  },
  clientName:    { type: String, required: true, trim: true },
  clientEmail:   { type: String, trim: true, lowercase: true },
  clientPhone:   { type: String, trim: true },
  clientAddress: { type: String, trim: true },
  clientGSTIN:   { type: String, trim: true },

  // Ticket linking
  linkedTicketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  },
  // Meeting linking
  linkedMeetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting'
  },

  // Line Items
  items: [lineItemSchema],

  // Amounts
  subtotal:   { type: Number, required: true, min: 0, default: 0 },
  taxTotal:   { type: Number, default: 0, min: 0 },
  discount:   { type: Number, default: 0, min: 0 },
  discountType: { type: String, enum: ['flat', 'percent'], default: 'flat' },
  grandTotal: { type: Number, required: true, min: 0, default: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  balanceDue: { type: Number, default: 0, min: 0 },
  currency:   { type: String, default: 'INR' },

  // Tax details
  gstType: {
    type: String,
    enum: ['none', 'cgst_sgst', 'igst'],
    default: 'none'
  },
  cgstPercent: { type: Number, default: 0 },
  sgstPercent: { type: Number, default: 0 },
  igstPercent: { type: Number, default: 0 },

  // Dates
  issueDate: { type: Date, default: Date.now },
  dueDate:   { type: Date, required: true },

  // Status
  status: {
    type: String,
    enum: ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
    index: true
  },

  // Notes
  notes: { type: String },
  termsAndConditions: { type: String },

  // Reminder tracking
  reminderSent: { type: Boolean, default: false },
  reminderSentAt: { type: Date },

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

// Auto-generate invoice number
invoiceSchema.pre('validate', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    this.invoiceNumber = `INV-${yearMonth}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Auto-calculate balanceDue and check overdue
invoiceSchema.pre('save', function(next) {
  this.balanceDue = Math.max(0, this.grandTotal - this.paidAmount);

  // Auto-update status based on payment
  if (this.paidAmount >= this.grandTotal && this.grandTotal > 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0 && this.paidAmount < this.grandTotal) {
    this.status = 'partially_paid';
  }

  // Check overdue
  if (this.dueDate && new Date() > this.dueDate && !['paid', 'cancelled', 'draft'].includes(this.status)) {
    this.status = 'overdue';
  }

  next();
});

// Indexes
invoiceSchema.index({ department: 1, status: 1, createdAt: -1 });
invoiceSchema.index({ clientId: 1, createdAt: -1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ invoiceNumber: 1 });

invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
