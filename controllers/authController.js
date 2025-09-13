// server/controllers/authController.js
import db from '../db/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from '../services/emailService.js';

/* ------------------------------ Config / Guards ------------------------------ */

function isDbConfigured() {
  if (process.env.DATABASE_URL) return true;
  const keys = ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
  return keys.every((k) => (process.env[k] || '').trim().length > 0);
}

const DB_OFFLINE =
  process.env.SKILLS_DB_OFFLINE === 'true' || !isDbConfigured();

const AUTH_OFFLINE_ALLOW = process.env.AUTH_OFFLINE_ALLOW === 'true';

// use a real secret in prod — falls back for safety to avoid throws
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/* ------------------------------ Helpers / Utils ------------------------------ */

const normalizeEmail = (email = '') => String(email).toLowerCase().trim();

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

// Resolve which password column exists in the DB (cached)
let PASSWORD_COLUMN = null;
async function resolvePasswordColumn() {
  if (PASSWORD_COLUMN) return PASSWORD_COLUMN;
  const [hasPassword, hasPasswordHash, hasHashedPassword, hasPass] = await Promise.all([
    db.schema.hasColumn('users', 'password'),
    db.schema.hasColumn('users', 'password_hash'),
    db.schema.hasColumn('users', 'hashed_password'),
    db.schema.hasColumn('users', 'pass'),
  ]);
  PASSWORD_COLUMN =
    (hasPasswordHash && 'password_hash') ||
    (hasPassword && 'password') ||
    (hasHashedPassword && 'hashed_password') ||
    (hasPass && 'pass') ||
    'password_hash'; // sensible default
  return PASSWORD_COLUMN;
}

// Extract a stored hash from any known column
function pickStoredHash(user) {
  return (
    (typeof user.password === 'string' && user.password) ||
    (typeof user.password_hash === 'string' && user.password_hash) ||
    (typeof user.hashed_password === 'string' && user.hashed_password) ||
    (typeof user.pass === 'string' && user.pass) ||
    null
  );
}

/* --------------------------------- Register --------------------------------- */
// Register a new user (recruiter or applicant)
export const register = async (req, res) => {
  try {
    if (DB_OFFLINE) {
      return res
        .status(503)
        .json({ success: false, message: 'Registration unavailable: database not configured.' });
    }

    const { email, password, role = 'applicant', name = '' } = req.body || {};
    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ success: false, message: 'Email, password, and role are required.' });
    }
    if (!validateEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: 'Please provide a valid email address' });
    }

    const normEmail = normalizeEmail(email);

    // Reject if the email already exists (case-insensitive)
    const existing = await db('users').whereRaw('LOWER(email) = ?', [normEmail]).first();
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    const passCol = await resolvePasswordColumn();

    const payload = {
      email: normEmail,
      name,
      role,
      email_verified: false,
      verification_token: verificationToken,
      verification_expires: verificationExpires,
      created_at: new Date(),
      updated_at: new Date(),
    };
    payload[passCol] = passwordHash;

    // Cross-DB friendly insert (no .returning)
    await db('users').insert(payload);

    // Email sending is best-effort (don’t fail the whole request)
    try {
      await sendVerificationEmail(normEmail, name, verificationToken);
      console.log('Verification email queued to:', normEmail);
    } catch (mailErr) {
      console.error('Email send error:', mailErr?.stack || mailErr);
    }

    return res.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error) {
    // Handle Postgres unique violation gracefully (in case of race)
    if (error && error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }
    console.error('Register error:', error?.stack || error);
    return res.status(500).json({ success: false, message: 'Registration failed.' });
  }
};

/* -------------------------------- Verify Email ------------------------------- */
export const verifyEmail = async (req, res) => {
  try {
    if (DB_OFFLINE) {
      return res
        .status(503)
        .json({ success: false, message: 'Verification unavailable: database not configured.' });
    }

    const { token } = req.params;
    if (!token)
      return res.status(400).json({ success: false, message: 'Verification token is required' });

    const user = await db('users')
      .where({ verification_token: token })
      .where('verification_expires', '>', new Date())
      .first();

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expired verification token' });
    }

    await db('users')
      .where({ id: user.id })
      .update({
        email_verified: true,
        verification_token: null,
        verification_expires: null,
        updated_at: new Date(),
      });

    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

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
      return res
        .status(503)
        .json({ success: false, message: 'Resend unavailable: database not configured.' });
    }

    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const normEmail = normalizeEmail(email);

    const user = await db('users').whereRaw('LOWER(email) = ?', [normEmail]).first();
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
        updated_at: new Date(),
      });

    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
      res.json({ success: true, message: 'Verification email sent! Please check your inbox.' });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      res
        .status(500)
        .json({ success: false, message: 'Failed to send verification email. Please try again later.' });
    }
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ success: false, message: 'Failed to resend verification email.' });
  }
};

/* ---------------------------------- Login ----------------------------------- */
// Enhanced with email normalization; supports offline demo login if enabled.
export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normEmail = normalizeEmail(email);

    // Optional offline/demo mode (no DB): accept any credentials
    if (DB_OFFLINE && AUTH_OFFLINE_ALLOW) {
      return res.json({
        success: true,
        user: { id: 'offline', email: normEmail, name: 'Demo User', role: 'applicant' },
      });
    }

    const user = await db('users').whereRaw('LOWER(email) = ?', [normEmail]).first();
if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials.' });

// ✅ ADD THIS:
if (!user.email_verified) {
  return res
    .status(403)
    .json({ success: false, message: 'Please verify your email before logging in.' });
}

const hash = pickStoredHash(user);
    if (!hash) {
      console.error('AUTH: user has no stored password hash', {
        id: user.id,
        has_password: !!user.password,
        has_password_hash: !!user.password_hash,
        has_hashed_password: !!user.hashed_password,
        has_pass: !!user.pass,
      });
      return res.status(500).json({ success: false, message: 'Account has no password set.' });
    }

    const ok = await bcrypt.compare(password, hash); // (plain, hash)
    if (!ok) return res.status(400).json({ success: false, message: 'Invalid credentials.' });

    return res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

/* -------------------------------- Refresh ----------------------------------- */
// In offline mode we disable refresh (ask user to re-login) to avoid stale claims.
export const refreshToken = async (req, res) => {
  try {
    if (DB_OFFLINE) {
      return res
        .status(503)
        .json({ success: false, message: 'Refresh disabled in demo mode. Please log in again.' });
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
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.email_verified,
        },
      });
    }

    // offline
    const { id, email, role, name } = req.user;
    return res.json({
      success: true,
      user: { id, email, name: name || 'Demo User', role, emailVerified: true },
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
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    }

    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const normEmail = normalizeEmail(email);

    const user = await db('users').whereRaw('LOWER(email) = ?', [normEmail]).first();
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db('users')
      .where({ id: user.id })
      .update({
        reset_token: resetToken,
        reset_expires: resetExpires,
        updated_at: new Date(),
      });

    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      return res
        .status(500)
        .json({ success: false, message: 'Failed to send reset email. Please try again.' });
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    if (DB_OFFLINE) {
      return res
        .status(503)
        .json({ success: false, message: 'Password reset unavailable: database not configured.' });
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
        errors: passwordErrors,
      });
    }

    const user = await db('users')
      .where({ reset_token: token })
      .where('reset_expires', '>', new Date())
      .first();

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const passCol = await resolvePasswordColumn();

    const updatePayload = {
      [passCol]: passwordHash,
      reset_token: null,
      reset_expires: null,
      updated_at: new Date(),
    };

    await db('users').where({ id: user.id }).update(updatePayload);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Password reset failed.' });
  }
};
