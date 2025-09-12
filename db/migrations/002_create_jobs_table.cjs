// server/db/migrations/002_create_jobs_table.cjs
exports.up = async (knex) => {
  const exists = await knex.schema.hasTable('jobs');
  if (exists) return;

  await knex.schema.createTable('jobs', (table) => {
    table.increments('id').primary();
    table.string('title', 255).notNullable();
    table.text('description');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('jobs');
};
