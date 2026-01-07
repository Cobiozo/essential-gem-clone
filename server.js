/**
 * Production Node.js server for Mobilne-3D Platform
 * Deployed on Cyberfolks.pl (s108.cyber-folks.pl - 195.78.66.103)
 * 
 * This server serves the built static files from the 'dist' directory
 * and handles client-side routing for the Single Page Application (SPA).
 * 
 * Usage:
 * 1. Build the application: npm run build
 * 2. Install dependencies: npm install express compression multer
 * 3. Start the server: node server.js
 * 
 * For production use with PM2:
 * pm2 start ecosystem.config.js
 */

import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const PRODUCTION_DOMAIN = process.env.PRODUCTION_DOMAIN || 'https://purelife.info.pl';

// Upload configuration
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folder || '';
    const uploadPath = folder ? path.join(UPLOADS_DIR, folder) : UPLOADS_DIR;
    
    // Create folder if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_') // Sanitize filename
      .substring(0, 50); // Limit length
    
    cb(null, `${timestamp}-${randomString}-${baseName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Enable gzip compression
app.use(compression());

// Parse JSON bodies
app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '1y',
  etag: true,
}));

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1y', // Cache static assets for 1 year
  etag: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ========================================
// FILE UPLOAD ENDPOINTS
// ========================================

// Upload single file
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const folder = req.body.folder || '';
    const relativePath = folder 
      ? `/uploads/${folder}/${req.file.filename}`
      : `/uploads/${req.file.filename}`;
    
    // Return full URL with domain for accessibility from any environment
    const fullUrl = `${PRODUCTION_DOMAIN}${relativePath}`;

    console.log(`📁 File uploaded: ${req.file.originalname} -> ${fullUrl} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

    res.json({
      success: true,
      url: fullUrl,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message
    });
  }
});

// List files in a folder
app.get('/list-files', (req, res) => {
  try {
    const folder = req.query.folder || '';
    const folderPath = folder ? path.join(UPLOADS_DIR, folder) : UPLOADS_DIR;

    if (!fs.existsSync(folderPath)) {
      return res.json({
        success: true,
        files: []
      });
    }

    const files = fs.readdirSync(folderPath)
      .filter(file => !file.startsWith('.')) // Skip hidden files
      .map(file => {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) return null;

        const ext = path.extname(file).toLowerCase();
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.mp4': 'video/mp4',
          '.webm': 'video/webm',
          '.mov': 'video/quicktime',
          '.mp3': 'audio/mpeg',
          '.wav': 'audio/wav',
          '.pdf': 'application/pdf',
          '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };

        return {
          name: file,
          url: folder ? `/uploads/${folder}/${file}` : `/uploads/${file}`,
          size: stats.size,
          type: mimeTypes[ext] || 'application/octet-stream',
          createdAt: stats.birthtime.toISOString()
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list files',
      message: error.message
    });
  }
});

// Delete file
app.delete('/upload/:filename', (req, res) => {
  try {
    const folder = req.query.folder || '';
    const filename = req.params.filename;
    const filePath = folder 
      ? path.join(UPLOADS_DIR, folder, filename)
      : path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    fs.unlinkSync(filePath);
    console.log(`🗑️ File deleted: ${filePath}`);

    res.json({
      success: true,
      message: 'File deleted'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Delete failed',
      message: error.message
    });
  }
});

// ========================================
// SPA ROUTING
// ========================================

// Handle client-side routing (SPA)
// All routes should return index.html to let React Router handle routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  // Handle multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large',
        message: 'Maximum file size is 2GB'
      });
    }
  }

  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
});

// Start the server
app.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log('🚀 PureLife');
  console.log('='.repeat(60));
  console.log(`📍 Server running at: http://${HOST}:${PORT}`);
  console.log(`🌐 Host: s108.cyber-folks.pl (${process.env.SERVER_IP || '195.78.66.103'})`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📁 Uploads directory: ${UPLOADS_DIR}`);
  console.log(`📅 Started at: ${new Date().toLocaleString('pl-PL')}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
