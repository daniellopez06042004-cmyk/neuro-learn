// Loads course.json and every lesson it lists, validates them, and answers
// questions like "is this unit unlocked?" that need both content and progress.

import { validateCourse, validateLesson } from './validate.js';
import { progress, settings } from './progress.js';

const CONTENT = 'content/';

export const content = {
  course: null,
  errors: [],          // every problem found, for the dev error screen
  units: new Map(),    // unitId -> { unit, track }
  lessons: new Map(),  // lessonId -> { status: 'ok' | 'missing' | 'broken', data, errors, unitId }
  tracks: [],
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
  await Promise.all(jobs);
  return content;
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

export function unitUnlocked(unit) {
  if (settings.get('unlockAll')) return true;
  return unit.prereqs.every((p) => {
    const u = content.units.get(p)?.unit;
    return !u || unitStats(u).complete;
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

export function nextLessonIn(unit) {
  return unit.lessons.find((id) => playable(id) && !progress.isComplete(id) && lessonUnlocked(unit, id)) || null;
}

export function dueCountForUnit(unit) {
  const due = new Set(progress.dueKeys().map((k) => k.split(':')[0]));
  return unit.lessons.filter((id) => due.has(id)).length;
}

export function findStep(key) {
  const i = key.lastIndexOf(':');
  const lessonId = key.slice(0, i), stepId = key.slice(i + 1);
  const entry = content.lessons.get(lessonId);
  if (entry?.status !== 'ok') return null;
  const step = entry.data.steps.find((s) => s.id === stepId);
  if (!step || step.type === 'concept') return null;
  const { track } = content.units.get(entry.unitId) || {};
  return { key, lessonId, step, lesson: entry.data, color: track?.color };
}

export function lessonTrack(lessonId) {
  const entry = content.lessons.get(lessonId);
  return content.units.get(entry?.unitId) || {};
}

export function imageUrl(src) {
  return /^(https?:)?\/\//.test(src) || src.startsWith('/') ? src : CONTENT + src;
}
