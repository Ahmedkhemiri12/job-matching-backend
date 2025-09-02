import db from '../db/database.js';
import { normalizeSkills } from '../utils/skillDatabase.js';

// Flexible array parser
function toArrayFlexible(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const s = value.trim();
    if (s.startsWith('[') && s.endsWith(']')) {
      try { return JSON.parse(s); } catch {}
    }
    return s.split(',').map(x => x.trim()).filter(Boolean);
  }
  if (value == null) return [];
  return [String(value).trim()].filter(Boolean);
}

export const saveApplication = async (applicationData) => {
  try {
    const exists = await checkExistingApplication(applicationData.jobId, applicationData.applicantEmail);
    if (exists) throw new Error('You have already applied for this position');

    let inserted = await db('applications').insert({
      job_id: applicationData.jobId,
      applicant_name: applicationData.applicantName,
      applicant_email: applicationData.applicantEmail,
      applicant_id: applicationData.applicantId,
      parsed_skills: JSON.stringify(applicationData.parsedSkills),
      match_percentage: applicationData.matchPercentage,
      file_name: applicationData.fileName,
      file_path: applicationData.filePath,
      file_size: applicationData.fileSize,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    }).returning(['id']);

    if (Array.isArray(inserted)) inserted = inserted[0] ?? inserted;
    return (inserted && typeof inserted === 'object') ? inserted.id : inserted;
  } catch (error) {
    console.error('Save application error:', error);
    throw error;
  }
};

export const calculateMatchPercentage = async (applicantSkills, jobId) => {
  try {
    const job = await db('jobs').where({ id: jobId }).first();
    if (!job || !job.required_skills) return 0;

    const requiredSkills = toArrayFlexible(job.required_skills);
    if (!requiredSkills.length) return 100;

    const normalizedApplicantSkills = await normalizeSkills(applicantSkills);
    const normalizedRequiredSkills = await normalizeSkills(requiredSkills);

    const applicantSkillsLower = normalizedApplicantSkills.map(s => s.toLowerCase());
    const requiredSkillsLower = normalizedRequiredSkills.map(s => s.toLowerCase());

    const matchingSkills = requiredSkillsLower.filter(reqSkill => applicantSkillsLower.includes(reqSkill));
    return Math.round((matchingSkills.length / requiredSkillsLower.length) * 100);
  } catch (error) {
    console.error('Error calculating match percentage:', error);
    return 0;
  }
};

export const getApplicationsByJob = async (jobId) => {
  try {
    const applications = await db('applications')
      .select('applications.*', 'users.name as applicant_name', 'users.email as applicant_email')
      .leftJoin('users', 'applications.applicant_id', 'users.id')
      .where('applications.job_id', jobId)
      .orderBy('applications.created_at', 'desc');

    return applications.map(app => ({
      ...app,
      parsed_skills: toArrayFlexible(app.parsed_skills)
    }));
  } catch (error) {
    console.error('Get applications error:', error);
    throw error;
  }
};

export const checkExistingApplication = async (jobId, applicantEmail) => {
  try {
    const existing = await db('applications').where({ job_id: jobId, applicant_email: applicantEmail }).first();
    return !!existing;
  } catch (error) {
    console.error('Check existing application error:', error);
    return false;
  }
};

export const updateApplicationStatus = async (applicationId, status) => {
  try {
    await db('applications').where('id', applicationId).update({ status, updated_at: new Date() });
  } catch (error) {
    console.error('Update status error:', error);
    throw error;
  }
};
