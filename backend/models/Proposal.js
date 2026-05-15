const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  proposalId: { type: String, unique: true },
  title:      { type: String, required: true, trim: true },
  clientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },
  clientName: { type: String, trim: true },
  meetingId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', index: true },
  upsellId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Upsell', index: true },
  status: {
    type: String,
    enum: ['draft', 'shared', 'under_review', 'approved', 'rejected', 'closed_won', 'closed_lost'],
    default: 'draft',
    index: true
  },
  currentVersion: { type: Number, default: 1 },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, required: true, index: true },
  notes:      { type: String },
  isDeleted:  { type: Boolean, default: false, index: true }
}, { timestamps: true });

proposalSchema.pre('validate', async function(next) {
  if (this.isNew && !this.proposalId) {
    const count = await mongoose.model('Proposal').countDocuments();
    this.proposalId = `PRP-${String(count + 1001).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Proposal', proposalSchema);
