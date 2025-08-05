import knex from 'knex';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: join(__dirname, 'database.sqlite')
  },
  useNullAsDefault: true
});

export default db;