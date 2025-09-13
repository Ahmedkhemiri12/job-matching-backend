export async function up(knex) {
  const has = await knex.schema.hasColumn('jobs', 'is_active');
  if (!has) {
    await knex.schema.alterTable('jobs', (t) => {
      t.boolean('is_active').defaultTo(true);
    });
    await knex('jobs').whereNull('is_active').update({ is_active: true });
    await knex.schema.raw('ALTER TABLE jobs ALTER COLUMN is_active SET NOT NULL');
    await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs (is_active)');
  }
}
export async function down(knex) {
  const has = await knex.schema.hasColumn('jobs', 'is_active');
  if (has) {
    await knex.schema.raw('DROP INDEX IF EXISTS idx_jobs_is_active');
    await knex.schema.alterTable('jobs', (t) => {
      t.dropColumn('is_active');
    });
  }
}
