/**
 * Resource Controllers
 * Bot, Client, Upsell, and Requirement CRUD operations
 */

const { Bot, Client, Upsell, Requirement } = require('../models/index');
const { sanitizePayload } = require('../services/mappers/accountMapper');

// ─── Generic CRUD factory ─────────────────────────────────────────────────────
const createCRUD = (Model, resourceName) => ({
  getAll: async (req, res, next) => {
    try {
      const { search, page = 1, limit = 20, ...filters } = req.query;
      const filter = req.user.role === 'admin' ? { ...filters } : { department: req.user.department, ...filters };
      
      const total = await Model.countDocuments(filter);
      const items = await Model.find(filter)
        .populate('createdBy', 'username fullName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: items,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
      });
    } catch (error) { next(error); }
  },

  getOne: async (req, res, next) => {
    try {
      const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, department: req.user.department };
      const item = await Model.findOne(query)
        .populate('createdBy', 'username fullName');
      if (!item) return res.status(404).json({ success: false, message: `${resourceName} not found` });
      res.json({ success: true, data: item });
    } catch (error) { next(error); }
  },

  create: async (req, res, next) => {
    try {
      console.log("[PAYLOAD BEFORE SAVE]", req.body);
      const sanitizedBody = sanitizePayload(req.body, resourceName);
      const data = { ...sanitizedBody, createdBy: req.user._id, department: req.user.department };
      
      if (req.file) {
        const fileData = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        };
        
        if (resourceName === 'Requirement') {
          data.recording = fileData;
        } else if (resourceName === 'Upsell') {
          data.proposalFile = fileData;
        }
      }

      const item = await Model.create(data);
      await item.populate('createdBy', 'username fullName');
      res.status(201).json({ success: true, message: `${resourceName} created successfully`, data: item });
    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join('. ') });
      }
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const sanitizedBody = sanitizePayload(req.body, resourceName);
      const data = { ...sanitizedBody };
      const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, department: req.user.department };
      
      if (req.file) {
        const fileData = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        };
        
        if (resourceName === 'Requirement') {
          data.recording = fileData;
        } else if (resourceName === 'Upsell') {
          data.proposalFile = fileData;
        }
      }

      const item = await Model.findOneAndUpdate(
        query,
        data, { new: true, runValidators: true }
      ).populate('createdBy', 'username fullName');
      if (!item) return res.status(404).json({ success: false, message: `${resourceName} not found` });
      res.json({ success: true, message: `${resourceName} updated`, data: item });
    } catch (error) { next(error); }
  },

  delete: async (req, res, next) => {
    try {
      const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, department: req.user.department };
      const item = await Model.findOneAndDelete(query);
      if (!item) return res.status(404).json({ success: false, message: `${resourceName} not found` });
      res.json({ success: true, message: `${resourceName} deleted` });
    } catch (error) { next(error); }
  }
});

module.exports = {
  botController: createCRUD(Bot, 'Bot'),
  clientController: createCRUD(Client, 'Client'),
  upsellController: createCRUD(Upsell, 'Upsell'),
  requirementController: createCRUD(Requirement, 'Requirement')
};
