import 'dotenv/config';
import app from './app.js';
import { runMigrationsAndSeeds } from './db/runMigrations.js';

const PORT = process.env.PORT || 10000;

(async () => {
  await runMigrationsAndSeeds();
  app.listen(PORT, () => console.log(`API listening on :${PORT}`));
})();
