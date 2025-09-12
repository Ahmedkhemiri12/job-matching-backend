const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  const table = 'users';
  const email = 'admin@demo.com';
  const plain = 'Admin123!';
  const hash = await bcrypt.hash(plain, 10);

  const hasPassword      = await knex.schema.hasColumn(table, 'password');
  const hasPasswordHash  = await knex.schema.hasColumn(table, 'password_hash');

  const payload = {
    name: 'Admin',
    email,
    role: 'admin',
    updated_at: knex.fn.now(),
  };
  if (hasPassword)      payload.password = hash;
  if (hasPasswordHash)  payload.password_hash = hash;

  const existing = await knex(table).where({ email }).first();
  if (existing) {
    await knex(table).where({ email }).update(payload);
  } else {
    await knex(table).insert({ ...payload, created_at: knex.fn.now() });
  }
};
