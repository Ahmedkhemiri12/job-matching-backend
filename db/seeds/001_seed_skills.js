// server/db/seeds/001_seed_skills.js
export async function seed(knex) {
  const rows = [
    // Languages
    { name: 'English', category: 'Languages', aliases: ['Englisch'] },
    { name: 'German',  category: 'Languages', aliases: ['Deutsch'] },

    // Tech
    { name: 'React', category: 'Frameworks', aliases: ['ReactJS', 'React.js', 'reactjs'] },
    { name: 'Artificial Intelligence', category: 'Other', aliases: ['AI', 'ai'] },
  ];

  for (const r of rows) {
    const existing = await knex('skills').whereRaw('LOWER(name)=LOWER(?)', [r.name]).first();
    if (existing) {
      await knex('skills')
        .where({ id: existing.id })
        .update({
          category: r.category,
          aliases: JSON.stringify(r.aliases || []),
          updated_at: knex.fn.now(),
        });
    } else {
      await knex('skills').insert({
        name: r.name,
        category: r.category,
        aliases: JSON.stringify(r.aliases || []),
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      });
    }
  }
}
