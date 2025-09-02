// server/db/migrations/20250902_init_skills.js
export async function up(knex) {
  // Extensions (safe to run; ignored on sqlite/test)
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`).catch(() => {});
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS unaccent;`).catch(() => {});
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`).catch(() => {});

  // skills table
  const hasSkills = await knex.schema.hasTable('skills');
  if (!hasSkills) {
    await knex.schema.createTable('skills', (t) => {
      t.bigIncrements('id').primary();
      t.text('name').notNullable().unique();
      t.text('category').notNullable();
      t.jsonb('aliases').notNullable().defaultTo(knex.raw(`'[]'::jsonb`));
      t.timestamps(true, true);
    });
  }

  // optional: alias/indices scaffolding (kept minimal for now)
}

export async function down(knex) {
  const hasSkills = await knex.schema.hasTable('skills');
  if (hasSkills) await knex.schema.dropTable('skills');
}
