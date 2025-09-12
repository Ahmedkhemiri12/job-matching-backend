// server/db/seeds/001_seed_skills.js
export async function seed(knex) {
  const client = (knex.client && knex.client.config && knex.client.config.client) || '';
  const isPg = /pg|postgres/i.test(client);

  const rows = [
    // Languages
    { name: 'English', category: 'Languages', aliases: ['Englisch'] },
    { name: 'German',  category: 'Languages', aliases: ['Deutsch'] },

    // Tech
    { name: 'React', category: 'Frameworks', aliases: ['ReactJS', 'React.js', 'reactjs'] },
    { name: 'Artificial Intelligence', category: 'Other', aliases: ['AI', 'ai'] },
  ];

  for (const r of rows) {
    const existing = await knex('skills')
      .whereRaw('LOWER(name) = LOWER(?)', [r.name])
      .first();

    const aliasesValue = isPg
      ? knex.raw('?::jsonb', [JSON.stringify(r.aliases || [])])
      : JSON.stringify(r.aliases || []);

    if (existing) {
      await knex('skills')
        .where({ id: existing.id })
        .update({
          category: r.category,
          aliases: aliasesValue,
          updated_at: knex.fn.now(),
        });
    } else {
      await knex('skills').insert({
        name: r.name,
        category: r.category,
        aliases: aliasesValue,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      });
    }
  }
}
