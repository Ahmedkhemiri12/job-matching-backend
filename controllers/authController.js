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
    const { email, password, name, role } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required.' });
    }
    
    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }
    
    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password does not meet requirements',
        errors: passwordErrors 
      });
    }
    
    // Check if user exists
    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use.' });
    }
    
    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const password_hash = await bcrypt.hash(password, 10);
    const [id] = await db('users').insert({
      email,
      password_hash,
      name,
      role, // "recruiter" or "applicant"
      email_verified: false, // New field
      verification_token: verificationToken, // New field
      verification_expires: verificationExpires, // New field
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Send verification email
    try {
      await sendVerificationEmail(email, name, verificationToken);
      console.log('Verification email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails, but log it
    }
    
    // Issue JWT (but user still needs to verify email)
    const token = jwt.sign({ id, email, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      success: true, 
      token, 
      user: { id, email, name, role },
      message: 'Registration successful! Please check your email to verify your account.'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed.' });
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
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    const user = await db('users').where({ email }).first();
    
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, you will receive a password reset link.' 
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Save token to database
    await db('users')
      .where({ id: user.id })
      .update({
        reset_token: resetToken,
        reset_expires: resetExpires,
        updated_at: new Date()
      });
    
    // Send reset email
    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);
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