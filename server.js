import dotenv from 'dotenv';
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

console.log('JWT_SECRET:', process.env.JWT_SECRET);
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
