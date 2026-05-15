/**
 * Payment Model
 * Payment recording with transaction tracking, linked to invoices
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true,
    required: true
  },

  // Invoice linking
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true
  },
  invoiceNumber: { type: String },

  // Client
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    index: true
  },
  clientName: { type: String, trim: true },

  // Payment details
  amount:   { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },

  paymentMethod: {
    type: String,
    enum: ['upi', 'bank_transfer', 'cash', 'cheque', 'card', 'razorpay', 'stripe', 'other'],
    default: 'bank_transfer'
  },

  transactionId:   { type: String, trim: true },
  referenceNumber: { type: String, trim: true },
  paymentDate:     { type: Date, default: Date.now },

  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed',
    index: true
  },

  notes: { type: String },

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

// Auto-generate payment ID
paymentSchema.pre('validate', async function(next) {
  if (this.isNew && !this.paymentId) {
    const count = await mongoose.model('Payment').countDocuments();
    this.paymentId = `PAY-${String(count + 1001).padStart(6, '0')}`;
  }
  next();
});

// Indexes
paymentSchema.index({ department: 1, createdAt: -1 });
paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
