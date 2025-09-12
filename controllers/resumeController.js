// server/controllers/resumeController.js

import { extractTextFromFile } from '../services/parserService.js';
import { extractSkillsFromText } from '../services/skillExtractor.js';
import { normalizeSkills } from '../utils/skillDatabase.js';

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
 * Accepts a resume file, extracts text + candidate skills,
 * and returns a normalized array of skill names.
 *
 * Response:
 * {
 *   success: true,
 *   skills: ["React","JavaScript", ...],
 *   meta: { textLength, filename, size, mimetype }
 * }
 */
export async function parseResume(req, res) {
  try {
    // 1) Ensure a file was uploaded
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded (expected field "resume")',
      });
    }

    // 2) Extract raw text from the uploaded file (PDF/DOCX/etc.)
    const text = await extractTextFromFile(file);

    // 3) Extract skill names from the text (returns an array of strings)
    const extracted = extractSkillsFromText(text);
    const skillNames = Array.isArray(extracted) ? extracted : [];

    // 4) Normalize via your skill database (canonicalize labels), best-effort
    let normalized = skillNames;
    try {
      const out = await normalizeSkills(skillNames);
      if (Array.isArray(out) && out.every(s => typeof s === 'string')) {
        normalized = out;
      }
    } catch (e) {
      // non-fatal; keep extracted skills
      console.warn('normalizeSkills failed, using extracted skills:', e?.message);
    }

    // 5) Respond — frontend expects `skills` to be an ARRAY
    return res.status(200).json({
      success: true,
      skills: normalized,
      meta: {
        textLength: text?.length || 0,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      },
    });
  } catch (err) {
    console.error('PARSE ERROR:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Resume parse failed',
    });
  }
}

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
