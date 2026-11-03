// The weekly quiz: a handful of hard, cross-track questions you haven't seen,
// drawn from content/quiz-pool.json. A question can appear once you've
// finished every unit it "needs". Each week (from Monday) gets one quiz, fixed
// when it's first built, so it doesn't change as you finish more units.

import { content, unitStats } from './content.js';
import { progress, settings, today, addDays } from './progress.js';

export const QUIZ_SIZE = 6;
export const QUIZ_MIN = 3; // fewer ready questions than this: no quiz yet

// The Monday that starts this week, as "YYYY-MM-DD".
export function weekOf(date = today()) {
  const [y, m, d] = date.split('-').map(Number);
  const back = (new Date(y, m - 1, d).getDay() + 6) % 7; // days since Monday
  return addDays(date, -back);
}

const unitDone = (id) => {
  const u = content.units.get(id)?.unit;
  return Boolean(u) && unitStats(u).complete;
};
export const questionReady = (q) => settings.get('unlockAll') || q.needs.every(unitDone);
const tracksOf = (q) => new Set(q.needs.map((u) => content.units.get(u)?.track.id));

// Same order all week, different each week, without storing a seed.
function shuffle(list, seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  return list.map((x) => [rand(), x]).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
}

// This week's quiz: { week, questions, done, correct, graded }, or
// { week, locked: true, ready, needed } when not enough questions are open yet,
// or null if the pool is empty.
export function weeklyQuiz() {
  const pool = content.quiz.questions;
  if (!pool.size) return null;
  const week = weekOf();
  const saved = progress.quiz(week);
  if (saved) {
    const questions = saved.ids.map((id) => pool.get(id)).filter(Boolean);
    if (questions.length) return { week, ...saved, questions };
  }
  const seen = progress.quizSeen();
  const ready = [...pool.values()].filter((q) => !seen.has(q.id) && questionReady(q));
  if (ready.length < QUIZ_MIN) return { week, locked: true, ready: ready.length, needed: QUIZ_MIN };
  // Questions that span more than one track first, then the rest.
  const picked = shuffle(ready, week).sort((a, b) => (tracksOf(b).size > 1) - (tracksOf(a).size > 1)).slice(0, QUIZ_SIZE);
  const rec = { ids: picked.map((q) => q.id), done: false };
  progress.saveQuiz(week, rec);
  return { week, ...rec, questions: picked };
}

export function finishQuiz(week, correct, graded) {
  const rec = progress.quiz(week);
  if (!rec) return;
  const first = !rec.done;
  progress.saveQuiz(week, { ...rec, done: true, correct, graded, date: today() });
  return first;
}

// Track letters a quiz draws on, e.g. "A, C and D".
export function quizTracks(questions) {
  const ids = [...new Set(questions.flatMap((q) => [...tracksOf(q)]))].filter(Boolean).sort();
  return ids.length > 1 ? `${ids.slice(0, -1).join(', ')} and ${ids.at(-1)}` : ids[0] || '';
}
