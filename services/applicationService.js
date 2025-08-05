import db from '../db/database.js';
import { normalizeSkills } from '../utils/skillDatabase.js';

export const saveApplication = async (applicationData) => {
  try {
    const exists = await checkExistingApplication(
      applicationData.jobId, 
      applicationData.applicantEmail
    );
    
    if (exists) {
      throw new Error('You have already applied for this position');
    }
    
    const [id] = await db('applications').insert({
      job_id: applicationData.jobId,
      applicant_name: applicationData.applicantName,  // THIS IS MISSING!
      applicant_email: applicationData.applicantEmail,  // THIS IS MISSING!
      applicant_id: applicationData.applicantId,  // THIS IS MISSING!
      parsed_skills: JSON.stringify(applicationData.parsedSkills),  // THIS IS MISSING!
      match_percentage: applicationData.matchPercentage,  // THIS IS MISSING!
      file_name: applicationData.fileName,  // THIS IS MISSING!
      file_path: applicationData.filePath,  // THIS IS MISSING!
      file_size: applicationData.fileSize,  // THIS IS MISSING!
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    return id;
  } catch (error) {
    console.error('Save application error:', error);
    throw error;
  }
};

export const calculateMatchPercentage = async (applicantSkills, jobId) => {
  try {
    // Get job required skills
    const job = await db('jobs').where({ id: jobId }).first();
    if (!job || !job.required_skills) return 0;
    
    const requiredSkills = JSON.parse(job.required_skills);
    if (!requiredSkills.length) return 100; // If no skills required, it's a 100% match
    
    // NORMALIZE BOTH SIDES! 
    const normalizedApplicantSkills = await normalizeSkills(applicantSkills);
    const normalizedRequiredSkills = await normalizeSkills(requiredSkills);
    
    // Now compare normalized skills (lowercase for safety)
    const applicantSkillsLower = normalizedApplicantSkills.map(s => s.toLowerCase());
    const requiredSkillsLower = normalizedRequiredSkills.map(s => s.toLowerCase());
    
    // Calculate how many required skills the applicant has
    const matchingSkills = requiredSkillsLower.filter(reqSkill => 
      applicantSkillsLower.includes(reqSkill)
    );
    
    // Calculate percentage
    const percentage = Math.round((matchingSkills.length / requiredSkillsLower.length) * 100);
    
    return percentage;
  } catch (error) {
    console.error('Error calculating match percentage:', error);
    return 0;
  }
};
export const getApplicationsByJob = async (jobId) => {
  try {  // <-- Make sure this 'try {' exists
    const applications = await db('applications')
      .select(
        'applications.*',
        'users.name as applicant_name',
        'users.email as applicant_email'
      )
      .leftJoin('users', 'applications.applicant_id', 'users.id')
      .where('applications.job_id', jobId)
      .orderBy('applications.created_at', 'desc');
    
    // Parse JSON fields
    return applications.map(app => ({
      ...app,
      parsed_skills: JSON.parse(app.parsed_skills || '[]')
    }));
  } catch (error) {
    console.error('Get applications error:', error);
    throw error;
  }
};

export const checkExistingApplication = async (jobId, applicantEmail) => {
  try {
    const existing = await db('applications')
      .where({
        job_id: jobId,
        applicant_email: applicantEmail
      })
      .first();
    
    return !!existing;
  } catch (error) {
    console.error('Check existing application error:', error);
    return false;
  }
};

export const updateApplicationStatus = async (applicationId, status) => {
  try {
    await db('applications')
      .where('id', applicationId)
      .update({
        status,
        updated_at: new Date()
      });
  } catch (error) {
    console.error('Update status error:', error);
    throw error;
  }
};
