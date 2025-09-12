// server/db/database.js
import knex from 'knex';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Robust loader:
 * 1) If KNEXFILE_PATH is set, try that first.
 * 2) Probe common locations: ./knexfile.js, ./knexfile.cjs, ./server/knexfile.js, ./server/knexfile.cjs
 * 3) If none found, fall back to env-based inline config.
 */
async function loadKnexConfig() {
  const cwd = process.cwd();

  const candidates = [
    process.env.KNEXFILE_PATH && path.resolve(cwd, process.env.KNEXFILE_PATH),
    path.resolve(cwd, 'knexfile.js'),
    path.resolve(cwd, 'knexfile.cjs'),
    path.resolve(cwd, 'server', 'knexfile.js'),
    path.resolve(cwd, 'server', 'knexfile.cjs'),
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const mod = await import(pathToFileURL(p).href);
        const cfg = mod?.default ?? mod;
        if (cfg && typeof cfg === 'object') {
          console.log('DB DEBUG | loaded knexfile from:', p.replace(cwd + path.sep, ''));
          return cfg;
        }
      }
    } catch (e) {
      // try next candidate
    }
  }

  console.warn('DB WARN  | knexfile not found; using env-based fallback config');
  return {
    development: {
      client: 'pg',
      connection: process.env.DATABASE_URL_DEV,
      pool: { min: 0, max: 5 },
    },
    test: {
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    },
    production: {
      client: 'pg',
      connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      },
      pool: { min: 2, max: 10 },
    },
  };
}

const env = process.env.NODE_ENV || 'development';
const config = await loadKnexConfig();

// Support both shapes: a map of envs or a direct config object
const resolved = config[env] ?? config;
if (!resolved) {
  throw new Error(`Knex config missing for env "${env}".`);
}

const db = knex(resolved);

export default db;
