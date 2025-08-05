export const up = function(knex) {
  return knex.schema.table('users', table => {
    table.boolean('email_verified').defaultTo(false);
    table.string('verification_token');
    table.timestamp('verification_expires');
  });
};

export const down = function(knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('email_verified');
    table.dropColumn('verification_token');
    table.dropColumn('verification_expires');
  });
};