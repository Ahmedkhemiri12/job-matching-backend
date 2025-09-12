// server/controllers/authController.js
import db from '../db/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService.js';

/* ------------------------------ Config / Guards ------------------------------ */

function isDbConfigured() {
  if (process.env.DATABASE_URL) return true;
  const keys = ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
  return keys.every(k => (process.env[k] || '').trim().length > 0);
}

const DB_OFFLINE =
  process.env.SKILLS_DB_OFFLINE === 'true' || !isDbConfigured();

const AUTH_OFFLINE_ALLOW = process.env.AUTH_OFFLINE_ALLOW === 'true';

// use a real secret in prod — falls back for safety to avoid throws
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/* ------------------------------ Validation utils ----------------------------- */

const validatePassword = (password = '') => {
  const errors = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain at least one special character');
  return errors;
};

const validateEmail = (email = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

/* --------------------------------- Register --------------------------------- */
// Register a new user (recruiter or applicant)
export const register = async (req, res) => {
  try {
    if (DB_OFFLINE) {
      return res.status(503).json({ success: false, message: 'Registration unavailable: database not configured.' });
    }

    const { email, password, role = 'applicant', name = '' } = req.body || {};
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required.' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    await db('users').insert({
      email,
      password_hash,
      name,
      role,
      email_verified: false,
      verification_token: verificationToken,
      verification_expires: verificationExpires,
      created_at: new Date(),
      updated_at: new Date()
    });

    const user = await db('users').where({ email }).first();
    if (!user) throw new Error('Could not load newly created user');

    try {
      await sendVerificationEmail(email, name, verificationToken);
      console.log('Verification email queued to:', email);
    } catch (mailErr) {
      console.error('Email send error:', mailErr?.stack || mailErr);
    }

    return res.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.'
    });
  } catch (error) {
    console.error('Register error:', error?.stack || error);
    return res.status(500).json({ success: false, message: 'Registration failed.' });
  }
};

/* -------------------------------- Verify Email ------------------------------- */
export const verifyEmail = async (req, res) => {
  try {
    if (DB_OFFLINE) {
      return res.status(503).json({ success: false, message: 'Verification unavailable: database not configured.' });
    }

    const { token } = req.params;
    if (!token) return res.status(400).json({ success: false, message: 'Verification token is required' });

    const user = await db('users')
      .where({ verification_token: token })
      .where('verification_expires', '>', new Date())
      .first();

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    await db('users')
      .where({ id: user.id })
      .update({
        email_verified: true,
        verification_token: null,
        verification_expires: null,
        updated_at: new Date()
      });

    try { await sendWelcomeEmail(user.email, user.name); }
    catch (emailError) { console.error('Failed to send welcome email:', emailError); }

    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ success: false, message: 'Verification failed.' });
  }
};

/* --------------------------- Resend verification ----------------------------- */
export const resendVerificationEmail = async (req, res) => {
  try {
    if (DB_OFFLINE) {
      return res.status(503).json({ success: false, message: 'Resend unavailable: database not configured.' });
    }

    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await db('users').where({ email }).first();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.email_verified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db('users')
      .where({ id: user.id })
      .update({
        verification_token: verificationToken,
        verification_expires: verificationExpires,
        updated_at: new Date()
      });

    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
      res.json({ success: true, message: 'Verification email sent! Please check your inbox.' });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      res.status(500).json({ success: false, message: 'Failed to send verification email. Please try again later.' });
    }
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ success: false, message: 'Failed to resend verification email.' });
  }
};

/* ---------------------------------- Login ----------------------------------- */
// Enhanced with email verification check; supports offline demo login.
export const login = async (req, res) => {
  try {
    const { email = '', password = '' } = req.body || {};

    // Offline/demo mode: skip DB and mint a demo token if allowed
    if (DB_OFFLINE && AUTH_OFFLINE_ALLOW) {
      const role = process.env.DEMO_ROLE || 'applicant'; // or 'recruiter'
      const user = {
        id: 'demo-' + Buffer.from(email).toString('hex').slice(0, 8),
        email,
        role,
        name: email.split('@')[0] || 'Demo User',
        email_verified: true
      };
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      return res.json({
        success: true,
        token: accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: true }
      });
    }

    // Normal path (DB)
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    const user = await db('users').where({ email }).first();
    if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ success: false, message: 'Invalid credentials.' });

    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        needsVerification: true,
        email: user.email
      });
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token: accessToken,
      refreshToken,
      user: {
        id: user.id, email: user.email, name: user.name, role: user.role,
        emailVerified: user.email_verified
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

/* -------------------------------- Refresh ----------------------------------- */
// In offline mode we disable refresh (ask user to re-login) to avoid stale claims.
export const refreshToken = async (req, res) => {
  try {
    if (DB_OFFLINE) {
      return res.status(503).json({ success: false, message: 'Refresh disabled in demo mode. Please log in again.' });
    }

    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const user = await db('users').where({ id: decoded.id }).first();
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ success: true, token: newAccessToken });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

/* ------------------------------- Current user -------------------------------- */
export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated.' });

    // If DB is available, return fresh user data; else return token claims
    if (!DB_OFFLINE) {
      const user = await db('users').where({ id: req.user.id }).first();
      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
      return res.json({
        success: true,
        user: {
          id: user.id, email: user.email, name: user.name,
          role: user.role, emailVerified: user.email_verified
        }
      });
    }

    // offline
    const { id, email, role, name } = req.user;
    return res.json({
      success: true,
      user: { id, email, name: name || 'Demo User', role, emailVerified: true }
    });
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ success: false, message: 'Failed to load user.' });
  }
};

/* ----------------------------- Forgot / Reset PW ----------------------------- */

export const forgotPassword = async (req, res) => {
  try {
    if (DB_OFFLINE) {
      // Don’t reveal if email exists; behave like success
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    }

    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db('users')
      .where({ id: user.id })
      .update({
        reset_token: resetToken,
        reset_expires: resetExpires,
        updated_at: new Date()
      });

    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      return res.status(500).json({ success: false, message: 'Failed to send reset email. Please try again.' });
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    if (DB_OFFLINE) {
      return res.status(503).json({ success: false, message: 'Password reset unavailable: database not configured.' });
    }

    const { token } = req.params;
    const { password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordErrors
      });
    }

    const user = await db('users')
      .where({ reset_token: token })
      .where('reset_expires', '>', new Date())
      .first();

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await db('users')
      .where({ id: user.id })
      .update({
        password_hash,
        reset_token: null,
        reset_expires: null,
        updated_at: new Date()
      });

    res.json({ success: true, message: 'Password reset successfully! You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Password reset failed.' });
  }
};
