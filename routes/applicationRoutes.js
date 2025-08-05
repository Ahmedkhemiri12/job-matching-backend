import express from 'express';
import { 
  submitManualApplication, 
  getApplications, 
  getApplication,
  downloadResume,
  updateApplicationStatus,
  getApplicationDetails
} from '../controllers/applicationController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Submit manual application
router.post('/manual', requireAuth, submitManualApplication);

// Get all applications (recruiters only)
router.get('/', requireAuth, getApplications);

// PUBLIC: For scheduling interview without login
router.get('/:id/details', getApplicationDetails); // <--- THIS IS THE KEY LINE

// PROTECTED: For dashboard etc
router.get('/:id', requireAuth, getApplicationDetails);

// Download resume
router.get('/:id/resume', requireAuth, downloadResume);

// Update application status
router.put('/:id/status', requireAuth, updateApplicationStatus);

export default router;
