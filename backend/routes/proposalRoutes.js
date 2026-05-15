const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/proposals/'),
  filename: (req, file, cb) => cb(null, `PRP-${Date.now()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.pptx', '.xlsx', '.doc', '.ppt', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Invalid file type. Supported: PDF, DOCX, PPTX, XLSX'));
  }
});

router.use(protect);

router.get('/', proposalController.getProposals);
router.get('/:id/versions', proposalController.getVersions);
router.post('/upload', upload.single('proposalFile'), proposalController.uploadProposal);
router.patch('/:id/status', proposalController.updateStatus);

module.exports = router;
