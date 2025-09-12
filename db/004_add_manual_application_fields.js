// server/db/migrations/004_add_manual_application_fields.js
export const up = async (knex) => {
  const hasTable = await knex.schema.hasTable('applications');
  if (!hasTable) return;

  const cols = await Promise.all([
    knex.schema.hasColumn('applications', 'experience'),
    knex.schema.hasColumn('applications', 'experience_details'),
    knex.schema.hasColumn('applications', 'why_good_fit'),
    knex.schema.hasColumn('applications', 'links'),
  ]);

  const [hasExp, hasExpDet, hasWhy, hasLinks] = cols;

  await knex.schema.table('applications', (t) => {
    if (!hasExp) t.string('experience');
    if (!hasExpDet) t.text('experience_details');
    if (!hasWhy) t.text('why_good_fit');

    // json vs jsonb depending on client
    const client = (knex.client && knex.client.config && knex.client.config.client) || '';
    const isPg = /pg|postgres/i.test(client);
    if (!hasLinks) {
      if (isPg) t.jsonb('links').notNullable().defaultTo(knex.raw(`'[]'::jsonb`));
      else t.json('links').notNullable().defaultTo('[]');
    }
  });
};

export const down = async (knex) => {
  const hasTable = await knex.schema.hasTable('applications');
  if (!hasTable) return;
  await knex.schema.table('applications', (t) => {
    t.dropColumn('experience');
    t.dropColumn('experience_details');
    t.dropColumn('why_good_fit');
    t.dropColumn('links');
  });
};
