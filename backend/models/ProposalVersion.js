const mongoose = require('mongoose');

const proposalVersionSchema = new mongoose.Schema({
  proposalId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true, index: true },
  versionNumber: { type: Number, required: true },
  file: {
    filename:     { type: String, required: true },
    originalName: { type: String, required: true },
    path:         { type: String, required: true },
    size:         { type: Number },
    mimetype:     { type: String }
  },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changeLog:  { type: String },
  metadata:   { type: Map, of: String }
}, { timestamps: true });

module.exports = mongoose.model('ProposalVersion', proposalVersionSchema);
