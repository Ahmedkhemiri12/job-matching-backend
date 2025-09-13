/**
 * Ensure users table has the auth fields used by register/login.
 * Safe to run on an existing table; only adds missing columns.
 */
export async function up(knex) {
  const tbl = 'users';
  const hasTable = await knex.schema.hasTable(tbl);

  if (!hasTable) {
    // create minimal users table if it doesn't exist at all
    await knex.schema.createTable(tbl, (t) => {
      t.increments('id').primary();
      t.string('name');
      t.string('email').notNullable();
      t.text('password'); // register writes here
      t.string('role').notNullable().defaultTo('applicant');
      t.boolean('email_verified').notNullable().defaultTo(false);
      t.string('verification_token');
      t.timestamp('verification_expires', { useTz: true });
      t.timestamps(true, true); // created_at, updated_at default now()
    });
    await knex.schema.raw('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)');
    return;
  }

  const need = async (col) => !(await knex.schema.hasColumn(tbl, col));

  // Add missing columns, nullable first if needed, then backfill, then tighten.
  if (await need('email_verified')) {
    await knex.schema.alterTable(tbl, (t) => {
      t.boolean('email_verified').defaultTo(false);
    });
    await knex(tbl).whereNull('email_verified').update({ email_verified: false });
    await knex.schema.raw('ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL');
  }

  if (await need('verification_token')) {
    await knex.schema.alterTable(tbl, (t) => t.string('verification_token'));
  }

  if (await need('verification_expires')) {
    await knex.schema.alterTable(tbl, (t) =>
      t.timestamp('verification_expires', { useTz: true })
    );
  }

  if (await need('role')) {
    await knex.schema.alterTable(tbl, (t) => t.string('role').defaultTo('applicant'));
    await knex(tbl).whereNull('role').update({ role: 'applicant' });
    await knex.schema.raw('ALTER TABLE users ALTER COLUMN role SET NOT NULL');
  }

  if (await need('password')) {
    await knex.schema.alterTable(tbl, (t) => t.text('password'));
    // (don’t force NOT NULL; seeds/login code tolerate alternative columns too)
  }

  if (await need('created_at')) {
    await knex.schema.alterTable(tbl, (t) => t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()));
  }
  if (await need('updated_at')) {
    await knex.schema.alterTable(tbl, (t) => t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()));
  }

  // Make sure email uniqueness exists (unique index is enough)
  await knex.schema.raw('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)');
}

export async function down(knex) {
  // Non-destructive down: only drop what we added if present
  const dropIf = async (col) => (await knex.schema.hasColumn('users', col)) &&
    knex.schema.alterTable('users', (t) => t.dropColumn(col));

  await knex.schema.raw('DROP INDEX IF EXISTS users_email_unique');

  await dropIf('verification_expires');
  await dropIf('verification_token');
  // keep core columns; dropping them could break existing data
  // await dropIf('email_verified');
  // await dropIf('role');
  // await dropIf('password');
  // await dropIf('created_at');
  // await dropIf('updated_at');
}
