// server/db/add-manual-application-fields.js
import db from './database.js';

const addFields = async () => {
  try {
    await db.schema.table('applications', (table) => {
      table.string('experience');
      table.text('experience_details');
      table.text('why_good_fit');
      table.json('links');
    });
    console.log('Added manual application fields!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

addFields();