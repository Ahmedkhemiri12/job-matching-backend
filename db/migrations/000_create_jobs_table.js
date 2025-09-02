export const up = async (knex) => {
  return knex.schema.createTable('jobs', table => {
    table.increments('id');
    table.string('title').notNullable();
    table.string('company').notNullable();
    table.string('location').notNullable();
    table.text('description');
    table.integer('created_by').unsigned();
    table.foreign('created_by').references('users.id');
    table.timestamps(true, true);
  });
};

export const down = async (knex) => {
  return knex.schema.dropTable('jobs');
};
