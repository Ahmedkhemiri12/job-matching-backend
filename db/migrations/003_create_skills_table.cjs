// server/db/migrations/003_create_skills_table.cjs
exports.up = async (knex) => {
  const exists = await knex.schema.hasTable('skills');
  if (exists) return; // already there → mark migration as done

  await knex.schema.createTable('skills', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable().unique();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('skills');
};
