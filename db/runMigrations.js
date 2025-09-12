import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export async function runMigrationsAndSeeds() {
  try {
    console.log('DB MIGRATE: starting…');
    await db.migrate.latest({ directory: path.join(__dirname, 'migrations') });
    console.log('DB MIGRATE: done');

    if (process.env.RUN_SEEDS_ON_BOOT === 'true') {
      console.log('DB SEED: running…');
      await db.seed.run({ directory: path.join(__dirname, 'seeds') });
      console.log('DB SEED: done');
    }
  } catch (err) {
    console.error('DB MIGRATE error:', err?.stack || err);
  }
}
