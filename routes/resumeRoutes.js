import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import { parseResume, getTargetSkills } from '../controllers/resumeController.js';

const router = express.Router();

// Parse resume endpoint
router.post('/parse', upload.single('resume'), parseResume);

// Get target skills for gap analysis
router.get('/target-skills', getTargetSkills);

export default router;