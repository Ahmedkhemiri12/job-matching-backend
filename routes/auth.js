// routes/auth.js
import { Router } from 'express';
import {
  login,
  register,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  refreshToken,
} from '../controllers/authController.js';

const router = Router();

// Auth routes
router.post('/login', login);
router.post('/register', register);
router.get('/verify/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', getCurrentUser);
router.post('/refresh', refreshToken);

export default router;
