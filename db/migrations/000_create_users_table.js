export const up = async (knex) => {
  return knex.schema.createTable('users', table => {
    table.increments('id');
    table.string('email').unique().notNullable();
    table.string('password').notNullable();
    table.string('name').notNullable();
    table.string('role').notNullable();
    table.boolean('is_verified').defaultTo(false);
    table.string('verification_token');
    table.string('reset_token');
    table.datetime('reset_token_expires');
    table.timestamps(true, true);
  });
};

export const down = async (knex) => {
  return knex.schema.dropTable('users');
};
