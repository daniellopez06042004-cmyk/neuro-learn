// Loads course.json and every lesson it lists, validates them, and answers
// questions like "is this unit unlocked?" that need both content and progress.

import { validateCourse, validateLesson, validatePulse, validateGlossary, validateSlides, validateQuizPool } from './validate.js';
import { progress, settings } from './progress.js';

const CONTENT = 'content/';

export const content = {
  course: null,
  errors: [],          // every problem found, for the dev error screen
  units: new Map(),    // unitId -> { unit, track }
  lessons: new Map(),  // lessonId -> { status: 'ok' | 'missing' | 'broken', data, errors, unitId }
  tracks: [],
  pulse: [],           // Field Pulse papers, newest first
  glossary: new Map(), // lower-case term or alias -> { term, aliases, definition, track }
  slides: new Map(),   // unitId -> its slides.json entry (what the unit's specimen slide shows)
  quiz: { xp: 25, questions: new Map() }, // weekly-quiz pool: question id -> question
};

export async function loadContent() {
  let res;
  try {
    res = await fetch(CONTENT + 'course.json', { cache: 'no-cache' });
  } catch {
    throw new Error("Couldn't load content/course.json. Check your connection and try again.");
  }
  if (!res.ok) throw new Error(`content/course.json returned ${res.status}.`);
  let course;
  try { course = JSON.parse(await res.text()); } catch (e) { throw new Error(`content/course.json is not valid JSON: ${e.message}`); }

  const courseErrors = validateCourse(course);
  content.course = course;
  content.tracks = (course.tracks || []).map((t) => ({ ...t, color: t.color || '#1D9E75', units: t.units || [] }));
  content.errors = [...courseErrors];
  for (const track of content.tracks) {
    for (const unit of track.units) {
      unit.prereqs = Array.isArray(unit.prereqs) ? unit.prereqs : [];
      unit.lessons = Array.isArray(unit.lessons) ? unit.lessons.filter((id) => typeof id === 'string') : [];
      content.units.set(unit.id, { unit, track });
    }
  }

  const jobs = [];
  for (const { unit } of content.units.values()) {
    for (const id of unit.lessons) jobs.push(loadLesson(id, unit.id));
  }
  jobs.push(loadOptional('pulse.json', validatePulse, (d) => {
    content.pulse = [...d.items].sort((a, b) => b.date.localeCompare(a.date));
  }));
  jobs.push(loadOptional('glossary.json', validateGlossary, (d) => {
    for (const t of d.terms) for (const name of [t.term, ...(t.aliases || [])]) content.glossary.set(name.toLowerCase(), t);
  }));
  jobs.push(loadOptional('slides.json', validateSlides, (d) => {
    for (const s of d.slides) content.slides.set(s.unit, s);
  }));
  jobs.push(loadOptional('quiz-pool.json', (d) => validateQuizPool(d, new Set(content.units.keys())), (d) => {
    content.quiz.xp = d.xp ?? 25;
    for (const q of d.questions) content.quiz.questions.set(q.id, q);
  }));
  await Promise.all(jobs);
  // ?dev with no slides.json yet: preview the slide box with the sample slides.
  if (!content.slides.size && new URLSearchParams(location.search).has('dev')) {
    try { for (const s of (await (await fetch('dev/sample-slides.json')).json()).slides) content.slides.set(s.unit, s); } catch { /* no samples */ }
  }
  return content;
}

// pulse.json and glossary.json are optional; problems are reported like lesson errors.
async function loadOptional(file, validate, use) {
  let res;
  try { res = await fetch(CONTENT + file, { cache: 'no-cache' }); } catch { return; }
  if (!res.ok) return;
  let data;
  try { data = JSON.parse(await res.text()); } catch (e) { content.errors.push(`${file} is not valid JSON: ${e.message}`); return; }
  const errs = validate(data);
  content.errors.push(...errs);
  if (!errs.length) use(data);
}

