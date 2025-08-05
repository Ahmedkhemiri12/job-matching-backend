import { calculateMatchPercentage } from '../services/applicationService.js';
import db from '../db/database.js';
import { sendApplicationStatusEmail } from '../services/emailService.js';

// Handles job application submission by a logged-in user
export const submitManualApplication = async (req, res) => {
  try {
    console.log('=== MANUAL APPLICATION RECEIVED ===');
    console.log('Request body:', req.body);
    console.log('Authenticated user:', req.user);
    
    const { 
      jobId, 
      applicantName, 
      applicantEmail, 
      applicantId,
      skills,
      experience,
      experienceDetails,
      whyGoodFit,
      links 
    } = req.body;

    console.log('Parsed fields:');
    console.log('- jobId:', jobId);
    console.log('- applicantName:', applicantName);
    console.log('- applicantEmail:', applicantEmail);
    console.log('- skills:', skills);

    // Parse skills from comma-separated string to array
    const skillsArray = skills ? skills.split(',').map(s => s.trim()).filter(s => s) : [];
    console.log('Skills array:', skillsArray);
    
    // Calculate match percentage
    let matchPercentage = 0;
    try {
      matchPercentage = await calculateMatchPercentage(skillsArray, jobId);
      console.log('Match percentage calculated:', matchPercentage);
    } catch (matchError) {
      console.error('Error calculating match percentage:', matchError);
      // Continue with 0 if calculation fails
    }
    
    // Get applicant ID
    const finalApplicantId = applicantId || req.user?.id;
    console.log('Final applicant ID:', finalApplicantId);

    // Prepare data for insertion
    const applicationData = {
      job_id: jobId,
      applicant_name: applicantName,
      applicant_email: applicantEmail,
      applicant_id: finalApplicantId,
      parsed_skills: JSON.stringify(skillsArray),
      match_percentage: matchPercentage,
      file_name: 'Manual Application',
      file_path: null,
      file_size: 0,
      status: 'pending',
      experience: experience || null,
      experience_details: experienceDetails || null,
      why_good_fit: whyGoodFit || null,
      links: links ? JSON.stringify(links) : null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    console.log('Data to insert:', applicationData);

    // Save to database
    const [applicationId] = await db('applications').insert(applicationData);
    console.log('Application saved with ID:', applicationId);

    res.status(201).json({ 
      success: true, 
      data: {
        applicationId,
        matchPercentage,
        skills: skillsArray.map(skill => ({ name: skill, category: 'Manual Entry' }))
      }
    });
  } catch (err) {
    console.error('=== MANUAL APPLICATION ERROR ===');
    console.error('Error:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('================================');
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save application', 
      error: err.message 
    });
  }
};

// Get all applications (for recruiters)
export const getApplications = async (req, res) => {
  try {
    // Check if user is a recruiter
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only recruiters can view applications' 
      });
    }

    // Get applications with job details
    const applications = await db('applications')
      .select(
        'applications.*',
        'jobs.title as job_title',
        'jobs.company as job_company',
        'jobs.required_skills as job_required_skills',
        'jobs.nice_to_have_skills as job_nice_to_have_skills'
      )
      .leftJoin('jobs', 'applications.job_id', 'jobs.id')
      .where('jobs.created_by', req.user.id)
      .orderBy('applications.match_percentage', 'desc') // Sort by match percentage DESC
      .orderBy('applications.created_at', 'desc');

    // Format applications with parsed data
    const formattedApplications = applications.map(app => {
      const parsedSkills = JSON.parse(app.parsed_skills || '[]');
      const requiredSkills = JSON.parse(app.job_required_skills || '[]');
      const niceToHaveSkills = JSON.parse(app.job_nice_to_have_skills || '[]');
      
      // Extract just skill names for comparison
      const candidateSkillNames = parsedSkills.map(s => 
        (typeof s === 'string' ? s : s.name).toLowerCase()
      );
      
      // Calculate missing skills
      const missingRequiredSkills = requiredSkills.filter(skill => 
        !candidateSkillNames.includes(skill.toLowerCase())
      );
      
      const missingNiceToHaveSkills = niceToHaveSkills.filter(skill => 
        !candidateSkillNames.includes(skill.toLowerCase())
      );
      
      return {
        ...app,
        skills: parsedSkills.map(s => typeof s === 'string' ? s : s.name),
        requiredSkills,
        niceToHaveSkills,
        missingRequiredSkills,
        missingNiceToHaveSkills,
        hasResume: app.file_name && app.file_name !== 'Manual Entry'
      };
    });

    res.json({ 
      success: true, 
      data: formattedApplications 
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch applications' 
    });
  }
};

