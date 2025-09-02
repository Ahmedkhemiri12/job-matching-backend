import db from '../db/database.js';
import { normalizeSkills } from '../utils/skillDatabase.js';

// Extracts skills from resume text, including job-specific required skills
export const extractSkills = async (text, jobRequiredSkills = []) => {
  const normalizedText = text.toLowerCase();
  const extractedSkills = [];
  const skillsByCategory = {};

  // Get all skills from database
  const dbSkills = await db('skills').select('*');

  // Group skills by category
  const skillsDatabase = {};
  for (const skill of dbSkills) {
  if (!skillsDatabase[skill.category]) {
    skillsDatabase[skill.category] = [];
  }
  skillsDatabase[skill.category].push({
    name: skill.name,
    aliases: (() => {
      try {
        let parsed = JSON.parse(skill.aliases || '[]');
        if (!Array.isArray(parsed)) parsed = [];
        return parsed;
      } catch {
        return [];
      }
    })()
  });
}


  // Also check job-specific required skills (dynamic skills)
  if (jobRequiredSkills.length > 0) {
    if (!skillsDatabase['Job Specific']) {
      skillsDatabase['Job Specific'] = [];
    }

    for (const requiredSkill of jobRequiredSkills) {
      // Check if this skill already exists in database
      const existingSkill = dbSkills.find(s =>
        s.name.toLowerCase() === requiredSkill.toLowerCase()
      );

      if (!existingSkill) {
        // Add to temporary check list
        skillsDatabase['Job Specific'].push({
          name: requiredSkill,
          aliases: []
        });
      }
    }
  }

  // Extract skills from each category
  for (const [category, skills] of Object.entries(skillsDatabase)) {
    skillsByCategory[category] = [];

    for (const skill of skills) {
      if (!skill.name || !skill.name.trim()) continue; // SKIP EMPTY SKILLS!

      const hasSkill = matchesAnyTerm(normalizedText, skill);

      if (hasSkill) {
        const skillData = {
          name: skill.name,
          category
        };

        extractedSkills.push(skillData);
        skillsByCategory[category].push(skillData);
      }
    }
  }

  // Calculate overall stats
  const totalSkills = extractedSkills.length;

  // ---- Normalization logic starts here ----

  // 1. Normalize all extracted skill names
  const normalizedNames = await normalizeSkills(extractedSkills.map(s => s.name));
  // After normalization
console.log('Skills before normalization:', extractedSkills.map(s => s.name));
console.log('Skills after normalization:', normalizedNames);
  // 2. Update main skills array
  const normalizedExtractedSkills = extractedSkills.map((s, i) => ({
    ...s,
    name: normalizedNames[i]
  }));

  // 3. Update category arrays to use normalized names too (if needed)
  const normalizedSkillsByCategory = {};
  for (const [category, skills] of Object.entries(skillsByCategory)) {
    normalizedSkillsByCategory[category] = skills.map((s) => {
      // Find the normalized name by matching both name and category
      const idx = extractedSkills.findIndex(
        es => es.name === s.name && es.category === s.category
      );
      return {
        ...s,
        name: idx !== -1 ? normalizedNames[idx] : s.name
      };
    });
  }

  // 4. Return the normalized structure
  return {
    skills: normalizedExtractedSkills,
    skillsByCategory: normalizedSkillsByCategory,
    stats: {
      totalSkills,
      topSkills: normalizedExtractedSkills.slice(0, 10),
      skillDistribution: Object.entries(normalizedSkillsByCategory).map(([category, skills]) => ({
        category,
        count: skills.length
      }))
    }
  };
};

// Return true if any skill name/alias is found in the text
const matchesAnyTerm = (text, skill) => {
  const searchTerms = [skill.name, ...(skill.aliases || [])];
  return searchTerms.some(term => {
    const termLower = term.toLowerCase();
    const regex = new RegExp(`\\b${escapeRegex(termLower)}\\b`, 'gi');
    return regex.test(text);
  });
};

const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Add new skills to database, but never empty ones
export const addSkillsToDatabase = async (skills, category = 'General') => {
  for (const skillName of skills) {
    try {
      const cleanSkillName = skillName.trim();
      if (!cleanSkillName) continue; // Skip empty skills

      // Check if skill already exists
      const existing = await db('skills')
        .whereRaw('LOWER(name) = LOWER(?)', [cleanSkillName])
        .first();

      if (!existing) {
        await db('skills').insert({
          name: cleanSkillName,
          category: category,
          aliases: JSON.stringify([]),
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    } catch (error) {
      console.log(`Skill ${skillName} might already exist:`, error.message);
    }
  }
};
