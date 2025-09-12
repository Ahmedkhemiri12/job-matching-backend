// server/db/migrations/001_create_users_table.js
exports.up = async (knex) => {
  const exists = await knex.schema.hasTable('users');
  if (exists) return; // table already there → mark migration as done

  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 255).notNullable();
    table.string('password', 255).notNullable();
    table.string('name', 255).notNullable();
    table.string('role', 255).notNullable();
    table.boolean('is_verified').defaultTo(false);
    table.string('verification_token', 255);
    table.string('reset_token', 255);
    table.timestamp('reset_token_expires', { useTz: true });
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('users');
};
