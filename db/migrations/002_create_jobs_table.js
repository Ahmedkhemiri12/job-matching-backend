// server/db/migrations/002_create_jobs_table.js
export const up = async (knex) => {
  await knex.schema.createTable('jobs', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.string('company').notNullable();
    table.string('location').notNullable();
    table.text('description');
    table
      .integer('created_by')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

export const down = async (knex) => {
  await knex.schema.dropTable('jobs');
};
