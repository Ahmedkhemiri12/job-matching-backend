// server/utils/matching.js

// lightweight alias map (DB aliases still applied via normalizeSkills)
const ALIASES = {
  js: "javascript",
  "nodejs": "node.js",
  "node js": "node.js",
  ts: "typescript",
  reactjs: "react",
  "react.js": "react",

  // languages & ML synonyms
  englisch: "english",
  deutsch: "german",
  ml: "machine learning",
  "machine learning": "machine learning",
  ai: "artificial intelligence",
};


export function normalizeSkill(s) {
  if (!s) return "";
  let x = String(s).trim().toLowerCase();
  x = x.replace(/[\u2010-\u2015]/g, "-"); // normalize hyphens
  x = x.replace(/\s+/g, " ");
  x = x.replace(/[(),]/g, "");
  if (ALIASES[x]) return ALIASES[x];
  return x;
}

export function normalizeList(list) {
  const arr = Array.isArray(list)
    ? list
    : String(list ?? "")
        .split(",")
        .map(v => v.trim())
        .filter(Boolean);

  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const n = normalizeSkill(item);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

export function intersect(a, b) {
  const B = new Set(b);
  return a.filter(x => B.has(x));
}

export function diff(a, b) {
  const B = new Set(b);
  return a.filter(x => !B.has(x));
}

/**
 * Weighted match score:
 *  - required skills: 80%
 *  - nice-to-have skills: 20%
 */
export function computeMatch(required = [], nice = [], candidate = []) {
  const R = new Set(required);
  const N = new Set(nice);
  const C = new Set(candidate);

  const requiredMatches = [...R].filter(s => C.has(s));
  const niceMatches     = [...N].filter(s => C.has(s));

  const requiredPct = R.size ? (requiredMatches.length / R.size) * 100 : 0;
  const nicePct     = N.size ? (niceMatches.length / N.size) * 100 : 0;

  const score = Math.round(requiredPct * 0.8 + nicePct * 0.2);

  return {
    score,
    requiredPct: Math.round(requiredPct),
    nicePct: Math.round(nicePct),
    requiredMatches,
    niceMatches,
    missingRequired: [...R].filter(s => !C.has(s)),
    // echo canonical lists for debugging
    candidate: [...C],
    required:  [...R],
    nice:      [...N],
  };
}
