// server/db/seeds/001_seed_skills.cjs
// Goal: keep only canonical names; remove synonyms if they exist.

const CANONICAL = [
  { name: 'English', aliases: ['Englisch'] },
  { name: 'German', aliases: ['Deutsch'] },
  { name: 'React', aliases: ['ReactJS', 'React.js', 'reactjs'] },
  { name: 'Artificial Intelligence', aliases: ['AI', 'ai'] },
];

exports.seed = async function seed(knex) {
  // 1) Ensure canonical skills exist (safe to re-run)
  await knex('skills')
    .insert(CANONICAL.map((c) => ({ name: c.name })))
    .onConflict('name')
    .ignore();

  // 2) Remove any alias rows so only canonical names remain
  const aliases = CANONICAL.flatMap((c) => c.aliases);
  if (aliases.length) {
    await knex('skills').whereIn('name', aliases).del();
  }
};
