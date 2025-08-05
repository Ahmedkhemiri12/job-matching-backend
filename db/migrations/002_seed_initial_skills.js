export const up = async (knex) => {
  // Import the initial skill data
  const { initialSkillData } = await import('../../utils/skillDatabase.js');
  
  const skillsToInsert = [];
  for (const [category, skills] of Object.entries(initialSkillData)) {
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
  
  // Insert in batches to avoid conflicts
  try {
    await knex.batchInsert('skills', skillsToInsert, 50);
  } catch (error) {
    console.log('Some skills might already exist, continuing...');
  }
};

export const down = async (knex) => {
  // Remove all skills
  await knex('skills').del();
};