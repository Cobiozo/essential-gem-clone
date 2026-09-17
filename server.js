/**
 * Production Node.js server for Mobilne-3D Platform
 * Deployed on Cyberfolks.pl (s108.cyber-folks.pl - 195.78.66.103)
 * 
 * Optimized for Phusion Passenger on cPanel shared hosting.
 * 
 * This server serves the built static files from the 'dist' directory
 * and handles client-side routing for the Single Page Application (SPA).
 * 
 * Usage:
 * 1. Build the application: npm run build
 * 2. Install dependencies: npm install express compression multer cors
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
import cors from 'cors';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ========================================
// SERVER CONFIGURATION
// ========================================

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
// Martwe domeny, które nie istnieją już w DNS — nigdy nie wolno budować z nich URL-i plików.
const DEAD_MEDIA_HOSTS = ['purelife.info.pl', 'www.purelife.info.pl'];
const CANONICAL_MEDIA_ORIGIN = 'https://purelifecenter.pl';

function sanitizeMediaOrigin(value) {
  if (!value) return CANONICAL_MEDIA_ORIGIN;
  try {
    const parsed = new URL(value);
    if (DEAD_MEDIA_HOSTS.includes(parsed.hostname.toLowerCase())) return CANONICAL_MEDIA_ORIGIN;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return CANONICAL_MEDIA_ORIGIN;
  }
}

const PRODUCTION_DOMAIN = sanitizeMediaOrigin(process.env.PRODUCTION_DOMAIN);

// Shutdown state for graceful termination
let isShuttingDown = false;
const activeConnections = new Set();

// ========================================
// MAINTENANCE MODE — AUTO-DETECTION
// ========================================

let isMaintenanceMode = false;
let lastDistSnapshot = { totalSize: 0, mtimeMax: 0 };
let stableCount = 0; // consecutive identical readings
const MAINTENANCE_HTML = path.join(__dirname, 'maintenance.html');
const DIST_DIR = path.join(__dirname, 'dist');
const DIST_ASSETS_DIR = path.join(__dirname, 'dist', 'assets');

function getDistSnapshot() {
  try {
    const indexExists = fs.existsSync(path.join(DIST_DIR, 'index.html'));
    if (!indexExists) {
      return { totalSize: -1, mtimeMax: 0, missing: true };
    }

    if (!fs.existsSync(DIST_ASSETS_DIR)) {
      return { totalSize: 0, mtimeMax: 0, missing: false };
    }

    let totalSize = 0;
    let mtimeMax = 0;

    const files = fs.readdirSync(DIST_ASSETS_DIR);
    for (const file of files) {
      try {
        const stat = fs.statSync(path.join(DIST_ASSETS_DIR, file));
        if (stat.isFile()) {
          totalSize += stat.size;
          const mt = stat.mtimeMs;
          if (mt > mtimeMax) mtimeMax = mt;
        }
      } catch {
        // file disappeared mid-scan — still copying
        return { totalSize: -1, mtimeMax: 0, missing: true };
      }
    }

    return { totalSize, mtimeMax, missing: false };
  } catch {
    return { totalSize: -1, mtimeMax: 0, missing: true };
  }
}

function checkDistStability() {
  const current = getDistSnapshot();

  if (current.missing) {
    if (!isMaintenanceMode) {
      isMaintenanceMode = true;
      stableCount = 0;
      console.log(`🔧 [Maintenance] ON — dist/index.html missing or unreadable`);
    }
    lastDistSnapshot = current;
    return;
  }

  const changed = current.totalSize !== lastDistSnapshot.totalSize ||
                  current.mtimeMax !== lastDistSnapshot.mtimeMax;

  if (changed) {
    if (!isMaintenanceMode) {
      console.log(`🔧 [Maintenance] ON — dist/ files changed (size: ${lastDistSnapshot.totalSize} → ${current.totalSize})`);
    }
    isMaintenanceMode = true;
    stableCount = 0;
    lastDistSnapshot = current;
  } else {
    stableCount++;
    if (isMaintenanceMode && stableCount >= 2) {
      isMaintenanceMode = false;
      stableCount = 0;
      console.log(`✅ [Maintenance] OFF — dist/ stable (size: ${current.totalSize}, 2 consecutive checks OK)`);
    }
  }
}

// Take initial snapshot (don't trigger maintenance on server start)
lastDistSnapshot = getDistSnapshot();
stableCount = 2; // treat startup as stable

// Check every 3 seconds
setInterval(checkDistStability, 3000);

// Upload configuration
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const UPLOADS_TMP_DIR = path.join(__dirname, '.upload-tmp');
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

// Ensure upload directories exist
for (const dir of [UPLOADS_DIR, UPLOADS_TMP_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function resolveTrainingMediaPath(filename) {
  const safeFilename = path.basename(filename);
  const targetPath = path.join(UPLOADS_DIR, 'training-media', safeFilename);
  if (fs.existsSync(targetPath)) return targetPath;

  // Backward compatibility for uploads saved before folder handling was fixed.
  const legacyRootPath = path.join(UPLOADS_DIR, safeFilename);
  if (!fs.existsSync(legacyRootPath)) return targetPath;

  try {
    ensureDir(path.dirname(targetPath));
    fs.renameSync(legacyRootPath, targetPath);
    console.log(`♻️ Recovered legacy upload path: ${legacyRootPath} -> ${targetPath}`);
    return targetPath;
  } catch (error) {
    console.warn('Could not move legacy upload into training-media, serving from legacy path:', error.message);
    return legacyRootPath;
  }
}

function moveUploadedFile(sourcePath, targetPath) {
  ensureDir(path.dirname(targetPath));
  try {
    fs.renameSync(sourcePath, targetPath);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;
    fs.copyFileSync(sourcePath, targetPath);
    fs.unlinkSync(sourcePath);
  }
}

const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.mov', '.webm', '.avi', '.mkv', '.wmv', '.flv']);

function isVideoUpload(filePath, mimetype = '') {
  return mimetype.toLowerCase().startsWith('video/') || VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function hasBinary(bin) {
  const r = spawnSync(bin, ['-version'], { encoding: 'utf8' });
  return !r.error && r.status === 0;
}

const FFPROBE_AVAILABLE = hasBinary('ffprobe');
const FFMPEG_AVAILABLE = hasBinary('ffmpeg');
// Awaryjny wyłącznik: pozwala opublikować plik bez weryfikacji technicznej (domyślnie WYŁĄCZONY).
const ALLOW_UNVERIFIED_VIDEO = process.env.ALLOW_UNVERIFIED_VIDEO === '1';

/**
 * Czy `moov` (indeks pliku) jest przed `mdat` — warunek progresywnego odtwarzania
 * (faststart). Czytamy wyłącznie nagłówki boxów, nie cały plik.
 */
