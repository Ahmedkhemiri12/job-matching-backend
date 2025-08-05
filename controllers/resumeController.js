import { extractTextFromFile } from '../services/parserService.js';
import { extractSkills } from '../services/skillExtractor.js';
import { saveApplication, calculateMatchPercentage } from '../services/applicationService.js';
import { normalizeSkills } from '../utils/skillDatabase.js'; // ADD THIS IMPORT
import db from '../db/database.js';

export const parseResume = async (req, res) => {
  try {
    // ADD THIS LOGGING AT THE VERY START
    console.log('=== INCOMING REQUEST ===');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file ? 'File present' : 'No file');
    console.log('========================');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const jobId = req.body.jobId;
    const applicantName = req.body.applicantName;
    const applicantEmail = req.body.applicantEmail;
    const applicantId = req.body.applicantId;
    
    // ADD THIS LOGGING
    console.log('Extracted values:');
    console.log('- jobId:', jobId, '(type:', typeof jobId, ')');
    console.log('- applicantName:', applicantName, '(type:', typeof applicantName, ')');
    console.log('- applicantEmail:', applicantEmail, '(type:', typeof applicantEmail, ')');
    console.log('- applicantId:', applicantId, '(type:', typeof applicantId, ')');

    // ... rest of your code// ADD THIS LINE to capture applicantId

    let jobRequiredSkills = [];
    let jobTitle = "";
    if (jobId) {
      const job = await db('jobs').where({ id: jobId }).first();
      if (job && job.required_skills) {
        jobRequiredSkills = JSON.parse(job.required_skills);
        // Normalize job required skills for consistent comparison
        jobRequiredSkills = await normalizeSkills(jobRequiredSkills);
        jobTitle = job.title || "";
      }
    }

    // Extract resume text
    const text = await extractTextFromFile(req.file);

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract text from the file'
      });
    }

    // Extract skills, passing in job-specific required skills
    // Skills are already normalized in skillExtractor.js
    const extractedData = await extractSkills(text, jobRequiredSkills);

    let matchPercentage = 0;
    let applicationId = null;

    if (jobId && applicantName && applicantEmail) {
      try {
        // CHECK FOR EXISTING APPLICATION
        const existingApp = await db('applications')
          .where({
            job_id: jobId,
            applicant_email: applicantEmail
          })
          .first();
        
        if (existingApp) {
          return res.status(400).json({
            success: false,
            message: 'You have already applied for this position. Each candidate can only apply once per job.',
            alreadyApplied: true
          });
        }
        
        // Continue with match calculation and saving...
        matchPercentage = await calculateMatchPercentage(
          extractedData.skills.map(skill => skill.name),
          jobId
        );
        
        applicationId = await saveApplication({
          jobId,
          applicantName,
          applicantEmail,
          applicantId,
          parsedSkills: extractedData.skills.map(skill => skill.name),
          matchPercentage,
          fileName: req.file.originalname,
          filePath: req.file.path,
          fileSize: req.file.size
        });
        console.log('=== APPLICATION SAVED ===');
console.log('Application ID:', applicationId);
console.log('Job ID:', jobId);
console.log('Applicant:', applicantName, applicantEmail);
console.log('Applicant ID:', applicantId);
console.log('Match %:', matchPercentage);
console.log('========================');
      } catch (error) {
        console.error('Application save error:', error);
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    console.log('Extracted skills:', extractedData.skills);
    console.log('Job required skills after normalization:', jobRequiredSkills);
    
    res.json({
      success: true,
      data: {
        skills: extractedData.skills, // Already normalized from skillExtractor
        skillsByCategory: extractedData.skillsByCategory,
        stats: extractedData.stats,
        matchPercentage,
        applicationId,
        filename: req.file.originalname,
        fileSize: req.file.size,
        filePath: req.file.path,
        processedAt: new Date().toISOString(),
        targetSkills: jobRequiredSkills, // Now normalized
        jobTitle
      }
    });
  } catch (error) {
    console.error('Parse resume error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to parse resume'
    });
  }
};

// Utility to get target skills for a given role (if still needed)
export const getTargetSkills = async (req, res) => { // ADD async here
  try {
    const { role = 'default' } = req.query;
    let targetSkills = [];
    
    // You may want to fetch from DB, but for now use a static list
    if (role === 'developer') {
      targetSkills = ["React", "JavaScript", "English"];
    }
    
    // Normalize the target skills before sending
    targetSkills = await normalizeSkills(targetSkills);
    
    res.json({
      success: true,
      data: targetSkills
    });
  } catch (error) {
    console.error('Get target skills error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get target skills'
    });
  }
};