// server/db/migrations/003_create_skills_table.js
export const up = async (knex) => {
  await knex.schema.createTable('skills', (table) => {
    table.increments('id').primary();
    table.string('name').unique().notNullable();
    table.string('category').notNullable().defaultTo('General');

    const client = (knex.client && knex.client.config && knex.client.config.client) || '';
    const isPg = /pg|postgres/i.test(client);

    if (isPg) {
      table.jsonb('aliases').notNullable().defaultTo(knex.raw(`'[]'::jsonb`));
    } else {
      table.json('aliases').notNullable().defaultTo('[]');
    }

    table.timestamps(true, true);
  });

  // seed from skillDatabase (unchanged)
  const { skillDatabase } = await import('../../utils/skillDatabase.js');
  const skillsToInsert = [];
  for (const [category, skills] of Object.entries(skillDatabase)) {
    for (const skill of skills) {
      skillsToInsert.push({
        name: skill.name,
        category,
        aliases: JSON.stringify(skill.aliases || []),
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }
  if (skillsToInsert.length) await knex('skills').insert(skillsToInsert);
};

export const down = async (knex) => {
  await knex.schema.dropTable('skills');
};
