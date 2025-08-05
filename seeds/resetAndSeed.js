import db from '../db/database.js';
import { seedJobs } from './sampleJobs.js';

const resetAndSeed = async () => {
  try {
    // Clear existing data
    await db('applications').del();
    await db('jobs').del();
    
    // Re-seed with new data
    await seedJobs();
    
    console.log('Database reset and seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Reset error:', error);
    process.exit(1);
  }
};

resetAndSeed();