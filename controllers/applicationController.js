// server/controllers/applicationController.js
import path from 'path';
import fs from 'fs';
import db from '../db/database.js';
import { calculateMatchPercentage } from '../services/applicationService.js';
import { sendApplicationStatusEmail } from '../services/emailService.js';

// ---------- tolerant parsers ----------
function safeParseArray(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (v == null) return [];
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const arr = JSON.parse(s);
        return Array.isArray(arr) ? arr.filter(Boolean) : [];
      } catch { /* fall through */ }
    }
    return s.split(',').map(x => x.trim()).filter(Boolean);
  }
  try {
    const arr = JSON.parse(v);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function safeParseObject(v) {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try {
    const o = JSON.parse(v);
    return (o && typeof o === 'object') ? o : {};
  } catch {
    return {};
  }
}

// ---------- create via manual apply ----------
export const submitManualApplication = async (req, res) => {
  try {
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

    const skillsArray = safeParseArray(skills);

    let matchPercentage = 0;
    try {
      matchPercentage = await calculateMatchPercentage(skillsArray, jobId);
    } catch (e) {
      console.error('calculateMatchPercentage error:', e);
    }

    const insertData = {
      job_id: jobId,
      applicant_name: applicantName,
      applicant_email: applicantEmail,
      applicant_id: applicantId ?? req.user?.id ?? null,
      parsed_skills: JSON.stringify(skillsArray),
      match_percentage: matchPercentage,
      file_name: 'Manual Application',
      file_path: null,
      file_size: 0,
      status: 'pending',
      experience: experience || null,
      experience_details: experienceDetails || null,
      why_good_fit: whyGoodFit || null,
      links: JSON.stringify(safeParseObject(links)),
      created_at: new Date(),
      updated_at: new Date(),
    };

    let inserted = await db('applications').insert(insertData).returning(['id']);
    if (Array.isArray(inserted)) inserted = inserted[0] ?? inserted;
    const applicationId = (inserted && typeof inserted === 'object') ? inserted.id : inserted;

    return res.status(201).json({
      success: true,
      data: {
        applicationId,
        matchPercentage,
        skills: skillsArray.map(name => ({ name, category: 'Manual Entry' })),
      },
    });
  } catch (err) {
    console.error('=== MANUAL APPLICATION ERROR ===', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to save application',
    });
  }
};

