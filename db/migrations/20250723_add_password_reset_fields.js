export const up = function(knex) {
  return knex.schema.table('users', table => {
    table.string('reset_token');
    table.timestamp('reset_expires');
  });
};
export const down = function(knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('reset_token');
    table.dropColumn('reset_expires');
  });
};