async function loadLesson(id, unitId) {
  const entry = { status: 'missing', data: null, errors: [], unitId };
  content.lessons.set(id, entry);
  let res;
  try { res = await fetch(`${CONTENT}lessons/${encodeURIComponent(id)}.json`, { cache: 'no-cache' }); } catch { return; }
  if (!res.ok) return; // not written yet (404) — shown as "coming soon"
  let data;
  try {
    data = JSON.parse(await res.text());
  } catch (e) {
    entry.status = 'broken';
    entry.errors = [`lessons/${id}.json is not valid JSON: ${e.message}`];
    content.errors.push(...entry.errors);
    return;
  }
  entry.data = data;
  entry.errors = validateLesson(data, id, unitId);
  entry.status = entry.errors.length ? 'broken' : 'ok';
  content.errors.push(...entry.errors);
}

// ---------- Derived state ----------

export const playable = (id) => content.lessons.get(id)?.status === 'ok';

export function unitLessons(unit) {
  return unit.lessons.map((id) => ({ id, ...content.lessons.get(id) }));
}

// A unit is complete once it has at least one written lesson and you've
// finished every written one. Unwritten lessons don't block you.
export function unitStats(unit) {
  const ready = unit.lessons.filter(playable);
  const done = ready.filter((id) => progress.isComplete(id));
  return { total: ready.length, done: done.length, complete: ready.length > 0 && done.length === ready.length };
}

// Slides: a unit's slide is earned the first time the unit is complete, and kept
// even if lessons are added later. Returns the units that just earned one.
// Backfilled slides are dated by the unit's last finished lesson.
export function syncSlides() {
  const fresh = [];
  for (const { unit } of content.units.values()) {
    if (progress.slideDate(unit.id) || !unitStats(unit).complete) continue;
    const dates = unit.lessons.map((id) => progress.state.completed[id]?.date).filter(Boolean).sort();
    progress.earnSlide(unit.id, dates.at(-1));
    fresh.push(unit.id);
  }
  return fresh;
}

// A prereq with no written lessons yet can't be finished, so it doesn't block.
export function unitUnlocked(unit) {
  if (settings.get('unlockAll')) return true;
  return unit.prereqs.every((p) => {
    const u = content.units.get(p)?.unit;
    if (!u) return true;
    const stats = unitStats(u);
    return stats.total === 0 || stats.complete;
  });
}

// Within a unit, lessons open one after another.
export function lessonUnlocked(unit, lessonId) {
  if (!unitUnlocked(unit)) return false;
  if (settings.get('unlockAll')) return true;
  for (const id of unit.lessons) {
    if (id === lessonId) return true;
    if (playable(id) && !progress.isComplete(id)) return false;
  }
  return true;
}

// Prereqs still standing between you and this unit.
export function blockingPrereqs(unit) {
  return unit.prereqs.filter((p) => {
    const u = content.units.get(p)?.unit;
    if (!u) return false;
    const stats = unitStats(u);
    return stats.total > 0 && !stats.complete;
  });
}

export function nextLessonIn(unit) {
  return unit.lessons.find((id) => playable(id) && !progress.isComplete(id) && lessonUnlocked(unit, id)) || null;
}

export function dueCountForUnit(unit) {
  const due = new Set(progress.dueKeys().map((k) => k.split(':')[0]));
  return unit.lessons.filter((id) => due.has(id)).length;
}

export function findStep(key) {
  if (key.startsWith('quiz:')) { // a weekly-quiz question
    const step = content.quiz.questions.get(key.slice(5));
    return step ? { key, lessonId: 'quiz', step, lesson: null, color: quizColor(step) } : null;
  }
  const i = key.lastIndexOf(':');
  const lessonId = key.slice(0, i), stepId = key.slice(i + 1);
  const entry = content.lessons.get(lessonId);
  if (entry?.status !== 'ok') return null;
  const step = entry.data.steps.find((s) => s.id === stepId);
  if (!step || step.type === 'concept') return null;
  const { track } = content.units.get(entry.unitId) || {};
  return { key, lessonId, step, lesson: entry.data, color: track?.color };
}

// A quiz question takes the colour of the first unit it draws on.
export function quizColor(q) {
  return content.units.get(q.needs?.[0])?.track.color || '#1D9E75';
}

export function lessonTrack(lessonId) {
  const entry = content.lessons.get(lessonId);
  return content.units.get(entry?.unitId) || {};
}

export function imageUrl(src) {
  return /^(https?:)?\/\//.test(src) || src.startsWith('/') ? src : CONTENT + src;
}
