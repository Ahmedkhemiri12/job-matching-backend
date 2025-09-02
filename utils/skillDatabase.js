// server/utils/skillDatabase.js
import db from '../db/database.js';

// --- Helper: tolerate bad JSON & non-array shapes ---
function safeParseArray(value) {
  try {
    const v = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// This function replaces the static skillDatabase object
export const getSkillsFromDatabase = async () => {
  try {
    const skills = await db('skills').select('*');
    const skillsByCategory = {};
    
    for (const skill of skills) {
      if (!skillsByCategory[skill.category]) {
        skillsByCategory[skill.category] = [];
      }
      skillsByCategory[skill.category].push({
        name: skill.name,
        aliases: safeParseArray(skill.aliases)
      });
    }
    
    return skillsByCategory;
  } catch (error) {
    console.error('Error fetching skills from database:', error);
    // Return empty object if database not ready
    return {};
  }
};

// Keep the static data for initial seeding only
export const initialSkillData = {
  Programming: [
    { name: "JavaScript", aliases: ["JS", "Javascript"] },
    { name: "TypeScript", aliases: ["TS", "Typescript"] },
    { name: "Python", aliases: ["Py"] },
    { name: "Java", aliases: [] },
    { name: "C++", aliases: ["CPP"] },
    { name: "C#", aliases: ["C Sharp"] },
    { name: "PHP", aliases: [] },
    { name: "Ruby", aliases: [] },
    { name: "Go", aliases: ["Golang"] },
    { name: "Swift", aliases: [] },
    { name: "Kotlin", aliases: [] },
    { name: "Scala", aliases: [] },
    { name: "Perl", aliases: [] },
    { name: "Rust", aliases: [] },
    { name: "MATLAB", aliases: [] },
    { name: "R", aliases: ["R Language"] },
    { name: "Dart", aliases: [] },
  ],
  Frameworks: [
    { name: "React", aliases: ["ReactJS", "React.js"] },
    { name: "Angular", aliases: ["AngularJS", "Angular.js"] },
    { name: "Vue", aliases: ["VueJS", "Vue.js"] },
    { name: "Express", aliases: ["ExpressJS", "Express.js"] },
    { name: "Django", aliases: [] },
    { name: "Flask", aliases: [] },
    { name: "Spring", aliases: ["Spring Boot"] },
    { name: "Laravel", aliases: [] },
    { name: "Ruby on Rails", aliases: ["Rails"] },
    { name: "Next.js", aliases: ["NextJS"] },
    { name: "Nuxt.js", aliases: ["NuxtJS"] },
    { name: "Svelte", aliases: ["SvelteJS", "Svelte.js"] },
    { name: "ASP.NET", aliases: ["ASP.NET Core", "ASP.NET MVC"] },
    { name: "Symfony", aliases: [] },
    { name: "Meteor", aliases: [] },
    { name: "NestJS", aliases: ["Nest.js"] },
  ],
  Databases: [
    { name: "MySQL", aliases: [] },
    { name: "PostgreSQL", aliases: ["Postgres"] },
    { name: "SQLite", aliases: [] },
    { name: "MongoDB", aliases: ["Mongo"] },
    { name: "Redis", aliases: [] },
    { name: "Oracle", aliases: ["OracleDB"] },
    { name: "MariaDB", aliases: [] },
    { name: "Elasticsearch", aliases: [] },
    { name: "Cassandra", aliases: [] },
    { name: "Firebase", aliases: ["Firestore"] },
    { name: "DynamoDB", aliases: [] },
  ],
  Cloud: [
    { name: "AWS", aliases: ["Amazon Web Services"] },
    { name: "Azure", aliases: ["Microsoft Azure"] },
    { name: "Google Cloud", aliases: ["GCP", "Google Cloud Platform"] },
    { name: "Firebase", aliases: [] },
    { name: "Heroku", aliases: [] },
    { name: "DigitalOcean", aliases: [] },
    { name: "Netlify", aliases: [] },
    { name: "Vercel", aliases: [] },
    { name: "IBM Cloud", aliases: [] },
  ],
  DevOps: [
    { name: "Docker", aliases: [] },
    { name: "Kubernetes", aliases: ["K8s"] },
    { name: "Jenkins", aliases: [] },
    { name: "Travis CI", aliases: [] },
    { name: "CircleCI", aliases: [] },
    { name: "GitLab CI", aliases: ["GitLab CI/CD"] },
    { name: "Ansible", aliases: [] },
    { name: "Terraform", aliases: [] },
    { name: "Bash", aliases: ["Shell Scripting"] },
    { name: "Puppet", aliases: [] },
    { name: "Chef", aliases: [] },
    { name: "Nginx", aliases: [] },
    { name: "Apache", aliases: ["Apache HTTP Server"] },
  ],
  Tools: [
    { name: "Git", aliases: ["GitHub", "GitLab", "Bitbucket"] },
    { name: "JIRA", aliases: [] },
    { name: "Trello", aliases: [] },
    { name: "Slack", aliases: [] },
    { name: "Notion", aliases: [] },
    { name: "Figma", aliases: [] },
    { name: "Photoshop", aliases: ["Adobe Photoshop"] },
    { name: "Illustrator", aliases: ["Adobe Illustrator"] },
    { name: "MS Office", aliases: ["Microsoft Office", "Word", "Excel", "PowerPoint"] },
    { name: "VS Code", aliases: ["Visual Studio Code"] },
    { name: "IntelliJ", aliases: ["IntelliJ IDEA"] },
    { name: "Eclipse", aliases: [] },
    { name: "Xcode", aliases: [] },
    { name: "Android Studio", aliases: [] },
  ],
  Languages: [
    { name: "English", aliases: ["Englisch"] },
    { name: "German", aliases: ["Deutsch"] },
    { name: "French", aliases: ["Französisch"] },
    { name: "Spanish", aliases: ["Espanol", "Spanisch"] },
    { name: "Italian", aliases: ["Italienisch"] },
    { name: "Arabic", aliases: ["Arabe", "Arabisch"] },
    { name: "Russian", aliases: ["Russisch"] },
    { name: "Turkish", aliases: ["Türkisch", "Turkce"] },
    { name: "Dutch", aliases: ["Nederlands"] },
    { name: "Chinese", aliases: ["Mandarin", "Chinesisch"] },
    { name: "Japanese", aliases: ["Japanisch"] },
    { name: "Polish", aliases: ["Polnisch"] },
    { name: "Romanian", aliases: ["Rumänisch"] },
    { name: "Portuguese", aliases: ["Portugiesisch"] },
    { name: "Hindi", aliases: [] },
  ],
  SoftSkills: [
    { name: "Teamwork", aliases: ["Collaboration", "Team player", "Teamfähigkeit"] },
    { name: "Communication", aliases: ["Verbal Communication", "Written Communication", "Kommunikation"] },
    { name: "Leadership", aliases: ["Lead", "Führungskompetenz"] },
    { name: "Problem Solving", aliases: ["Analytical Thinking", "Problemlösungsfähigkeit"] },
    { name: "Time Management", aliases: ["Deadline Management", "Zeitmanagement"] },
    { name: "Adaptability", aliases: ["Flexibility", "Anpassungsfähigkeit"] },
    { name: "Creativity", aliases: ["Kreativität"] },
    { name: "Attention to Detail", aliases: ["Detail Oriented", "Genauigkeit"] },
    { name: "Critical Thinking", aliases: ["Kritisches Denken"] },
    { name: "Responsibility", aliases: ["Verantwortungsbewusstsein"] },
    { name: "Work Ethic", aliases: ["Arbeitsmoral"] },
    { name: "Self-motivation", aliases: ["Eigenmotivation"] },
  ],
  Other: [
    { name: "Driving License", aliases: ["Führerschein", "Permis de conduire"] },
    { name: "Project Management", aliases: ["PM", "Projektmanagement"] },
    { name: "Customer Service", aliases: ["Kundendienst"] },
    { name: "Data Analysis", aliases: ["Datenanalyse"] },
    { name: "Agile", aliases: ["Scrum", "Kanban"] },
    { name: "Sales", aliases: [] },
    { name: "Marketing", aliases: [] },
    { name: "Accounting", aliases: ["Buchhaltung"] },
    { name: "Finance", aliases: ["Finanzen"] },
    { name: "Teaching", aliases: ["Lehre"] },
    { name: "Research", aliases: ["Forschung"] },
  ],
};

// For backwards compatibility - this will be removed later
export const skillDatabase = initialSkillData;

// Get skills for a specific category
export const getSkillsByCategory = async (category) => {
  try {
    const skills = await db('skills')
      .where('category', category)
      .select('*');
    
    return skills.map(skill => ({
      name: skill.name,
      aliases: safeParseArray(skill.aliases)
    }));
  } catch (error) {
    console.error('Error fetching skills by category:', error);
    return [];
  }
};

// Search for a skill by name
export const findSkillByName = async (skillName) => {
  try {
    const skill = await db('skills')
      .where('name', 'ilike', `%${skillName}%`)
      .first();
    
    if (skill) {
      skill.aliases = safeParseArray(skill.aliases);
    }
    
    return skill;
  } catch (error) {
    console.error('Error finding skill:', error);
    return null;
  }
};

// Add skill with aliases
export const addSkillWithAliases = async (name, category, aliases = []) => {
  try {
    const safeAliases = safeParseArray(aliases);
    const [id] = await db('skills').insert({
      name,
      category,
      aliases: JSON.stringify(safeAliases),
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');
    
    return id;
  } catch (error) {
    console.error('Error adding skill:', error);
    return null;
  }
};

// This function is no longer needed but kept for compatibility
export const getTargetSkillsDB = (role) => {
  console.warn('getTargetSkillsDB is deprecated. Skills should come from job requirements.');
  return [];
};

// REPLACE your normalizeSkill + normalizeSkills with THIS

export const normalizeSkill = async (skillName) => {
  try {
    const raw = String(skillName || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();

    // 1) DB exact match (case-insensitive)
    let skill = await db('skills')
      .whereRaw('LOWER(name) = LOWER(?)', [raw])
      .first();
    if (skill) return skill.name;

    // 2) DB alias match (case-insensitive)
    const skills = await db('skills').select('name', 'aliases');
    for (const s of skills) {
      const aliases = safeParseArray(s.aliases).map(a => String(a).toLowerCase());
      if (aliases.includes(lower)) return s.name;
    }

    // 3) Quick fallback aliases for common variants
    const FALLBACK_ALIASES = {
      englisch: 'English',
      english: 'English',
      deutsch: 'German',
      german: 'German',
      'react.js': 'React',
      reactjs: 'React',
      nodejs: 'Node.js',
      'node js': 'Node.js',
      ai: 'Artificial Intelligence',
      ml: 'Machine Learning',
      'machine learning': 'Machine Learning',
    };
    if (FALLBACK_ALIASES[lower]) return FALLBACK_ALIASES[lower];

    // 4) Fallback to static seed list (initialSkillData)
    for (const category of Object.values(initialSkillData)) {
      for (const item of category) {
        if (String(item.name).toLowerCase() === lower) return item.name;
        const itemAliases = (item.aliases || []).map(a => String(a).toLowerCase());
        if (itemAliases.includes(lower)) return item.name;
      }
    }

    // 5) Return original if still unknown
    return raw;
  } catch (error) {
    console.error('Error normalizing skill:', error);
    return skillName;
  }
};

export const normalizeSkills = async (skills = []) => {
  const mapped = await Promise.all((skills || []).map(normalizeSkill));
  const seen = new Set();
  return mapped.filter(s => {
    const v = String(s || '').trim();
    if (!v) return false;
    const k = v.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
