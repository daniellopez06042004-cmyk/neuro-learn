// Checks course.json and every lesson with the same rules the app uses
// (src/validate.js). Run by dev/check.sh with macOS's built-in JavaScript
// engine; prints problems and exits non-zero if there are any.
// Extra arguments are the lesson files on disk, so unlisted files get noticed.

import { validateCourse, validateLesson, validatePulse, validateGlossary } from '../src/validate.js';

const problems = [], notes = [];

// Two SVG mistakes that render wrong without any error (found by the Project):
//  1. an element with a transform="" attribute whose class animates `transform`:
//     the CSS animation replaces the attribute, so the element jumps to (0,0)
//  2. <text fill="…"> while a `text { fill: … }` rule exists: the rule wins,
//     so the color is ignored (use style="fill:…" instead)
function lintSvg(svg) {
  const found = [];
  const css = [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  const movingFrames = new Set([...css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^}]*\})*)\s*\}/g)]
    .filter((m) => /transform|offset-distance/.test(m[2])).map((m) => m[1]));
  const movingClasses = new Set();
  for (const m of css.matchAll(/([^{}@]+)\{([^}]*)\}/g)) {
    const anim = /animation(?:-name)?\s*:\s*([^;]+)/.exec(m[2]);
    if (!anim || ![...movingFrames].some((k) => new RegExp(`\\b${k}\\b`).test(anim[1]))) continue;
    for (const sel of m[1].split(',')) for (const c of sel.matchAll(/\.([\w-]+)/g)) movingClasses.add(c[1]);
  }
  for (const m of svg.matchAll(/<(\w+)\s([^>]*)>/g)) {
    const cls = /\bclass="([^"]+)"/.exec(m[2]);
    if (/\btransform="/.test(m[2]) && cls && cls[1].split(/\s+/).some((c) => movingClasses.has(c))) {
      found.push(`<${m[1]} class="${cls[1]}"> has a transform attribute and an animated transform; wrap it in an outer <g transform> instead`);
    }
  }
  if (/(^|[\s,}])text\s*(,[^{]*)?\{[^}]*\bfill\s*:/.test(css)) {
    const n = [...svg.matchAll(/<text\b[^>]*\sfill="/g)].length;
    if (n) found.push(`${n} <text> element${n === 1 ? ' has' : 's have'} a fill="" attribute, but a text { fill } rule overrides it; use style="fill:…"`);
  }
  return found;
}
const readJson = (path) => {
  let text;
  try { text = read(path); } catch { return { missing: true }; }
  try { return { data: JSON.parse(text) }; } catch (e) { return { error: `${path} is not valid JSON: ${e.message}` }; }
};

const course = readJson('content/course.json');
if (course.missing || course.error) {
  problems.push(course.error || 'content/course.json is missing');
} else {
  problems.push(...validateCourse(course.data));
  const listed = new Set();
  const linted = new Set();
  let written = 0;
  for (const t of course.data.tracks || []) {
    for (const u of t.units || []) {
      for (const id of u.lessons || []) {
        listed.add(id);
        const lesson = readJson(`content/lessons/${id}.json`);
        if (lesson.missing) continue; // not written yet: fine
        if (lesson.error) { problems.push(lesson.error); continue; }
        written++;
        problems.push(...validateLesson(lesson.data, id, u.id));
        // Visuals and images must point at real files.
        for (const st of lesson.data.steps || []) {
          for (const src of [st?.visual?.src, typeof st?.image === 'string' ? st.image : st?.image?.src]) {
            if (typeof src !== 'string' || /^(https?:)?\/\//.test(src)) continue;
            let text;
            try { text = read(`content/${src}`); } catch { problems.push(`lessons/${id}.json › ${st.id}: "${src}" isn't in content/`); continue; }
            if (src.endsWith('.svg') && !linted.has(src)) {
              linted.add(src);
              for (const msg of lintSvg(text)) problems.push(`${src}: ${msg}`);
            }
          }
        }
      }
    }
  }
  for (const file of (typeof arguments !== 'undefined' ? arguments : [])) {
    const id = file.replace(/^.*\//, '').replace(/\.json$/, '');
    if (!listed.has(id)) notes.push(`content/lessons/${id}.json isn't listed in course.json, so the app won't show it.`);
  }

  // Optional files.
  const pulse = readJson('content/pulse.json');
  if (pulse.error) problems.push(pulse.error);
  else if (pulse.data) problems.push(...validatePulse(pulse.data));
  const glossary = readJson('content/glossary.json');
  const known = new Set();
  if (glossary.error) problems.push(glossary.error);
  else if (glossary.data) {
    problems.push(...validateGlossary(glossary.data));
    for (const t of glossary.data.terms || []) for (const n of [t.term, ...(t.aliases || [])]) if (typeof n === 'string') known.add(n.toLowerCase());
  }
  // [[term]] links in lessons should point at glossary entries.
  for (const id of listed) {
    let text;
    try { text = read(`content/lessons/${id}.json`); } catch { continue; }
    for (const m of text.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)) {
      const sides = [m[1], m[2]].filter(Boolean).map((x) => x.trim());
      if (!sides.some((x) => known.has(x.toLowerCase()))) notes.push(`lessons/${id}.json links [[${m[1]}${m[2] ? `|${m[2]}` : ''}]], but neither side is in glossary.json yet.`);
    }
  }
  print(`Checked course.json, ${written} lesson file${written === 1 ? '' : 's'}, pulse.json and glossary.json.`);
}

for (const n of notes) print(`Note: ${n}`);
if (problems.length) {
  print(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
  for (const p of problems) print(`  - ${p}`);
  quit(1);
}
print('No problems found.');
