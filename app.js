import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import resumeRoutes from './routes/resumeRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import authRoutes from './routes/authRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',      // Local development
    'http://localhost:3000',      // Alternative local port
    'https://*.vercel.app',       // Any Vercel deployment
    'https://*.netlify.app',      // Any Netlify deployment
    /https:\/\/.*\.vercel\.app$/,  // Regex for Vercel subdomains
    /https:\/\/.*\.netlify\.app$/ // Regex for Netlify subdomains
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/resume', resumeRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Resume Parser API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

export default app;