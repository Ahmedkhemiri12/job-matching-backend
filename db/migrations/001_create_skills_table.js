export const up = async (knex) => {
  await knex.schema.createTable('skills', (table) => {
    table.increments('id').primary();
    table.string('name').unique().notNullable();
    table.string('category').defaultTo('General');
    table.json('aliases').defaultTo('[]');
    table.timestamps(true, true);
  });

  // Import existing skills from skillDatabase
  const { skillDatabase } = await import('../../utils/skillDatabase.js');
  
  const skillsToInsert = [];
  for (const [category, skills] of Object.entries(skillDatabase)) {
    for (const skill of skills) {
      skillsToInsert.push({
        name: skill.name,
        category: category,
        aliases: JSON.stringify(skill.aliases || []),
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }
  
  await knex('skills').insert(skillsToInsert);
};

export const down = async (knex) => {
  await knex.schema.dropTable('skills');
};