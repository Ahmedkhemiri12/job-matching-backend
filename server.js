// Add this after your imports in server.js
import dotenv from 'dotenv';
dotenv.config();

// Set NODE_ENV if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

console.log('🚀 Starting server in', process.env.NODE_ENV, 'mode');

const JWT_SECRET = process.env.JWT_SECRET;

console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Missing');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL ? '✅ Set' : '❌ Missing');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing in .env! Server shutting down.');
}

import app from './app.js';
import { runMigrations } from './db/migrations.js';
import { seedJobs } from './seeds/sampleJobs.js';
import db from './db/database.js';

const PORT = process.env.PORT || 5000;

const initializeDatabase = async () => {
  try {
    await runMigrations();
    
    // Check if we need to seed data
    const jobCount = await db('jobs').count('id as count').first();
    if (jobCount.count === 0) {
      await seedJobs();
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at /api (port ${PORT})`);
  });
});
