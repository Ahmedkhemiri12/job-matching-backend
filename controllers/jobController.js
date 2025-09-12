// server/controllers/jobController.js
import db from '../db/database.js';
import { addSkillsToDatabase } from '../services/skillExtractor.js';
import { normalizeSkills } from '../utils/skillDatabase.js';

// ---------- DB offline guard ----------
function isDbConfigured() {
  if (process.env.DATABASE_URL) return true;
  const keys = ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
  return keys.every(k => (process.env[k] || '').trim().length > 0);
}
const DB_OFFLINE =
  process.env.SKILLS_DB_OFFLINE === 'true' || !isDbConfigured();

// ---------- Helper: tolerant array parser (CSV or JSON) ----------
function toArrayFlexible(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    const s = value.trim();
    if (s.startsWith('[') && s.endsWith(']')) {
      try { return (JSON.parse(s) || []).filter(Boolean); } catch {}
    }
    return s.split(',').map(x => x.trim()).filter(Boolean);
  }
  if (value == null) return [];
  return [String(value).trim()].filter(Boolean);
}
const safeSkills = (value) => toArrayFlexible(value);

// ========== GET all active jobs ==========
export const getJobs = async (req, res) => {
  try {
    if (DB_OFFLINE) {
      // No DB? Return an empty list (or add demo items if you like)
      return res.json({ success: true, data: [] });
    }

    const rows = await db('jobs').where('is_active', true);
    const data = rows.map(job => ({
      ...job,
      required_skills: safeSkills(job.required_skills),
      nice_to_have_skills: safeSkills(job.nice_to_have_skills),
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get jobs error:', error?.stack || error);
    res.status(500).json({ success: false, message: 'Failed to fetch jobs' });
  }
};

// ========== GET my jobs ==========
export const getMyJobs = async (req, res) => {
  try {
    if (DB_OFFLINE) return res.json({ success: true, data: [] });

    const rows = await db('jobs').where({ created_by: req.user.id, is_active: true });
    const data = rows.map(job => ({
      ...job,
      required_skills: safeSkills(job.required_skills),
      nice_to_have_skills: safeSkills(job.nice_to_have_skills),
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get my jobs error:', error?.stack || error);
    res.status(500).json({ success: false, message: 'Failed to get jobs' });
  }
};

// ========== GET single job by id ==========
export const getJobById = async (req, res) => {
  try {
    if (DB_OFFLINE) return res.status(503).json({ success: false, message: 'Database unavailable' });

    const job = await db('jobs').where({ id: req.params.id }).first();
    if (!job) return res.status(404).json({ error: 'Job not found' });

    job.required_skills = safeSkills(job.required_skills);
    job.nice_to_have_skills = safeSkills(job.nice_to_have_skills);
    res.json(job);
  } catch (error) {
    console.error('Get job by id error:', error?.stack || error);
    res.status(500).json({ success: false, message: 'Failed to get job' });
  }
};

// ========== Create job ==========
export const createJob = async (req, res) => {
  try {
    if (DB_OFFLINE) return res.status(503).json({ success: false, message: 'Database unavailable' });

    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ success: false, message: 'Only recruiters can create jobs.' });
    }

    const { title, company, description } = req.body;

    // Accept both camelCase and snake_case payloads
    let requiredSkillsRaw   = req.body.requiredSkills ?? req.body.required_skills ?? '';
    let niceToHaveSkillsRaw = req.body.niceToHaveSkills ?? req.body.nice_to_have_skills ?? '';

    // Tolerant → arrays
    let requiredSkills   = toArrayFlexible(requiredSkillsRaw);
    let niceToHaveSkills = toArrayFlexible(niceToHaveSkillsRaw);

    // Determine job category based on title
    let category = 'General';
    const titleLower = (title || '').toLowerCase();
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

    // Normalize + seed skills DB (safe: normalizeSkills already has DB guard)
    if (requiredSkills.length > 0) {
      requiredSkills = await normalizeSkills(requiredSkills);
      await addSkillsToDatabase(requiredSkills, category);
    }
    if (niceToHaveSkills.length > 0) {
      niceToHaveSkills = await normalizeSkills(niceToHaveSkills);
      await addSkillsToDatabase(niceToHaveSkills, category);
    }

    const insertData = {
      title,
      company,
      description,
      required_skills: JSON.stringify(requiredSkills),
      nice_to_have_skills: JSON.stringify(niceToHaveSkills),
      created_by: req.user.id,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    let result = await db('jobs').insert(insertData).returning(['id']);
    if (Array.isArray(result)) result = result[0] ?? result;
    const id = (result && typeof result === 'object') ? result.id : result;

    res.status(201).json({ success: true, id, message: 'Job created successfully' });
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ success: false, message: 'Failed to create job', error: err.message });
  }
};

// ========== Update job ==========
export const updateJob = async (req, res) => {
  try {
    if (DB_OFFLINE) return res.status(503).json({ success: false, message: 'Database unavailable' });

    const jobId   = req.params.id;
    const userId  = req.user.id;
    const userRole = req.user.role;

    const job = await db('jobs').where({ id: jobId }).first();
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (userRole !== 'recruiter' || job.created_by !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this job.' });
    }

    const { title, company, description } = req.body;
    let requiredSkillsRaw   = req.body.requiredSkills ?? req.body.required_skills ?? job.required_skills ?? '';
    let niceToHaveSkillsRaw = req.body.niceToHaveSkills ?? req.body.nice_to_have_skills ?? job.nice_to_have_skills ?? '';

    let requiredSkills   = toArrayFlexible(requiredSkillsRaw);
    let niceToHaveSkills = toArrayFlexible(niceToHaveSkillsRaw);

    if (requiredSkills.length > 0) {
      requiredSkills = await normalizeSkills(requiredSkills);
      await addSkillsToDatabase(requiredSkills);
    }
    if (niceToHaveSkills.length > 0) {
      niceToHaveSkills = await normalizeSkills(niceToHaveSkills);
      await addSkillsToDatabase(niceToHaveSkills);
    }

    await db('jobs').where({ id: jobId }).update({
      title,
      company,
      description,
      required_skills: JSON.stringify(requiredSkills),
      nice_to_have_skills: JSON.stringify(niceToHaveSkills),
      updated_at: new Date()
    });

    res.json({ success: true, message: 'Job updated successfully' });
  } catch (err) {
    console.error('Update job error:', err);
    res.status(500).json({ success: false, message: 'Failed to update job.', error: err.message });
  }
};

// ========== Delete job (soft) ==========
export const deleteJob = async (req, res) => {
  try {
    if (DB_OFFLINE) return res.status(503).json({ success: false, message: 'Database unavailable' });

    const jobId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const job = await db('jobs').where({ id: jobId }).first();
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    if (userRole !== 'recruiter' || job.created_by !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this job.' });
    }

    await db('jobs').where({ id: jobId }).update({ is_active: false, updated_at: new Date() });
    res.json({ success: true, message: 'Job deleted.' });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete job.', error: err.message });
  }
};