function hasFaststart(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const total = fs.fstatSync(fd).size;
    const header = Buffer.alloc(16);
    let offset = 0;
    for (let i = 0; i < 64 && offset + 8 < total; i++) {
      const read = fs.readSync(fd, header, 0, 16, offset);
      if (read < 8) break;
      let size = header.readUInt32BE(0);
      const type = header.toString('latin1', 4, 8);
      if (size === 1) {
        if (read < 16) break;
        size = Number(header.readBigUInt64BE(8));
      } else if (size === 0) {
        size = total - offset;
      }
      if (type === 'moov') return true;
      if (type === 'mdat') return false;
      if (size < 8) break;
      offset += size;
    }
    return false;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch {} }
  }
}

function inspectVideo(filePath) {
  if (!FFPROBE_AVAILABLE) {
    return { available: false, error: 'ffprobe not installed on this server' };
  }

  const probe = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=codec_type,codec_name,profile,pix_fmt,codec_tag_string:format=format_name',
    '-of', 'json',
    filePath,
  ], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });

  if (probe.error || probe.status !== 0) {
    return { available: false, error: probe.error?.message || probe.stderr || 'ffprobe failed' };
  }

  try {
    const parsed = JSON.parse(probe.stdout || '{}');
    const streams = parsed.streams || [];
    const stream = streams.find((s) => s.codec_type === 'video') || {};
    const audio = streams.find((s) => s.codec_type === 'audio') || null;
    const formatName = String(parsed.format?.format_name || '').toLowerCase();
    return {
      available: true,
      stream,
      audio,
      formatName,
      faststart: hasFaststart(filePath),
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

/** Jedyny akceptowany standard: MP4 + H.264 + yuv420p + AAC (audio opcjonalne). */
function isIphoneSafeVideo(stream, audio, formatName, ext) {
  const codec = String(stream.codec_name || '').toLowerCase();
  const pixFmt = String(stream.pix_fmt || '').toLowerCase();
  const audioCodec = audio ? String(audio.codec_name || '').toLowerCase() : null;
  const containerOk = ext === '.mp4' && (!formatName || formatName.includes('mp4'));
  return (
    containerOk &&
    codec === 'h264' &&
    (!pixFmt || pixFmt === 'yuv420p') &&
    (audioCodec === null || audioCodec === 'aac')
  );
}

/** Remux bez re-enkodowania: przenosi `moov` na początek pliku. */
function remuxFaststart(inputPath) {
  const parsed = path.parse(inputPath);
  const outputPath = path.join(parsed.dir, `${parsed.name}-fs.mp4`);
  const result = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', inputPath,
    '-c', 'copy',
    '-movflags', '+faststart',
    outputPath,
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

  if (result.error || result.status !== 0 || !fs.existsSync(outputPath)) {
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    return { success: false, error: result.error?.message || result.stderr || 'ffmpeg remux failed' };
  }
  return { success: true, outputPath };
}

function transcodeToIphoneSafeMp4(inputPath) {
  const parsed = path.parse(inputPath);
  const outputPath = path.join(parsed.dir, `${parsed.name}-ios-h264.mp4`);
  const result = spawnSync('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel', 'error',
    '-i', inputPath,
    '-map', '0:v:0',
    '-map', '0:a:0?',
    '-c:v', 'libx264',
    '-profile:v', 'baseline',
    '-level', '3.1',
    '-pix_fmt', 'yuv420p',
    '-preset', 'veryfast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    outputPath,
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

  if (result.error || result.status !== 0 || !fs.existsSync(outputPath)) {
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    return { success: false, error: result.error?.message || result.stderr || 'ffmpeg failed' };
  }

  return { success: true, outputPath };
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Do not rely on req.body.folder here: multipart field order is not guaranteed.
    // Save to a private temp directory first, then move after multer parsed all fields.
    ensureDir(UPLOADS_TMP_DIR);
    cb(null, UPLOADS_TMP_DIR);
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

// Dozwolone typy MIME
const allowedMimes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/flac',
  'application/pdf', 'application/msword', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Niedozwolony typ pliku: ${file.mimetype}`));
    }
  }
});

// ========================================
// MIDDLEWARE SETUP
// ========================================

// Enable gzip compression
app.use(compression());

// CORS configuration for video streaming
app.use(cors({
  origin: [
    'https://purelifecenter.pl',
    'https://purelife.lovable.app',
    /\.lovable\.app$/,
    'http://localhost:8080',
    'http://localhost:5173'
  ],
  methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'DELETE'],
  allowedHeaders: ['Range', 'Content-Type', 'x-upload-key', 'Authorization'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  credentials: false
}));

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

// Shutdown-aware middleware - reject new requests during shutdown
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.setHeader('Connection', 'close');
    return res.status(503).json({
      error: 'Server is shutting down',
      retryAfter: 5
    });
  }
  next();
});

// Passenger/shared hosting: prefer short connections
app.use((req, res, next) => {
  if (process.env.PASSENGER_APP_ENV || process.env.SHARED_HOSTING) {
    res.setHeader('Connection', 'close');
  }
  next();
});

// Maintenance mode middleware — serve static page during deploys
app.use((req, res, next) => {
  if (!isMaintenanceMode) return next();

  // Allow API/health endpoints through
  const bypassPaths = ['/health', '/upload', '/list-files', '/api/'];
  if (bypassPaths.some(p => req.path.startsWith(p))) return next();

  res.status(503);
  res.setHeader('Retry-After', '5');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(MAINTENANCE_HTML);
});

// ========================================
// ROUTES
// ========================================

// Dedicated video streaming handler for training media
app.get('/uploads/training-media/:filename', (req, res) => {
  const filePath = resolveTrainingMediaPath(req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const ext = path.extname(filePath).toLowerCase();
  
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.mov': 'video/mp4',  // Serve MOV as MP4 for browser compatibility
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg'
  };
  
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  // Handle Range Requests for proper video streaming
  const range = req.headers.range;
  
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    
    console.log(`📹 Streaming ${req.params.filename}: bytes ${start}-${end}/${fileSize}`);
    
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000'
    });
    
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000'
    });
    
    fs.createReadStream(filePath).pipe(res);
  }
});

// Serve uploaded files (other than training-media which has dedicated handler)
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '1y',
  etag: true,
}));

// Serve static files from the 'dist' directory with smart caching
app.use(express.static(path.join(__dirname, 'dist'), {
  etag: true,
  setHeaders: (res, filePath) => {
    // HTML files should NEVER be cached - always check for new version
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } 
    // JS/CSS files with hash in filename can be cached forever (Vite adds hash)
    else if (filePath.match(/\.[a-f0-9]{8,}\.(js|css)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Other assets (images, fonts without hash) - cache for 1 day
    else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Health check endpoint with connection tracking info
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeConnections: activeConnections.size,
    pid: process.pid,
    isShuttingDown,
    media: {
      origin: PRODUCTION_DOMAIN,
      ffprobe: FFPROBE_AVAILABLE,
      ffmpeg: FFMPEG_AVAILABLE,
      allowUnverifiedVideo: ALLOW_UNVERIFIED_VIDEO,
    },
  });
});

// ========================================
// FILE UPLOAD ENDPOINTS
// ========================================

// Middleware autoryzacji uploadu
const UPLOAD_API_KEY = process.env.UPLOAD_API_KEY || '';

const requireUploadAuth = (req, res, next) => {
  // Jeśli klucz API jest skonfigurowany, wymagaj go
  if (UPLOAD_API_KEY) {
    const providedKey = req.headers['x-upload-key'];
    if (providedKey !== UPLOAD_API_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or missing upload key'
      });
    }
  }
  next();
};

// Upload single file
app.post('/upload', requireUploadAuth, (req, res, next) => {
  // Zwiększ timeout dla uploadu dużych plików
  req.setTimeout(30 * 60 * 1000); // 30 minut
  res.setTimeout(30 * 60 * 1000);
  next();
}, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Walidacja folderu: tylko alfanumeryczne, myślniki, podkreślenia
    const rawFolder = (req.body.folder || '').toString();
    if (rawFolder && !/^[a-zA-Z0-9_\-]+$/.test(rawFolder)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({
        success: false,
        error: 'Invalid folder name'
      });
    }
    const folder = rawFolder;

    let finalFilePath = folder
      ? path.join(UPLOADS_DIR, folder, req.file.filename)
      : path.join(UPLOADS_DIR, req.file.filename);

    try {
      moveUploadedFile(req.file.path, finalFilePath);
      req.file.path = finalFilePath;
      req.file.destination = path.dirname(finalFilePath);
    } catch (moveError) {
      console.error('❌ Upload move failed:', req.file.path, '->', finalFilePath, moveError);
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(500).json({
        success: false,
        error: 'Upload save failed',
        message: 'File was received by multer but could not be moved to the final uploads folder'
      });
    }

    // POST-WRITE VERIFICATION: plik musi istnieć i mieć poprawny rozmiar
    let onDiskSize = 0;
    try {
      const st = fs.statSync(req.file.path);
      onDiskSize = st.size;
    } catch (e) {
      console.error('❌ Upload verify failed (stat):', req.file.path, e);
      return res.status(500).json({
        success: false,
        error: 'File was not saved on disk',
        message: 'multer reported success but file is missing on disk (check disk space / permissions)'
      });
    }
    if (onDiskSize === 0 || onDiskSize !== req.file.size) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(500).json({
        success: false,
        error: 'File size mismatch',
        message: `Disk size ${onDiskSize} != uploaded size ${req.file.size}`
      });
    }

    if (isVideoUpload(req.file.path, req.file.mimetype)) {
      const videoInfo = inspectVideo(req.file.path);
      const ext = path.extname(req.file.path).toLowerCase();
      const stream = videoInfo.stream || {};

      // Bez ffprobe nie da się stwierdzić, co naprawdę jest w pliku — nie publikujemy go.
      if (!videoInfo.available && !ALLOW_UNVERIFIED_VIDEO) {
        console.error('❌ Video verification unavailable:', videoInfo.error);
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(422).json({
          success: false,
          error: 'Video verification unavailable',
          message: 'Nie można zweryfikować pliku wideo na serwerze (brak ffprobe). Film nie został opublikowany.',
        });
      }

      const safe = videoInfo.available && isIphoneSafeVideo(stream, videoInfo.audio, videoInfo.formatName, ext);
      const needsTranscode = videoInfo.available && !safe;
      const needsRemux = videoInfo.available && safe && !videoInfo.faststart;

      if ((needsTranscode || needsRemux) && !FFMPEG_AVAILABLE) {
        console.error('❌ ffmpeg missing — cannot normalize uploaded video');
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(422).json({
          success: false,
          error: 'Video conversion unavailable',
          message: 'Film nie może zostać opublikowany. Wymagany format: MP4 / H.264 / AAC / yuv420p / faststart. Serwer nie ma narzędzia do konwersji (ffmpeg).',
        });
      }

      if (needsTranscode || needsRemux) {
        const mode = needsRemux ? 'remux (+faststart)' : 'transcode';
        console.log(`🎬 Video ${mode}: ${req.file.filename} (${stream.codec_name || 'unknown'} / ${stream.pix_fmt || 'unknown'} / audio ${videoInfo.audio?.codec_name || 'none'} / faststart ${videoInfo.faststart})`);
        const converted = needsRemux ? remuxFaststart(req.file.path) : transcodeToIphoneSafeMp4(req.file.path);

        if (!converted.success) {
          console.error('❌ Video conversion failed:', converted.error);
          try { fs.unlinkSync(req.file.path); } catch {}
          const codec = String(stream.codec_name || '').toLowerCase();
          const hint = ['hevc', 'vp9', 'av1', 'vp8'].includes(codec)
            ? ` Wykryto ${codec.toUpperCase()} — przekonwertuj materiał do H.264.`
            : '';
          return res.status(422).json({
            success: false,
            error: 'Video conversion failed',
            message: `Film nie może zostać opublikowany. Wymagany format: MP4 / H.264 / AAC / yuv420p / faststart.${hint}`,
          });
        }

        try { fs.unlinkSync(req.file.path); } catch {}
        req.file.path = converted.outputPath;
        req.file.filename = path.basename(converted.outputPath);
        req.file.mimetype = 'video/mp4';
        finalFilePath = converted.outputPath;
        onDiskSize = fs.statSync(converted.outputPath).size;

        // Kontrola po konwersji — publikujemy tylko plik, który faktycznie spełnia standard.
        const after = inspectVideo(finalFilePath);
        const afterOk = after.available
          ? isIphoneSafeVideo(after.stream || {}, after.audio, after.formatName, '.mp4') && after.faststart
          : ALLOW_UNVERIFIED_VIDEO;
        if (!afterOk) {
          console.error('❌ Converted file still does not meet the standard:', after.error || 'faststart/codec check failed');
          try { fs.unlinkSync(finalFilePath); } catch {}
          return res.status(422).json({
            success: false,
            error: 'Video still invalid after conversion',
            message: 'Film nie może zostać opublikowany. Po konwersji plik nadal nie spełnia standardu MP4 / H.264 / AAC / yuv420p / faststart.',
          });
        }
        console.log(`✅ Video published as iPhone-safe MP4: ${req.file.filename} (${(onDiskSize / 1024 / 1024).toFixed(2)} MB)`);
      } else if (!videoInfo.available) {
        console.warn('⚠️ ALLOW_UNVERIFIED_VIDEO=1 — publishing unverified video:', videoInfo.error);
      }
    }

    const relativePath = folder
      ? `/uploads/${folder}/${req.file.filename}`
      : `/uploads/${req.file.filename}`;

    // Return full URL with domain for accessibility from any environment
    const fullUrl = `${PRODUCTION_DOMAIN}${relativePath}`;

    console.log(`📁 File uploaded: ${req.file.originalname} -> ${fullUrl} (${(onDiskSize / 1024 / 1024).toFixed(2)} MB, verified on disk)`);

    res.json({
      success: true,
      url: fullUrl,
      publicUrl: fullUrl,
      relativePath,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: onDiskSize,
      fileSize: onDiskSize,
      mimeType: req.file.mimetype,
      fileType: req.file.mimetype,
      verified: true
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
app.get('/list-files', requireUploadAuth, (req, res) => {
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
          url: folder 
            ? `${PRODUCTION_DOMAIN}/uploads/${folder}/${file}` 
            : `${PRODUCTION_DOMAIN}/uploads/${file}`,
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
app.delete('/upload/:filename', requireUploadAuth, (req, res) => {
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
// PWA DIAGNOSTICS & MANIFEST
// ========================================

// Diagnostic endpoint for PWA status
app.get('/api/pwa-status', (req, res) => {
  const distPath = path.join(__dirname, 'dist');
  const publicPath = path.join(__dirname, 'public');
  
  res.json({
    serverVersion: '1.3.0',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    distFiles: {
      swPush: fs.existsSync(path.join(distPath, 'sw-push.js')),
      manifest: fs.existsSync(path.join(distPath, 'manifest.json')),
      pwa192: fs.existsSync(path.join(distPath, 'pwa-192.png')),
      pwa512: fs.existsSync(path.join(distPath, 'pwa-512.png')),
    },
    publicFiles: {
      swPush: fs.existsSync(path.join(publicPath, 'sw-push.js')),
      manifest: fs.existsSync(path.join(publicPath, 'manifest.json')),
      pwa192: fs.existsSync(path.join(publicPath, 'pwa-192.png')),
      pwa512: fs.existsSync(path.join(publicPath, 'pwa-512.png')),
    }
  });
});

// Manifest with correct MIME type
app.get('/manifest.json', (req, res) => {
  const manifestPath = path.join(__dirname, 'dist', 'manifest.json');
  
  if (fs.existsSync(manifestPath)) {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(manifestPath);
  } else {
    const publicPath = path.join(__dirname, 'public', 'manifest.json');
    if (fs.existsSync(publicPath)) {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(publicPath);
    } else {
      console.error('[PWA] Manifest not found in dist/ or public/');
      res.status(404).send('Manifest not found');
    }
  }
});

// ========================================
// SERVICE WORKER ROUTING
// ========================================

// Service Worker - must be served with correct MIME type before SPA fallback
app.get('/sw-push.js', (req, res) => {
  const swPath = path.join(__dirname, 'dist', 'sw-push.js');
  
  if (fs.existsSync(swPath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(swPath);
  } else {
    // Fallback to public folder (dev mode)
    const publicSwPath = path.join(__dirname, 'public', 'sw-push.js');
    if (fs.existsSync(publicSwPath)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(publicSwPath);
    } else {
      console.error('[SW] Service Worker not found in dist/ or public/');
      res.status(404).send('Service Worker not found');
    }
  }
});

// ========================================
// SPA ROUTING
// ========================================

// Handle client-side routing (SPA)
// All routes should return index.html to let React Router handle routing
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(503).sendFile(MAINTENANCE_HTML);
  }
  res.sendFile(indexPath);
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

// ========================================
// SERVER STARTUP WITH PROPER CONFIG
// ========================================

const server = app.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log('🚀 PureLife Server');
  console.log('='.repeat(60));
  console.log(`📍 Server running at: http://${HOST}:${PORT}`);
  console.log(`🌐 Host: s108.cyber-folks.pl (${process.env.SERVER_IP || '195.78.66.103'})`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📁 Uploads directory: ${UPLOADS_DIR}`);
  console.log(`🔧 PID: ${process.pid}`);
  console.log(`📅 Started at: ${new Date().toLocaleString('pl-PL')}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
});

// Timeouts - zwiększone dla dużych plików video
server.keepAliveTimeout = 65000;     // 65 seconds
server.headersTimeout = 70000;       // 70 seconds
server.timeout = 10 * 60 * 1000;     // 10 minut - duże pliki video

// Track active connections for graceful shutdown
server.on('connection', (socket) => {
  activeConnections.add(socket);
  socket.on('close', () => {
    activeConnections.delete(socket);
  });
});

// ========================================
// GRACEFUL SHUTDOWN
// ========================================

const gracefulShutdown = (signal) => {
  // Prevent multiple shutdown calls
  if (isShuttingDown) {
    console.log(`[Shutdown] Already in progress, ignoring ${signal}`);
    return;
  }
  isShuttingDown = true;
  
  console.log(`\n[Shutdown] ${signal} received`);
  console.log(`[Shutdown] Active connections: ${activeConnections.size}`);
  console.log(`[Shutdown] Closing server...`);
  
  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error('[Shutdown] Server close error:', err);
      process.exit(1);
    }
    console.log('[Shutdown] Server closed successfully');
    process.exit(0);
  });
  
  // Gracefully end existing connections (send FIN)
  activeConnections.forEach((socket) => {
    socket.end();
  });
  
  // Force exit after 10s if graceful shutdown doesn't complete
  // .unref() ensures this timer doesn't keep the process alive
  setTimeout(() => {
    console.warn('[Shutdown] Timeout - forcing exit');
    activeConnections.forEach((socket) => socket.destroy());
    process.exit(0);
  }, 10000).unref();
};

// Signal handlers - handle all common shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP')); // Passenger sends this on restart

// Error handlers
process.on('uncaughtException', (err) => {
  console.error('[Fatal] Uncaught exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[Fatal] Unhandled rejection:', reason);
  // Don't shutdown - just log (might be non-critical)
});
