// server/routes/resumeRoutes.js
import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import { parseResume, getTargetSkills } from '../controllers/resumeController.js';

// 🔧 New imports for the smoke test route
import { normalizeSkills } from '../utils/skillDatabase.js';
import { computeMatch } from '../utils/matching.js';

const router = express.Router();

// Ensure Multer errors (type/size) return JSON instead of an empty 500
router.post('/parse', (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err) {
      // Nice messages for common Multer errors
      const status =
        err.code === 'LIMIT_FILE_SIZE' ? 413 :
        err.message?.includes('Invalid file type') ? 400 :
        400;

      return res.status(status).json({
        success: false,
        message: err.message || 'Upload failed',
      });
    }
    // No Multer error → go to controller
    parseResume(req, res, next);
  });
});

// Get target skills for gap analysis
router.get('/target-skills', getTargetSkills);

// 🧪 Smoke test to ensure prod/dev normalization + matching are in sync
router.get('/debug/match-smoke', async (_req, res) => {
  try {
    const candidate = await normalizeSkills(['Deutsch', 'Englisch']);
    const required  = await normalizeSkills(['react', 'english', 'german', 'ai']);
    const nice      = [];

    // computeMatch(required, nice, candidate) — new order
    const r = computeMatch(required, nice, candidate);
    console.log('MATCH DEBUG |', { candidate, required, r });

    // Expect roughly: score ≈ 40 (depending on canonicalization output)
    res.json(r);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
