import db from './db/database.js';

async function runMigration() {
  try {
    // Check if column already exists
    const hasColumn = await db.schema.hasColumn('jobs', 'created_by');
    
    if (!hasColumn) {
      await db.schema.alterTable('jobs', (table) => {
        table.integer('created_by').nullable();
      });
      console.log('Successfully added created_by column to jobs table');
    } else {
      console.log('Column created_by already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

runMigration();