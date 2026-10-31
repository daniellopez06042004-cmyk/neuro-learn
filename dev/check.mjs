// Checks course.json and every lesson with the same rules the app uses
// (src/validate.js). Run by dev/check.sh with macOS's built-in JavaScript
// engine; prints problems and exits non-zero if there are any.
// Extra arguments are the lesson files on disk, so unlisted files get noticed.

import { validateCourse, validateLesson } from '../src/validate.js';

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
  print(`Checked course.json and ${written} lesson file${written === 1 ? '' : 's'}.`);
}

for (const n of notes) print(`Note: ${n}`);
if (problems.length) {
  print(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
  for (const p of problems) print(`  - ${p}`);
  quit(1);
}
print('No problems found.');
