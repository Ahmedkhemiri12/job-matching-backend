import express from 'express';
import { getJobs, getJobById, createJob, updateJob, deleteJob, getMyJobs } from '../controllers/jobController.js';
import { requireAuth, requireRecruiter } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getJobs);
router.get('/:id', getJobById);

// Protected routes for recruiters
router.get('/my-jobs', requireAuth, requireRecruiter, getMyJobs);
router.post('/', requireAuth, requireRecruiter, createJob);
router.put('/:id', requireAuth, requireRecruiter, updateJob);
router.delete('/:id', requireAuth, requireRecruiter, deleteJob);

export default router;