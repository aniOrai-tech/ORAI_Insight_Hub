const mongoose = require('mongoose');

const healthCheckSchema = new mongoose.Schema({
  monthYear: { type: String, required: true, index: true }, // e.g. "April 2026"
  cstPoc: { type: String, trim: true },
  customerName: { type: String, required: true, trim: true },
  customerType: { type: String, trim: true },
  status: { type: String, trim: true },
  channelsLiveOn: { type: String, trim: true },
  updateStatus: { type: String, trim: true },
  dateOfCall1: { type: Date },
  platformUsageRemark: { type: String, trim: true },
  dateOfCall2: { type: Date },
  remark2: { type: String, trim: true },
  dateOfCall3: { type: Date },
  remark3: { type: String, trim: true },
  emailSent: { type: String, trim: true },
  
  // Financial context
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'cleared', 'overdue'],
    default: 'pending'
  },
  pendingAmount: {
    type: Number,
    default: 0
  },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('HealthCheck', healthCheckSchema);
