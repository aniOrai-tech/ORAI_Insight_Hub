const Proposal = require('../models/Proposal');
const ProposalVersion = require('../models/ProposalVersion');
const Meeting = require('../models/Meeting');
const { Upsell } = require('../models/index');
const path = require('path');
const fs = require('fs');

// ─── UPLOAD PROPOSAL ──────────────────────────────────────────────────────────
exports.uploadProposal = async (req, res, next) => {
  console.log('[PROPOSAL UPLOAD STARTED]');
  try {
    const { title, clientId, clientName, meetingId, upsellId, notes, status } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }
    console.log('[FILE VALIDATED]');

    // 1. Create or Update Proposal
    let proposal;
    if (req.body.proposalId) {
      proposal = await Proposal.findOne({ _id: req.body.proposalId, department: req.user.department });
      if (!proposal) return res.status(404).json({ success: false, message: 'Proposal not found' });
      proposal.currentVersion += 1;
      proposal.status = status || proposal.status;
    } else {
      proposal = new Proposal({
        title,
        clientId,
        clientName,
        meetingId,
        upsellId,
        notes,
        status: status || 'draft',
        createdBy: req.user._id,
        department: req.user.department
      });
    }

    await proposal.save();
    console.log('[PROPOSAL SAVED]');

    // 2. Create Proposal Version
    const version = await ProposalVersion.create({
      proposalId: proposal._id,
      versionNumber: proposal.currentVersion,
      file: {
        filename:     req.file.filename,
        originalName: req.file.originalname,
        path:         req.file.path,
        size:         req.file.size,
        mimetype:     req.file.mimetype
      },
      uploadedBy: req.user._id,
      changeLog: req.body.changeLog || `Version ${proposal.currentVersion} upload`
    });
    console.log('[VERSION CREATED]');

    // 3. Link back to Meeting/Upsell
    if (meetingId) {
      await Meeting.findByIdAndUpdate(meetingId, { linkedProposalId: proposal._id });
      console.log('[MEETING LINKED]');
    }
    if (upsellId) {
      await Upsell.findByIdAndUpdate(upsellId, { linkedProposalId: proposal._id });
      console.log('[PROPOSAL LINKED TO CLIENT]');
    }

    res.status(201).json({
      success: true,
      message: 'Proposal uploaded successfully',
      data: { proposal, version }
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET PROPOSALS ────────────────────────────────────────────────────────────
exports.getProposals = async (req, res, next) => {
  try {
    const filter = { department: req.user.department, isDeleted: false };
    const proposals = await Proposal.find(filter)
      .populate('clientId', 'companyName spocName')
      .sort({ updatedAt: -1 });
    
    res.json({ success: true, data: proposals });
  } catch (error) {
    next(error);
  }
};

// ─── GET PROPOSAL VERSIONS ─────────────────────────────────────────────────────
exports.getVersions = async (req, res, next) => {
  try {
    const versions = await ProposalVersion.find({ proposalId: req.params.id })
      .populate('uploadedBy', 'username fullName')
      .sort({ versionNumber: -1 });
    
    res.json({ success: true, data: versions });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    const proposal = await Proposal.findOneAndUpdate(
      { _id: req.params.id, department: req.user.department },
      { status: req.body.status },
      { new: true }
    );
    if (!proposal) return res.status(404).json({ success: false, message: 'Proposal not found' });
    res.json({ success: true, data: proposal });
  } catch (error) {
    next(error);
  }
};
