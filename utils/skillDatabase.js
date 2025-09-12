// server/utils/skillDatabase.js
// Robust skill helpers with DB-offline guard + safe fallbacks.
// Works even if DATABASE_URL/PGHOST are misconfigured.

import db from '../db/database.js';

/* ------------------------------ Helpers ------------------------------ */

// Be tolerant of bad JSON / non-array shapes.
function safeParseArray(value) {
  try {
    const v = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Detect if DB creds exist (DATABASE_URL or full PG* set)
function isDbConfigured() {
  if (process.env.DATABASE_URL) return true;
  const need = ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
  return need.every((k) => (process.env[k] || '').trim().length > 0);
}

// One switch to run in DB-less mode
const DB_OFFLINE =
  process.env.SKILLS_DB_OFFLINE === 'true' || !isDbConfigured();

/* --------------------------- Seed / Static data --------------------------- */
// (kept from your file; used for fallback lookups & initial seeding)
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

// Back-compat export (kept as in your file)
export const skillDatabase = initialSkillData;

/* ----------------------------- DB-backed APIs ----------------------------- */

export const getSkillsFromDatabase = async () => {
  if (DB_OFFLINE) return {};
  try {
    const skills = await db('skills').select('*');
    const byCat = {};
    for (const skill of skills) {
      if (!byCat[skill.category]) byCat[skill.category] = [];
      byCat[skill.category].push({
        name: skill.name,
        aliases: safeParseArray(skill.aliases),
      });
    }
    return byCat;
  } catch (error) {
    console.error('Error fetching skills from database (ignored):', error?.message || error);
    return {};
  }
};

export const getSkillsByCategory = async (category) => {
  if (DB_OFFLINE) return [];
  try {
    const skills = await db('skills').where('category', category).select('*');
    return skills.map((s) => ({
      name: s.name,
      aliases: safeParseArray(s.aliases),
    }));
  } catch (error) {
    console.error('Error fetching skills by category (ignored):', error?.message || error);
    return [];
  }
};

export const findSkillByName = async (skillName) => {
  if (DB_OFFLINE) return null;
  try {
    const skill = await db('skills').where('name', 'ilike', `%${skillName}%`).first();
    if (skill) skill.aliases = safeParseArray(skill.aliases);
    return skill || null;
  } catch (error) {
    console.error('Error finding skill (ignored):', error?.message || error);
    return null;
  }
};

export const addSkillWithAliases = async (name, category, aliases = []) => {
  if (DB_OFFLINE) {
    console.warn('addSkillWithAliases skipped: DB_OFFLINE');
    return null;
  }
  try {
    const safeAliases = safeParseArray(aliases);
    const [row] = await db('skills')
      .insert({
        name,
        category,
        aliases: JSON.stringify(safeAliases),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('id');
    return row?.id ?? row ?? null;
  } catch (error) {
    console.error('Error adding skill (ignored):', error?.message || error);
    return null;
  }
};

// Deprecated, kept for compatibility
export const getTargetSkillsDB = (_role) => {
  console.warn('getTargetSkillsDB is deprecated. Skills should come from job requirements.');
  return [];
};

/* ---------------------- Normalization (DB + Fallbacks) --------------------- */

// Common fallback aliases when DB is offline/unavailable
const FALLBACK_ALIASES_MAP = {
  // Web core
  'html': 'HTML',
  'html5': 'HTML',
  'css': 'CSS',
  'css3': 'CSS',
  'sass': 'Sass',
  'scss': 'Sass',

  // JS/TS
  'javascript': 'JavaScript',
  'java script': 'JavaScript',
  'js': 'JavaScript',
  'typescript': 'TypeScript',
  'type script': 'TypeScript',
  'ts': 'TypeScript',

  // React/Next
  'react': 'React',
  'reactjs': 'React',
  'react.js': 'React',
  'react js': 'React',
  'next': 'Next.js',
  'nextjs': 'Next.js',
  'next.js': 'Next.js',
  'next js': 'Next.js',

  // Node/Express
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'node js': 'Node.js',
  'express': 'Express',
  'expressjs': 'Express',
  'express.js': 'Express',
  'express js': 'Express',

  // DB / Infra / Cloud
  'sql': 'SQL',
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'psql': 'PostgreSQL',
  'mongodb': 'MongoDB',
  'mongo': 'MongoDB',
  'redis': 'Redis',
  'docker': 'Docker',
  'docker compose': 'Docker',
  'docker-compose': 'Docker',
  'k8s': 'Kubernetes',
  'kubernetes': 'Kubernetes',
  'aws': 'AWS',
  'amazon web services': 'AWS',
  'gcp': 'Google Cloud',
  'google cloud': 'Google Cloud',
  'google cloud platform': 'Google Cloud',
  'azure': 'Azure',

  // .NET / C-family
  '.net': '.NET',
  'dotnet': '.NET',
  'asp.net': '.NET',
  'asp net': '.NET',
  'c#': 'C#',
  'c sharp': 'C#',
  'c-sharp': 'C#',
  'c++': 'C++',
  'cpp': 'C++',

  // Tools
  'git': 'Git',
  'github': 'Git',
  'gitlab': 'Git',
  'bitbucket': 'Git',
};

export const normalizeSkill = async (skillName) => {
  try {
    const raw = String(skillName || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();

    // Try DB only if configured
    if (!DB_OFFLINE) {
      try {
        // Exact canonical name (case-insensitive)
        const exact = await db('skills')
          .whereRaw('LOWER(name) = ?', [lower])
          .first();
        if (exact?.name) return exact.name;

        // Alias match across all skills
        const rows = await db('skills').select('name', 'aliases');
        for (const row of rows) {
          const aliases = safeParseArray(row.aliases).map((a) => String(a).toLowerCase());
          if (aliases.includes(lower)) return row.name;
        }
      } catch (e) {
        // Swallow DB errors and continue to fallback
        console.error('DB normalize error (ignored):', e?.message || e);
      }
    }

    // Fallback alias map
    if (FALLBACK_ALIASES_MAP[lower]) return FALLBACK_ALIASES_MAP[lower];

    // Fallback to static seed list
    for (const category of Object.values(initialSkillData)) {
      for (const item of category) {
        if (String(item.name).toLowerCase() === lower) return item.name;
        const itemAliases = (item.aliases || []).map((a) => String(a).toLowerCase());
        if (itemAliases.includes(lower)) return item.name;
      }
    }

    // Unknown → return original string
    return raw;
  } catch (err) {
    console.error('Error normalizing skill (fallback to raw):', err?.message || err);
    return skillName;
  }
};

export const normalizeSkills = async (skills = []) => {
  const mapped = await Promise.all((skills || []).map(normalizeSkill));
  const seen = new Set();
  return mapped.filter((s) => {
    const v = String(s || '').trim();
    if (!v) return false;
    const k = v.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