// Get single application with resume
export const getApplication = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get application with job details
    const application = await db('applications')
      .select(
        'applications.*',
        'jobs.title as job_title',
        'jobs.company as job_company',
        'jobs.required_skills as job_required_skills',
        'jobs.created_by'
      )
      .leftJoin('jobs', 'applications.job_id', 'jobs.id')
      .where('applications.id', id)
      .first();
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Check authorization
    if (application.created_by !== req.user.id && application.applicant_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this application'
      });
    }
    
    // Parse skills
    application.skills = JSON.parse(application.parsed_skills || '[]');
    application.requiredSkills = JSON.parse(application.job_required_skills || '[]');
    
    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application'
    });
  }
};

// Download resume
export const downloadResume = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get application
    const application = await db('applications')
      .select('applications.*', 'jobs.created_by')
      .leftJoin('jobs', 'applications.job_id', 'jobs.id')
      .where('applications.id', id)
      .first();
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Check authorization (only recruiter who posted the job)
    if (application.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this resume'
      });
    }
    
    // Check if resume exists
    if (!application.file_path || application.file_name === 'Manual Entry') {
      return res.status(404).json({
        success: false,
        message: 'No resume file available for this application'
      });
    }
    
    // Send file
    res.download(application.file_path, application.file_name);
  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download resume'
    });
  }
};

// Update application status
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status' 
      });
    }

    // Get full application details with job info
    const application = await db('applications as a')
      .join('jobs as j', 'a.job_id', 'j.id')
      .where('a.id', id)
      .select('a.*', 'j.created_by', 'j.title as job_title', 'j.company')
      .first();

    if (!application || application.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this application'
      });
    }

    // Update the application
    await db('applications')
      .where({ id })
      .update({ 
        status,
        updated_at: new Date()
      });

    // Send email notification
if (status === 'accepted' || status === 'rejected') {
  try {
    await sendApplicationStatusEmail(
      application.applicant_email,
      application.applicant_name,
      status,
      application.job_title,
      application.company,
      id  // Pass the application ID for the scheduling link
    );
    console.log(`${status} email sent to ${application.applicant_email}`);
  } catch (emailError) {
    console.error('Failed to send email:', emailError);
    // Continue even if email fails
  }
}

    res.json({ 
      success: true, 
      message: `Application ${status} successfully` 
    });
    
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update application status' 
    });
  }
};
// Add this at the very bottom of applicationController.js
export const getApplicationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query; // Get token from query params
    
    const application = await db('applications')
      .join('jobs', 'applications.job_id', 'jobs.id')
      .join('users as recruiters', 'jobs.created_by', 'recruiters.id')
      .where('applications.id', id)
      .select(
        'applications.*',
        'jobs.title as job_title',
        'jobs.company',
        'jobs.created_by as recruiter_id',
        'recruiters.name as recruiter_name'
      )
      .first();
    
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        message: 'Application not found' 
      });
    }
    
    // Verify token if provided
    if (token && application.scheduling_token !== token) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid scheduling link' 
      });
    }
    
    res.json({ success: true, application });
  } catch (error) {
    console.error('Get application details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get application details' 
    });
  }
};