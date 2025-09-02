// server/controllers/resumeController.js
import { extractTextFromFile } from '../services/parserService.js';
import { extractSkills } from '../services/skillExtractor.js';
import { saveApplication } from '../services/applicationService.js';
import { normalizeSkills } from '../utils/skillDatabase.js';
import { computeMatch } from '../utils/matching.js';
import db from '../db/database.js';

/**
 * Tolerant array parser for query/body fields that might arrive as:
 * - real arrays
 * - CSV strings ("a, b, c")
 * - JSON strings ('["a","b","c"]')
 */
function toArrayFlexible(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return [];
    if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('"') && s.endsWith('"'))) {
      try { return JSON.parse(s); } catch { /* fall through to CSV */ }
    }
    return s.split(',').map(x => x.trim()).filter(Boolean);
  }
  return [];
}

/**
 * POST /api/resumes/parse
 * Accepts a resume file, extracts text + candidate skills, optionally matches
 * against job skills provided in the request body.
 *
 * Body (optional):
 * - requiredSkills: array | csv | json-string
 * - niceSkills:     array | csv | json-string
 * - jobId:          string (if saving an application)
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     text,
 *     rawCandidateSkills,
 *     candidateSkills,     // normalized
 *     jobRequiredSkills,   // normalized (if provided)
 *     jobNiceSkills,       // normalized (if provided)
 *     match: {             // only when job skills provided
 *       score, requiredPct, nicePct,
 *       requiredMatches, missingRequired, niceMatches,
 *       candidate, required, nice
 *     }
 *   }
 * }
 */
export const parseResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // 1) Extract text from file
    const text = await extractTextFromFile(req.file);

    // 2) Extract skills from text (raw)
    const rawCandidateSkills = await extractSkills(text);

    // 3) Normalize via DB-backed canonicalizer
    const candidateSkills = await normalizeSkills(rawCandidateSkills);

    // Optional job skills provided by client for immediate matching
    const jobRequiredInput = toArrayFlexible(req.body?.requiredSkills);
    const jobNiceInput     = toArrayFlexible(req.body?.niceSkills);

    let jobRequiredSkills = [];
    let jobNiceSkills     = [];
    let match = null;

    if (jobRequiredInput.length || jobNiceInput.length) {
      jobRequiredSkills = await normalizeSkills(jobRequiredInput);
      jobNiceSkills     = await normalizeSkills(jobNiceInput);

      // **** NEW ORDER + NEW KEYS ****
      // computeMatch(required, nice, candidate)
      const result = computeMatch(jobRequiredSkills, jobNiceSkills, candidateSkills);
      match = {
        score: result.score,
        requiredPct: result.requiredPct,
        nicePct: result.nicePct,
        requiredMatches: result.requiredMatches,
        missingRequired: result.missingRequired,
        niceMatches: result.niceMatches,
        candidate: result.candidate,
        required: result.required,
        nice: result.nice,
      };
    }

    // Optionally persist an application if jobId is provided
    if (req.body?.jobId) {
      await saveApplication({
        db,
        jobId: req.body.jobId,
        fileMeta: {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        text,
        candidateSkills,
        match,
      });
    }

    return res.json({
      success: true,
      data: {
        text,
        rawCandidateSkills,
        candidateSkills,
        jobRequiredSkills,
        jobNiceSkills,
        ...(match ? { match } : {}),
      },
    });
  } catch (error) {
    console.error('Parse resume error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to parse resume',
    });
  }
};

/**
 * GET /api/resumes/target-skills?role=... OR ?skills=csv/json/array
 * Returns a normalized skill list for a role or a provided set.
 */
export const getTargetSkills = async (req, res) => {
  try {
    const role = (req.query.role || '').toString().trim().toLowerCase();
    let targetSkills = toArrayFlexible(req.query.skills);

    // If no explicit list is provided, infer some role-based defaults (simple example).
    if (!targetSkills.length && role) {
      switch (role) {
        case 'developer':
        case 'frontend':
        case 'frontend-developer':
        case 'react':
          targetSkills = ['React', 'JavaScript', 'English'];
          break;
        case 'data':
        case 'data-science':
        case 'ml':
          targetSkills = ['Python', 'Pandas', 'Machine Learning', 'English'];
          break;
        default:
          targetSkills = ['English']; // minimal default
      }
    }

    // Normalize through DB so only canonical tokens are returned
    const normalized = await normalizeSkills(targetSkills);
    return res.json({ success: true, data: normalized });
  } catch (error) {
    console.error('Get target skills error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to get target skills',
    });
  }
};
