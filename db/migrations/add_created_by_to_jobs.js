export const up = async (knex) => {
  await knex.schema.alterTable('jobs', (table) => {
    table.integer('created_by').nullable();
  });
};

export const down = async (knex) => {
  await knex.schema.alterTable('jobs', (table) => {
    table.dropColumn('created_by');
  });
};