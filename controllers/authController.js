import db from '../db/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService.js';


const JWT_SECRET = process.env.JWT_SECRET;


// Add validation functions at the top
const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return errors;
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Register a new user (recruiter or applicant)
export const register = async (req, res) => {
  try {
    const { email, password, role = 'applicant', name = '' } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required.' });
    }

    // 1) Prevent duplicates
    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    // 2) Prepare values
    const password_hash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    // 3) Insert WITHOUT destructuring the return (works on SQLite + Postgres)
    await db('users').insert({
      email,
      password_hash,
      name,
      role, // 'recruiter' | 'applicant'
      email_verified: false,
      verification_token: verificationToken,
      verification_expires: verificationExpires,
      created_at: new Date(),
      updated_at: new Date()
    });

    // 4) Fetch the user we just created (avoids .insert() return shape issues)
    const user = await db('users').where({ email }).first();
    if (!user) {
      throw new Error('Could not load newly created user');
    }

    // 5) Send verification email (non-fatal: log but don’t kill registration)
    try {
  await sendVerificationEmail(email, name, verificationToken);  // <— use service
  console.log('Verification email queued to:', email);
} catch (mailErr) {
  console.error('Email send error:', mailErr?.stack || mailErr);
  // continue; don’t fail registration
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

// Verify email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }
    
    // Find user with this token
    const user = await db('users')
      .where({ verification_token: token })
      .where('verification_expires', '>', new Date())
      .first();
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification token' 
      });
    }
    
    // Update user as verified
    await db('users')
      .where({ id: user.id })
      .update({
        email_verified: true,
        verification_token: null,
        verification_expires: null,
        updated_at: new Date()
      });
    
    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }
    
    res.json({ 
      success: true, 
      message: 'Email verified successfully! You can now log in.' 
    });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ success: false, message: 'Verification failed.' });
  }
};

// Resend verification email
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    const user = await db('users').where({ email }).first();
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (user.email_verified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }
    
    // Generate new token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Update user with new token
    await db('users')
      .where({ id: user.id })
      .update({
        verification_token: verificationToken,
        verification_expires: verificationExpires,
        updated_at: new Date()
      });
    
    // Send email
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
      res.json({ 
        success: true, 
        message: 'Verification email sent! Please check your inbox.' 
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification email. Please try again later.' 
      });
    }
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ success: false, message: 'Failed to resend verification email.' });
  }
};

// Login - Enhanced with email verification check
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }
    
    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }
    
    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        needsVerification: true,
        email: user.email
      });
    }
    
    // Generate both tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '7d' } // Short-lived
    );
    
    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' }, 
      JWT_SECRET, 
      { expiresIn: '30d' } // Long-lived
    );
    
    res.json({ 
      success: true, 
      token: accessToken, // Keep as 'token' for backward compatibility
      refreshToken, // Add refresh token
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        emailVerified: user.email_verified
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

// Add refresh token endpoint
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }
    
    // Get user
    const user = await db('users').where({ id: decoded.id }).first();
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '15m' }
    );
    
    res.json({ 
      success: true, 
      token: newAccessToken 
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

// Get current user from JWT
export const getCurrentUser = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  
  // Get fresh user data from DB
  const user = await db('users').where({ id: req.user.id }).first();
  
  res.json({ 
    success: true, 
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.email_verified
    }
  });
};
export const forgotPassword = async (req, res) => {
  console.log("forgotPassword endpoint HIT!", req.body);

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await db('users').where({ email }).first();

    if (!user) {
      console.log("No user found with that email:", email);
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db('users')
      .where({ id: user.id })
      .update({
        reset_token: resetToken,
        reset_expires: resetExpires,
        updated_at: new Date()
      });

    // Send reset email
    try {
      console.log('Sending password reset email to:', user.email);
      await sendPasswordResetEmail(user.email, user.name, resetToken);
      console.log('Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again.'
      });
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

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and new password are required' 
      });
    }
    
    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password does not meet requirements',
        errors: passwordErrors 
      });
    }
    
    // Find user with valid token
    const user = await db('users')
      .where({ reset_token: token })
      .where('reset_expires', '>', new Date())
      .first();
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }
    
    // Hash new password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Update password and clear reset token
    await db('users')
      .where({ id: user.id })
      .update({
        password_hash,
        reset_token: null,
        reset_expires: null,
        updated_at: new Date()
      });
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully! You can now log in with your new password.' 
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Password reset failed.' });
  }
};
