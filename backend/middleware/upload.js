/**
 * File Upload Middleware
 * Multer config for recordings and attachments
 * Accepts ALL common recording formats and document types
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = file.fieldname === 'recording' ? 'recordings' : 'attachments';
    const dir = path.join(uploadDir, subDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Accept all file types — no MIME filter restriction
// The frontend already limits the file picker, and the size limit
// provides protection against abuse
const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB to support large recordings
  }
});

module.exports = upload;
