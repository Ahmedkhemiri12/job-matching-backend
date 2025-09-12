/**
 * server/services/skillExtractor.js  (v5)
 * DB-free skill extraction with Unicode-safe boundaries and German/general aliases.
 * Robust against PDF hyphenation and dotted/spaced variants (e.g., "Node.js" vs "Node js").
 * Exports: extractSkillsFromText (array), extractSkills (alias), addSkillsToDatabase (no-op)
 */

// ---------- Normalization ----------
function normalizeText(raw = "") {
  return String(raw || "")
    .replace(/\u00AD/g, "")             // remove soft hyphen
    .replace(/-\s*\r?\n/g, "")          // join hyphenated linebreaks
    .replace(/\r/g, "\n")
    .replace(/[•▪◦·]/g, " ")            // bullets → space
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Catalogue ----------
const CATALOGUE = [
  // ===== Core dev stack =====
  // Languages
  { name: "JavaScript", aliases: ["javascript", "java script", "js", "ecmascript"] },
  { name: "TypeScript", aliases: ["typescript", "type script", "ts"] },
  { name: "Python", aliases: ["python"] },
  { name: "Java", aliases: ["java"] },
  { name: "C", aliases: ["c language", "ansi c", "c-lang"] },
  { name: "C++", aliases: ["c++", "cpp", "c plus plus"] },
  { name: "C#", aliases: ["c#", "c sharp", "c-sharp"] },
  { name: "Go", aliases: ["go", "golang"] },
  { name: "Rust", aliases: ["rust"] },
  { name: "PHP", aliases: ["php"] },
  { name: "Ruby", aliases: ["ruby"] },
  { name: "Swift", aliases: ["swift"] },
  { name: "Kotlin", aliases: ["kotlin"] },
  { name: "Dart", aliases: ["dart"] },
  { name: "SQL", aliases: ["sql"] },

  // Frontend
  { name: "HTML", aliases: ["html", "html5"] },
  { name: "CSS", aliases: ["css", "css3"] },
  { name: "Sass", aliases: ["sass", "scss"] },
  { name: "React", aliases: ["react", "reactjs", "react.js", "react js"] },
  { name: "React Native", aliases: ["react native"] },
  { name: "Next.js", aliases: ["next", "nextjs", "next.js", "next js"] },
  { name: "Angular", aliases: ["angular", "angularjs", "angular.js", "angular js"] },
  { name: "Vue.js", aliases: ["vue", "vuejs", "vue.js", "vue js"] },
  { name: "Svelte", aliases: ["svelte"] },
  { name: "Vite", aliases: ["vite"] },
  { name: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"] },
  { name: "Bootstrap", aliases: ["bootstrap"] },

  // Backend
  { name: "Node.js", aliases: ["node", "nodejs", "node.js", "node js"] },
  { name: "Express", aliases: ["express", "expressjs", "express.js", "express js"] },
  { name: "NestJS", aliases: ["nestjs", "nest.js", "nest js"] },
  { name: "Django", aliases: ["django"] },
  { name: "Flask", aliases: ["flask"] },
  { name: "FastAPI", aliases: ["fastapi", "fast api"] },
  { name: "Spring Boot", aliases: ["spring", "spring-boot", "spring boot"] },
  { name: ".NET", aliases: [".net", "dotnet", "asp.net", "asp net", "aspnet"] },
  { name: "GraphQL", aliases: ["graphql"] },
  { name: "REST", aliases: ["rest", "restful", "rest api", "restful api"] },

  // Databases
  { name: "PostgreSQL", aliases: ["postgres", "postgresql", "psql"] },
  { name: "MySQL", aliases: ["mysql", "maria db", "mariadb"] },
  { name: "SQLite", aliases: ["sqlite"] },
  { name: "MongoDB", aliases: ["mongodb", "mongo"] },
  { name: "Redis", aliases: ["redis"] },

  // DevOps / Cloud
  { name: "Docker", aliases: ["docker", "docker compose", "docker-compose"] },
  { name: "Kubernetes", aliases: ["k8s", "kubernetes"] },
  { name: "CI/CD", aliases: ["ci/cd", "cicd", "ci cd"] },
  { name: "GitHub Actions", aliases: ["github actions", "gh actions"] },
  { name: "GitLab CI", aliases: ["gitlab ci", "gitlab-ci", "gitlab ci/cd"] },
  { name: "AWS", aliases: ["aws", "amazon web services"] },
  { name: "GCP", aliases: ["gcp", "google cloud", "google cloud platform"] },
  { name: "Azure", aliases: ["azure", "microsoft azure"] },
  { name: "Linux", aliases: ["linux", "gnu/linux"] },
  { name: "Nginx", aliases: ["nginx"] },

  // ORMs / tools you use
  { name: "Prisma", aliases: ["prisma"] },
  { name: "Knex", aliases: ["knex", "knex.js", "knexjs"] },
  { name: "TypeORM", aliases: ["typeorm"] },

  // Testing
  { name: "Jest", aliases: ["jest"] },
  { name: "Vitest", aliases: ["vitest"] },
  { name: "Cypress", aliases: ["cypress"] },
  { name: "Playwright", aliases: ["playwright"] },

  // ===== General / German-friendly =====
  // Office suites & apps
  { name: "MS Office", aliases: ["microsoft office", "ms office"] },
  { name: "Excel", aliases: ["excel", "ms excel", "microsoft excel", "tabellenkalkulation"] },
  { name: "Word", aliases: ["word", "ms word", "microsoft word", "textverarbeitung"] },
  { name: "PowerPoint", aliases: ["powerpoint", "ms powerpoint", "microsoft powerpoint", "präsentation", "prasentation"] },
  { name: "Outlook", aliases: ["outlook", "microsoft outlook"] },

  // Google workspace
  { name: "Google Docs", aliases: ["google docs", "docs"] },
  { name: "Google Sheets", aliases: ["google sheets", "sheets", "tabellen", "tabellenkalkulation (google)"] },
  { name: "Google Slides", aliases: ["google slides", "slides"] },
  { name: "Google Drive", aliases: ["google drive", "drive"] },

  // AI / Data / Process
  { name: "Artificial Intelligence (AI)", aliases: [
      "ai", "artificial intelligence",
      "künstliche intelligenz", "kunstliche intelligenz", "ki", "ki-tools", "ki tools"
    ]},
  { name: "ChatGPT", aliases: ["chatgpt", "openai chatgpt", "gpt"] },
  { name: "Prompt Engineering", aliases: ["prompt engineering", "prompting"] },
  { name: "Data Analysis", aliases: ["data analysis", "datenanalyse", "auswertung"] },
  { name: "Data Management", aliases: ["data management", "datenverwaltung", "daten verwaltung", "datenmanagement"] },
  { name: "Office Administration", aliases: ["office administration", "büroverwaltung", "büroadministration", "office management"] },
  // --- Office suites & apps (you already have MS Office/Outlook/Google; keep these) ---
{ name: "Excel", aliases: ["excel", "ms excel", "microsoft excel", "tabellenkalkulation", "pivot", "vlookup"] },
{ name: "Word", aliases: ["word", "ms word", "microsoft word", "textverarbeitung"] },
{ name: "PowerPoint", aliases: ["powerpoint", "ms powerpoint", "microsoft powerpoint", "präsentation", "prasentation"] },

// --- Communication & collaboration tools ---
{ name: "Microsoft Teams", aliases: ["microsoft teams", "ms teams"] },
{ name: "Zoom", aliases: ["zoom"] },
{ name: "Google Meet", aliases: ["google meet"] },
{ name: "Slack", aliases: ["slack"] },

// --- Reception / Front Office / Phone ---
{ name: "Reception / Front Office", aliases: ["empfang", "rezeption", "front office", "telefonzentrale", "reception"] },
{ name: "Phone Support", aliases: ["telefonsupport", "hotline", "callcenter", "call center", "telefonischer support"] },

// --- Scheduling / Calendar / Meetings ---
{ name: "Scheduling", aliases: ["terminplanung", "terminierung", "termin koordination", "termin-koordination", "kalenderverwaltung", "kalenderpflege"] },
{ name: "Meeting Minutes", aliases: ["protokoll", "protokollführung", "besprechungsprotokoll"] },

// --- Documents & data admin ---
{ name: "Document Management", aliases: ["dokumentenverwaltung", "ablage", "aktenführung", "dateiverwaltung"] },
{ name: "Data Entry", aliases: ["datenerfassung", "dateneingabe", "datenpflege"] },
{ name: "Reporting", aliases: ["reporting", "berichte", "berichtswesen", "reports"] },

// --- CRM & Ticketing ---
{ name: "CRM", aliases: ["crm", "kundenbeziehungsmanagement", "salesforce", "hubspot"] },
{ name: "Ticketing", aliases: ["ticketsystem", "ticketing", "zendesk", "freshdesk", "otrs", "jira service management", "servicedesk"] },

// --- Troubleshooting & QA ---
{ name: "Troubleshooting", aliases: ["troubleshooting", "fehlersuche", "störungsbeseitigung", "problembehebung", "stoerungsbeseitigung"] },
{ name: "Quality Assurance", aliases: ["qualitätssicherung", "qa"] },

// --- Customer-facing & soft skills ---
{ name: "Customer Service", aliases: ["kundendienst", "kundenservice", "kundenbetreuung", "customer service"] },
{ name: "Communication", aliases: [
  "kommunikation", "professionelle kommunikation",
  "schriftliche kommunikation", "mündliche kommunikation",
  "verbal communication", "written communication", "email kommunikation"
]},
{ name: "Email Correspondence", aliases: ["e-mail", "email", "e-mail-korrespondenz", "e-mail korrespondenz", "mailverkehr", "schriftverkehr"] },
{ name: "Organization", aliases: ["organisation", "organisationsfähigkeit", "organizational skills"] },
{ name: "Time Management", aliases: ["zeitmanagement", "deadline management", "termintreue", "time management"] },
{ name: "Attention to Detail", aliases: ["detailorientiert", "detail-orientiert", "genauigkeit", "attention to detail"] },

// --- Social / Content (useful for entry roles) ---
{ name: "Canva", aliases: ["canva"] },
{ name: "Instagram", aliases: ["instagram"] },
{ name: "TikTok", aliases: ["tiktok", "tik tok"] },
{ name: "Facebook", aliases: ["facebook"] },

  // Communication / Soft skills
  { name: "Communication", aliases: [
      "communication", "kommunikation", "professionelle kommunikation",
      "schriftliche kommunikation", "mündliche kommunikation", "telefonische kommunikation",
      "verbal communication", "written communication"
    ]},
  { name: "Customer Service", aliases: ["customer service", "kundendienst", "kundenservice", "kundenbetreuung"] },
  { name: "Teamwork", aliases: ["teamwork", "teamarbeit", "teamfähigkeit", "team player"] },
  { name: "Problem Solving", aliases: ["problem solving", "problemlösung", "problemlösungsfähigkeit", "analytisches denken"] },
  { name: "Time Management", aliases: ["time management", "zeitmanagement", "deadline management", "termintreue"] },
  { name: "Adaptability", aliases: ["adaptability", "anpassungsfähigkeit", "flexibilität"] },
  { name: "Organization", aliases: ["organisation", "organizational skills", "organisationsfähigkeit"] },
  { name: "Attention to Detail", aliases: ["attention to detail", "detailorientiert", "detail-orientiert", "genauigkeit"] },
  { name: "Leadership", aliases: ["leadership", "führung", "führungskompetenz"] },
  { name: "Project Management", aliases: ["project management", "projektmanagement", "scrum", "kanban", "agile", "agil"] },

  // Sales / Marketing / Social
  { name: "Sales", aliases: ["sales", "vertrieb", "verkauf"] },
  { name: "Marketing", aliases: ["marketing"] },
  { name: "Social Media", aliases: ["social media", "soziale medien", "content erstellung", "content-erstellung"] },

  // Languages
  { name: "Arabic", aliases: ["arabic", "arabisch", "arabe"] },
  { name: "English", aliases: ["english", "englisch"] },
  { name: "German", aliases: ["german", "deutsch"] },
  { name: "French", aliases: ["french", "französisch", "franzosisch", "francais"] },

  
];

// ---------- Regex helpers ----------
// Allow space, hyphen, underscore, dot, slash between tokens
const SEP = "[-_\\s./]*";

// Escape regex specials
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Unicode-safe “word-ish” boundaries (no lookbehind): treat any Unicode letter/number as word chars
function aliasToRegex(alias) {
  const raw = String(alias || "").trim().toLowerCase();
  if (!raw) return /$a/; // never matches
  const tokens = raw.split(/[\s._/-]+/).filter(Boolean).map(escapeRegExp);
  const pattern = tokens.join(SEP);
  // Use \p{L}\p{N} with the 'u' flag so umlauts etc. are handled
  return new RegExp(String.raw`(?:^|[^\p{L}\p{N}+#.])(${pattern})(?=[^\p{L}\p{N}+#.]|$)`, "iu");
}

// Precompute
const INDEX = CATALOGUE.map((item) => ({
  name: item.name,
  matchers: item.aliases.map(aliasToRegex),
}));

// ---------- Public API ----------
export function extractSkillsFromText(raw = "") {
  const text = normalizeText(raw);
  if (!text) return [];

  const found = new Set();
  const debug = process.env.SKILL_DEBUG === "true";
  const matches = [];

  for (const { name, matchers } of INDEX) {
    for (const rx of matchers) {
      if (rx.test(text)) {
        found.add(name);
        if (debug) matches.push(name);
        break;
      }
    }
  }

  if (debug) {
    console.log("SKILL_DEBUG matches:", Array.from(new Set(matches)).sort());
    console.log("SKILL_DEBUG sample:", text.slice(0, 600));
  }

  return Array.from(found).sort();
}

export const extractSkills = extractSkillsFromText;
export async function addSkillsToDatabase() { return; }
export default { extractSkillsFromText, extractSkills, addSkillsToDatabase };
