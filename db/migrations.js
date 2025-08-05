import db from './database.js';

export const runMigrations = async () => {
  try {
    // Create users table (needed for foreign keys)
    const hasUsersTable = await db.schema.hasTable('users');
    if (!hasUsersTable) {
      await db.schema.createTable('users', table => {
        table.increments('id');
        table.string('email').unique().notNullable();
        table.string('password_hash');
        table.string('name');
        table.enum('role', ['applicant', 'recruiter']).defaultTo('applicant');
        table.boolean('email_verified').defaultTo(false);
        table.string('verification_token');
        table.timestamp('verification_expires');
    
    // Add password reset fields
        table.string('reset_token');
        table.timestamp('reset_expires');
        table.timestamps(true, true);
      });
      console.log('Created users table');
    }

    // Create jobs table
    const hasJobsTable = await db.schema.hasTable('jobs');
    if (!hasJobsTable) {
      await db.schema.createTable('jobs', table => {
        table.increments('id');
        table.string('title').notNullable();
        table.string('company').notNullable();
        table.text('description');
        table.json('required_skills').notNullable();
        table.json('nice_to_have_skills');
        table.boolean('is_active').defaultTo(true);
        table
          .integer('created_by')
          .unsigned()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE');
        table.timestamps(true, true);
      });
      console.log('Created jobs table');
    }

    // Create applications table
    const hasApplicationsTable = await db.schema.hasTable('applications');
    if (!hasApplicationsTable) {
      await db.schema.createTable('applications', table => {
        table.increments('id');
        table
          .integer('job_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('jobs')
          .onDelete('CASCADE');
        table
          .integer('applicant_id')
          .unsigned()
          .references('id')
          .inTable('users')
          .onDelete('SET NULL');
        table.string('applicant_name').notNullable();
        table.string('applicant_email').notNullable();
        table.string('file_name');              // Stores original filename
        table.string('file_path');              // Stores server file path
        table.integer('file_size');             // Stores file size in bytes
        table.json('parsed_skills');
        table.integer('match_percentage');
        table.enum('status', ['pending', 'reviewed', 'accepted', 'rejected'])
          .defaultTo('pending');
        table.text('notes');
        table.string('scheduling_token');       // For secure interview scheduling
        table.timestamps(true, true);
      });
      console.log('Created applications table');
    }

    // Create skills table
    const hasSkillsTable = await db.schema.hasTable('skills');
    if (!hasSkillsTable) {
      await db.schema.createTable('skills', table => {
        table.increments('id');
        table.string('name').unique().notNullable();
        table.string('category').defaultTo('General');
        table.json('aliases').defaultTo('[]');
        table.timestamps(true, true);
      });
      console.log('Created skills table');
    }

    // Create interviews table
    const hasInterviewsTable = await db.schema.hasTable('interviews');
    if (!hasInterviewsTable) {
      await db.schema.createTable('interviews', table => {
        table.increments('id');
        table
          .integer('application_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('applications')
          .onDelete('CASCADE');
        table
          .integer('recruiter_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('users');
        table
          .integer('applicant_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('users');
        table.date('interview_date').notNullable();
        table.string('interview_time').notNullable();
        table.integer('duration').defaultTo(60);
        table.string('location');
        table.string('meeting_link');
        table.text('notes');
        table.enum('status', ['scheduled', 'completed', 'cancelled', 'no_show'])
          .defaultTo('scheduled');
        table.timestamps(true, true);
      });
      console.log('Created interviews table');
    }

    console.log('Database migrations completed');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};