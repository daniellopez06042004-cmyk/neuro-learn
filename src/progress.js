// Progress lives on the device (localStorage), never in the content files.
// Shape follows lesson-format.md: { completed, review, streak } plus bonusXp.

const KEY = 'neurolearn.progress.v1';
const SETTINGS_KEY = 'neurolearn.settings.v1';

// Leitner boxes 1–5. A correct answer moves a question up one box; a miss
// sends it back to box 1. The number is how many days until it's due again.
export const BOX_DAYS = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };
export const MAX_BOX = 5;

export function today(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return today(new Date(y, m - 1, d + n));
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

const empty = () => ({ completed: {}, review: {}, streak: { count: 0, last: null }, bonusXp: 0 });
let state = read(KEY, empty());
const save = () => write(KEY, state);

export const progress = {
  get state() { return state; },

  isComplete(lessonId) { return Boolean(state.completed[lessonId]); },

  totalXp() {
    return Object.values(state.completed).reduce((s, c) => s + (c.xp || 0), 0) + (state.bonusXp || 0);
  },

  // Streak counts only if you did something today or yesterday.
  streak() {
    const { count, last } = state.streak;
    if (!last) return 0;
    const t = today();
    return last === t || last === addDays(t, -1) ? count : 0;
  },
  didToday() { return state.streak.last === today(); },

  bumpStreak() {
    const t = today();
    const { count, last } = state.streak;
    if (last === t) return;
    state.streak = { count: last === addDays(t, -1) ? count + 1 : 1, last: t };
    save();
  },

  completeLesson(lessonId, xp) {
    if (state.completed[lessonId]) {
      state.bonusXp = (state.bonusXp || 0) + Math.ceil(xp / 2); // replay = half XP
    } else {
      state.completed[lessonId] = { xp, date: today() };
    }
    this.bumpStreak();
    save();
  },

  addBonusXp(n) { state.bonusXp = (state.bonusXp || 0) + n; save(); },

  // key = "lessonId:stepId"
  recordAnswer(key, correct) {
    const prev = state.review[key];
    const box = correct ? Math.min(MAX_BOX, (prev?.box || 0) + 1) : 1;
    // A miss is due again right away so it shows up in today's review.
    const due = correct ? addDays(today(), BOX_DAYS[box]) : today();
    state.review[key] = { box, due };
    save();
  },

  dueKeys(on = today()) {
    return Object.entries(state.review)
      .filter(([, r]) => r.due <= on)
      .sort((a, b) => a[1].box - b[1].box || a[1].due.localeCompare(b[1].due))
      .map(([k]) => k);
  },

  nextDueDate() {
    const dates = Object.values(state.review).map((r) => r.due).sort();
    return dates[0] || null;
  },

  boxCounts() {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of Object.values(state.review)) counts[r.box] = (counts[r.box] || 0) + 1;
    return counts;
  },

  forget(key) { delete state.review[key]; save(); },

  reset() { state = empty(); save(); },
};

export const settings = {
  _s: read(SETTINGS_KEY, { unlockAll: false, track: null, hideInstallTip: false }),
  get(k) { return this._s[k]; },
  set(k, v) { this._s[k] = v; write(SETTINGS_KEY, this._s); },
};
