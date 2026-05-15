const mongoose = require('mongoose');

const ticketActivitySchema = new mongoose.Schema({
  ticketId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
  type: {
    type: String,
    enum: ['status_change', 'assignment', 'comment', 'attachment', 'sla_breach', 'field_update'],
    required: true
  },
  fieldName: { type: String },
  oldValue:  { type: mongoose.Schema.Types.Mixed },
  newValue:  { type: mongoose.Schema.Types.Mixed },
  content:   { type: String }, // For comments
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedByName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('TicketActivity', ticketActivitySchema);
