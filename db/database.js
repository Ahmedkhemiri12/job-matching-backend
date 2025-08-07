import knex from 'knex';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Different config for production vs development
const db = knex({
  client: process.env.NODE_ENV === 'production' ? 'postgresql' : 'sqlite3',
  connection: process.env.NODE_ENV === 'production' 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        filename: join(__dirname, 'database.sqlite')
      },
  useNullAsDefault: true,
  pool: {
    min: 2,
    max: 10
  }
});

export default db;