import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  scheduleInterview,
  getRecruiterInterviews,
  getApplicantInterviews,
  updateInterviewStatus,
  getAvailableSlots
} from '../controllers/interviewController.js';

const router = express.Router();

// Schedule interview
router.post('/schedule', requireAuth, scheduleInterview);

// Get interviews
router.get('/recruiter', requireAuth, getRecruiterInterviews);
router.get('/applicant', requireAuth, getApplicantInterviews);

// Update interview status
router.patch('/:id/status', requireAuth, updateInterviewStatus);

// Get available time slots
router.get('/available-slots', requireAuth, getAvailableSlots);

export default router;