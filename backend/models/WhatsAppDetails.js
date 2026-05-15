const mongoose = require('mongoose');

const whatsappSchema = new mongoose.Schema({
  companyLegalName: { type: String, required: true, trim: true },
  customerType: { type: String, trim: true },
  whatsAppNumber: { type: String, trim: true },
  clientEmail: { type: String, trim: true },
  password: { type: String }, // Plain text for dashboard visibility
  api: { type: String, trim: true },
  namespace: { type: String, trim: true },
  status: { type: String, trim: true, default: 'Active' },
  closeDate: { type: Date },
  fbm: { type: String, trim: true }, // Facebook Business Manager
  fbmDate: { type: Date },
  hostingPlatformType: { type: String, trim: true },
  remarkStatus: { type: String, trim: true },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true // Automatically handles "Date" and "Sr No" logic implicitly
});

module.exports = mongoose.model('WhatsAppDetails', whatsappSchema);
