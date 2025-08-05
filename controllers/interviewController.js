import db from '../db/database.js';
import { sendInterviewConfirmationEmail } from '../services/emailService.js';

// Schedule an interview
export const scheduleInterview = async (req, res) => {
  try {
    const { 
      applicationId, 
      interviewDate, 
      interviewTime, 
      duration, 
      location, 
      meetingLink, 
      notes 
    } = req.body;

    // Get application details
    const application = await db('applications')
      .join('jobs', 'applications.job_id', 'jobs.id')
      .join('users', 'applications.applicant_id', 'users.id')
      .where('applications.id', applicationId)
      .select(
        'applications.*',
        'jobs.title as job_title',
        'jobs.company',
        'jobs.created_by as recruiter_id',
        'users.name as applicant_name',
        'users.email as applicant_email'
      )
      .first();

    if (!application) {
      return res.status(404).json({ 
        success: false, 
        message: 'Application not found' 
      });
    }

    // Verify the user is either the applicant or the recruiter
    if (application.applicant_id !== req.user.id && application.recruiter_id !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    // Check for existing interview
    const existingInterview = await db('interviews')
      .where({ application_id: applicationId })
      .first();

    if (existingInterview) {
      return res.status(400).json({ 
        success: false, 
        message: 'Interview already scheduled for this application' 
      });
    }

    // Create interview
    const [interviewId] = await db('interviews').insert({
      application_id: applicationId,
      recruiter_id: application.recruiter_id,
      applicant_id: application.applicant_id,
      interview_date: interviewDate,
      interview_time: interviewTime,
      duration: duration || 60,
      location,
      meeting_link: meetingLink,
      notes,
      status: 'scheduled',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Send confirmation email
    try {
      await sendInterviewConfirmationEmail(
        application.applicant_email,
        application.applicant_name,
        application.job_title,
        application.company,
        interviewDate,
        interviewTime,
        location
      );
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Continue even if email fails
    }

    res.json({ 
      success: true, 
      interviewId,
      message: 'Interview scheduled successfully' 
    });
  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to schedule interview' 
    });
  }
};

// Get recruiter's interviews
export const getRecruiterInterviews = async (req, res) => {
  try {
    const interviews = await db('interviews')
      .join('applications', 'interviews.application_id', 'applications.id')
      .join('jobs', 'applications.job_id', 'jobs.id')
      .join('users', 'interviews.applicant_id', 'users.id')
      .where('interviews.recruiter_id', req.user.id)
      .select(
        'interviews.*',
        'jobs.title as job_title',
        'jobs.company',
        'users.name as applicant_name',
        'users.email as applicant_email',
        'applications.match_percentage'
      )
      .orderBy('interviews.interview_date', 'asc');

    res.json({ success: true, interviews });
  } catch (error) {
    console.error('Get interviews error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get interviews' 
    });
  }
};

// Get applicant's interviews
export const getApplicantInterviews = async (req, res) => {
  try {
    const interviews = await db('interviews')
      .join('applications', 'interviews.application_id', 'applications.id')
      .join('jobs', 'applications.job_id', 'jobs.id')
      .join('users as recruiters', 'interviews.recruiter_id', 'recruiters.id')
      .where('interviews.applicant_id', req.user.id)
      .select(
        'interviews.*',
        'jobs.title as job_title',
        'jobs.company',
        'recruiters.name as recruiter_name',
        'recruiters.email as recruiter_email'
      )
      .orderBy('interviews.interview_date', 'asc');

    res.json({ success: true, interviews });
  } catch (error) {
    console.error('Get applicant interviews error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get interviews' 
    });
  }
};

// Update interview status
export const updateInterviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const interview = await db('interviews')
      .where({ id })
      .first();

    if (!interview) {
      return res.status(404).json({ 
        success: false, 
        message: 'Interview not found' 
      });
    }

    // Check authorization
    if (interview.recruiter_id !== req.user.id && interview.applicant_id !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    await db('interviews')
      .where({ id })
      .update({
        status,
        updated_at: new Date()
      });

    res.json({ 
      success: true, 
      message: 'Interview status updated' 
    });
  } catch (error) {
    console.error('Update interview status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update interview status' 
    });
  }
};

// Get available time slots
export const getAvailableSlots = async (req, res) => {
  try {
    const { recruiterId, date } = req.query;
    
    // Define all possible time slots
    const allTimeSlots = [
      '09:00', '10:00', '11:00', '12:00',
      '13:00', '14:00', '15:00', '16:00', '17:00'
    ];
    
    // Get existing interviews for this recruiter on this date
    const existingInterviews = await db('interviews')
      .where({ 
        recruiter_id: recruiterId,
        interview_date: date,
        status: 'scheduled'
      })
      .select('interview_time');
    
    // Extract booked times
    const bookedTimes = existingInterviews.map(interview => interview.interview_time);
    
    // Create slots array with availability status
    const slots = allTimeSlots.map(time => ({
      time: time,
      available: !bookedTimes.includes(time)
    }));
    
    res.json({ success: true, slots });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get available slots' 
    });
  }
};