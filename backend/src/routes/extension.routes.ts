import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import extensionController from '../controllers/extension.controller';
import { apiKeyAuth } from '../middleware/extension-auth.middleware';
import extensionTestingLogger from '../middleware/extension-testing.middleware';

// Create uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

// File filter to only accept PDFs
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

// Configure upload limits
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

const router = Router();

// Apply API key authentication to all extension routes
router.use(apiKeyAuth);

// Apply testing logger if in test or development mode
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.EXTENSION_TESTING === 'true') {
  router.use(extensionTestingLogger);
}

// POST /api/extension/upload/file - Upload PDF file
router.post('/upload/file', upload.single('file'), extensionController.uploadFile);

// POST /api/extension/upload/url - Submit PDF URL
router.post('/upload/url', extensionController.uploadUrl);

// GET /api/extension/test - Test route for extension connectivity
router.get('/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Extension API is functioning correctly',
    timestamp: new Date().toISOString()
  });
});

export default router;