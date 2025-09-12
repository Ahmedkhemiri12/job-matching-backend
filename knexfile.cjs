// server/knexfile.cjs
require('dotenv/config');

// The paths are now correct for running from inside the 'server' directory
const shared = {
  migrations: { directory: './db/migrations', loadExtensions: ['.cjs', '.js'] },
  seeds:      { directory: './db/seeds',      loadExtensions: ['.cjs', '.js'] },
};

module.exports = {
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