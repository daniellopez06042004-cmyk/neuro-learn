// Checks course.json and every lesson with the same rules the app uses
// (src/validate.js). Run by dev/check.sh with macOS's built-in JavaScript
// engine; prints problems and exits non-zero if there are any.
// Extra arguments are the lesson files on disk, so unlisted files get noticed.

import { validateCourse, validateLesson, validatePulse, validateGlossary } from '../src/validate.js';

const problems = [], notes = [];
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
      const term = (m[2] || m[1]).trim();
      if (!known.has(term.toLowerCase())) notes.push(`lessons/${id}.json links [[${term}]], which isn't in glossary.json yet.`);
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