// ---------- list applications (recruiter-scoped) ----------
export const getApplications = async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ success: false, message: 'Only recruiters can view applications' });
    }

    const rows = await db('applications as a')
      .leftJoin('jobs as j', 'a.job_id', 'j.id')
      .select(
        'a.*',
        'j.title as job_title',
        'j.company as job_company',
        'j.required_skills as job_required_skills',
        'j.nice_to_have_skills as job_nice_to_have_skills',
        'j.created_by as job_owner'
      )
      .where('j.created_by', req.user.id)
      .orderBy('a.match_percentage', 'desc')
      .orderBy('a.created_at', 'desc');

    const data = rows.map(r => {
      const parsedSkills = safeParseArray(r.parsed_skills);
      const requiredSkills = safeParseArray(r.job_required_skills);
      const niceToHaveSkills = safeParseArray(r.job_nice_to_have_skills);

      const candidateSkillNames = parsedSkills.map(s => (typeof s === 'string' ? s : s.name)).map(s => s.toLowerCase());

      const missingRequiredSkills = requiredSkills.filter(s => !candidateSkillNames.includes(String(s).toLowerCase()));
      const missingNiceToHaveSkills = niceToHaveSkills.filter(s => !candidateSkillNames.includes(String(s).toLowerCase()));

      return {
        id: r.id,
        job_id: r.job_id,
        job_title: r.job_title,
        job_company: r.job_company,
        applicant_name: r.applicant_name,
        applicant_email: r.applicant_email,
        status: r.status,
        match_percentage: r.match_percentage ?? 0,
        skills: parsedSkills.map(s => (typeof s === 'string' ? s : s.name)),
        requiredSkills,
        niceToHaveSkills,
        missingRequiredSkills,
        missingNiceToHaveSkills,
        hasResume: Boolean(r.file_name && r.file_name !== 'Manual Entry'),
        file_name: r.file_name,
        file_size: r.file_size,
        created_at: r.created_at,
        updated_at: r.updated_at,
        links: safeParseObject(r.links),
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getApplications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
};

// ---------- get a single application (auth-checked) ----------
export const getApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await db('applications as a')
      .leftJoin('jobs as j', 'a.job_id', 'j.id')
      .select(
        'a.*',
        'j.title as job_title',
        'j.company as job_company',
        'j.required_skills as job_required_skills',
        'j.created_by as job_owner'
      )
      .where('a.id', id)
      .first();

    if (!row) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (req.user.role === 'recruiter' && row.job_owner !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (req.user.role === 'applicant' && row.applicant_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const data = {
      ...row,
      parsed_skills: safeParseArray(row.parsed_skills),
      requiredSkills: safeParseArray(row.job_required_skills),
      links: safeParseObject(row.links),
    };

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getApplication error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch application' });
  }
};

// ---------- download resume file (recruiter owner only) ----------
export const downloadResume = async (req, res) => {
  try {
    const appId = req.params.id;
    const row = await db('applications as a')
      .leftJoin('jobs as j', 'a.job_id', 'j.id')
      .select('a.*', 'j.created_by as job_owner')
      .where('a.id', appId)
      .first();

    if (!row) return res.status(404).json({ success: false, message: 'Application not found' });
    if (req.user.role !== 'recruiter' || row.job_owner !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to download this resume' });
    }
    if (!row.file_path || row.file_name === 'Manual Entry') {
      return res.status(404).json({ success: false, message: 'No resume file available' });
    }

    const absolute = path.resolve(row.file_path);
    if (!fs.existsSync(absolute)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }
    return res.download(absolute, row.file_name || path.basename(absolute));
  } catch (error) {
    console.error('downloadResume error:', error);
    return res.status(500).json({ success: false, message: 'Failed to download resume' });
  }
};

// ---------- update status (recruiter owner) ----------
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
const s = String(status || '').toLowerCase();


    if (!['pending', 'accepted', 'rejected'].includes(s)) {
  return res.status(400).json({ success: false, message: 'Invalid status' });
}


    const application = await db('applications as a')
      .join('jobs as j', 'a.job_id', 'j.id')
      .where('a.id', id)
      .select('a.*', 'j.created_by', 'j.title as job_title', 'j.company')
      .first();

    if (!application || application.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this application' });
    }

    await db('applications').where({ id }).update({ status: s, updated_at: new Date() });


    if (s === 'accepted' || s === 'rejected') {
  try {
    await sendApplicationStatusEmail({
      to: application.applicant_email,
      status: s,
      applicationId: id, // or application.id if you prefer
      name: application.applicant_name,
      jobTitle: application.job_title,
      company: application.company,
    });
    console.log(`${s} email sent to ${application.applicant_email}`);
  } catch (emailError) {
    console.error('Failed to send email:', emailError);
  }
}

    return res.json({ success: true, message: `Application ${status} successfully` });
  } catch (error) {
    console.error('updateApplicationStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// ---------- public details (for scheduling link, etc.) ----------
export const getApplicationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    const application = await db('applications as a')
      .join('jobs as j', 'a.job_id', 'j.id')
      .join('users as r', 'j.created_by', 'r.id')
      .where('a.id', id)
      .select(
        'a.*',
        'j.title as job_title',
        'j.company',
        'j.created_by as recruiter_id',
        'r.name as recruiter_name'
      )
      .first();

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (token && application.scheduling_token && application.scheduling_token !== token) {
      return res.status(403).json({ success: false, message: 'Invalid scheduling link' });
    }

    return res.json({ success: true, application });
  } catch (error) {
    console.error('getApplicationDetails error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get application details' });
  }
};
