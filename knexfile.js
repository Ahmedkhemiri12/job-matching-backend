// server/knexfile.js
import 'dotenv/config';

const shared = {
  // ⬇️ these paths are now relative to server/ (where this file lives)
  migrations: { directory: './db/migrations' },
  seeds:      { directory: './db/seeds' },
};

export default {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL_DEV,
    pool: { min: 0, max: 5 },
    ...shared,
  },
  test: {
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    ...shared,
  },
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 2, max: 10 },
    ...shared,
  },
};
