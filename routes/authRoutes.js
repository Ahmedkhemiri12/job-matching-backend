import express from 'express';
import { 
  register, 
  login, 
  getCurrentUser, 
  refreshToken,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshToken);
router.get('/me', requireAuth, getCurrentUser);

// Email verification routes
router.get('/verify/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;