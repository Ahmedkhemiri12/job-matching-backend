const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  const table = 'users';
  const email = 'admin@demo.com';
  const plain = 'Admin123!';
  const hash = await bcrypt.hash(plain, 10);

  const [hasPassword, hasPasswordHash, hasHashedPassword, hasPass] = await Promise.all([
    knex.schema.hasColumn(table, 'password'),
    knex.schema.hasColumn(table, 'password_hash'),
    knex.schema.hasColumn(table, 'hashed_password'),
    knex.schema.hasColumn(table, 'pass'),
  ]);

  const payload = {
    name: 'Admin',
    email,
    role: 'admin',
    updated_at: knex.fn.now(),
  };
  if (hasPassword)       payload.password = hash;
  if (hasPasswordHash)   payload.password_hash = hash;
  if (hasHashedPassword) payload.hashed_password = hash;
  if (hasPass)           payload.pass = hash;

  const existing = await knex(table).where({ email }).first();
  if (existing) {
    await knex(table).where({ email }).update(payload);
  } else {
    await knex(table).insert({ ...payload, created_at: knex.fn.now() });
  }
};
