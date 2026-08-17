import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '../../data/uploads');

// ensure upload dir exists
async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureDir();
      cb(null, UPLOAD_DIR);
    } catch (e) {
      cb(e as any, UPLOAD_DIR);
    }
  },
  filename: (req, file, cb) => {
    // keep original name but prepend timestamp for uniqueness
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// single file upload endpoint
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'invalid_request', message: 'file is required' });
  // Return the public URL path for the uploaded file. The server serves /uploads statically.
  const urlPath = `/uploads/${req.file.filename}`;
  res.json({ url: urlPath, filename: req.file.filename });
});

export default router;
