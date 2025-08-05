import db from '../db/database.js';
import { addSkillsToDatabase } from '../services/skillExtractor.js';
import { normalizeSkills } from '../utils/skillDatabase.js'; // ADD THIS IMPORT

// Get all jobs
export const getJobs = async (req, res) => {
  try {
    const jobs = await db('jobs').where('is_active', true);

    // Parse JSON fields AND normalize skills
    const parsedJobs = await Promise.all(jobs.map(async (job) => ({
      ...job,
      required_skills: await normalizeSkills(JSON.parse(job.required_skills || '[]')),
      nice_to_have_skills: await normalizeSkills(JSON.parse(job.nice_to_have_skills || '[]'))
    })));

    res.json({ success: true, data: parsedJobs });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ success: false, message: 'Failed to get jobs' });
  }
};

export const getMyJobs = async (req, res) => {
  try {
    const jobs = await db('jobs')
      .where('created_by', req.user.id)
      .where('is_active', true);

    // Parse JSON fields AND normalize skills
    const parsedJobs = await Promise.all(jobs.map(async (job) => ({
      ...job,
      required_skills: await normalizeSkills(JSON.parse(job.required_skills || '[]')),
      nice_to_have_skills: await normalizeSkills(JSON.parse(job.nice_to_have_skills || '[]'))
    })));

    res.json({ success: true, data: parsedJobs });
  } catch (error) {
    console.error('Get my jobs error:', error);
    res.status(500).json({ success: false, message: 'Failed to get jobs' });
  }
};

// Get one job by ID
export const getJobById = async (req, res) => {
  const job = await db('jobs').where({ id: req.params.id }).first();
  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  // Parse JSON fields
  job.required_skills = JSON.parse(job.required_skills || '[]');
  job.nice_to_have_skills = JSON.parse(job.nice_to_have_skills || '[]');
  
  // Normalize skills before sending response
  if (job.required_skills && job.required_skills.length > 0) {
    job.required_skills = await normalizeSkills(job.required_skills);
  }
  if (job.nice_to_have_skills && job.nice_to_have_skills.length > 0) {
    job.nice_to_have_skills = await normalizeSkills(job.nice_to_have_skills);
  }
  
  res.json(job);
};

// Create job
export const createJob = async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ success: false, message: 'Only recruiters can create jobs.' });
    }
    let { title, company, description, requiredSkills, niceToHaveSkills } = req.body;

    // Determine job category based on title
    let category = 'General';
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('developer') || titleLower.includes('engineer') || titleLower.includes('programmer')) {
      category = 'IT & Technology';
    } else if (titleLower.includes('accountant') || titleLower.includes('finance') || titleLower.includes('banker')) {
      category = 'Finance & Accounting';
    } else if (titleLower.includes('marketing') || titleLower.includes('sales') || titleLower.includes('advertising')) {
      category = 'Marketing & Sales';
    } else if (titleLower.includes('nurse') || titleLower.includes('doctor') || titleLower.includes('medical')) {
      category = 'Healthcare';
    } else if (titleLower.includes('teacher') || titleLower.includes('professor') || titleLower.includes('educator')) {
      category = 'Education';
    } else if (titleLower.includes('designer') || titleLower.includes('artist') || titleLower.includes('creative')) {
      category = 'Design & Creative';
    }

    // Normalize skills before saving
    if (requiredSkills && requiredSkills.length > 0) {
      requiredSkills = await normalizeSkills(requiredSkills);
      await addSkillsToDatabase(requiredSkills, category);
    }
    if (niceToHaveSkills && niceToHaveSkills.length > 0) {
      niceToHaveSkills = await normalizeSkills(niceToHaveSkills);
      await addSkillsToDatabase(niceToHaveSkills, category);
    }

    const [id] = await db('jobs').insert({
      title,
      company,
      description,
      required_skills: JSON.stringify(requiredSkills || []),
      nice_to_have_skills: JSON.stringify(niceToHaveSkills || []),
      created_by: req.user.id,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    res.json({ success: true, id, message: 'Job created successfully' });
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ success: false, message: 'Failed to create job', error: err.message });
  }
};

// Update job
export const updateJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    let { title, company, description, requiredSkills, niceToHaveSkills } = req.body;

    const job = await db('jobs').where({ id: jobId }).first();
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    if (userRole !== 'recruiter' || job.created_by !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this job.' });
    }

    // Normalize skills before saving
    if (requiredSkills && requiredSkills.length > 0) {
      requiredSkills = await normalizeSkills(requiredSkills);
      await addSkillsToDatabase(requiredSkills);
    }
    if (niceToHaveSkills && niceToHaveSkills.length > 0) {
      niceToHaveSkills = await normalizeSkills(niceToHaveSkills);
      await addSkillsToDatabase(niceToHaveSkills);
    }

    await db('jobs').where({ id: jobId }).update({
      title,
      company,
      description,
      required_skills: JSON.stringify(requiredSkills || []),
      nice_to_have_skills: JSON.stringify(niceToHaveSkills || []),
      updated_at: new Date()
    });

    res.json({ success: true, message: 'Job updated successfully' });
  } catch (err) {
    console.error('Update job error:', err);
    res.status(500).json({ success: false, message: 'Failed to update job.', error: err.message });
  }
};

// Delete job
export const deleteJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const job = await db('jobs').where({ id: jobId }).first();
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    if (userRole !== 'recruiter' || job.created_by !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this job.' });
    }

    // Soft delete - just mark as inactive
    await db('jobs').where({ id: jobId }).update({ is_active: false });
    
    res.json({ success: true, message: 'Job deleted.' });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete job.', error: err.message });
  }
};