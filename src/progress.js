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

// days: XP earned per date, for the daily goal and the streak calendar.
const empty = () => ({ completed: {}, review: {}, streak: { count: 0, last: null }, bonusXp: 0, days: {} });
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
    let earned = xp;
    if (state.completed[lessonId]) {
      earned = Math.ceil(xp / 2); // replay = half XP
      state.bonusXp = (state.bonusXp || 0) + earned;
    } else {
      state.completed[lessonId] = { xp, date: today() };
    }
    this.logXp(earned);
    this.bumpStreak();
    save();
  },

  slideDate(unitId) { return state.slides?.[unitId] || null; },
  earnSlide(unitId, date = today()) { (state.slides ||= {})[unitId] = date; save(); },

  // Weekly quiz: week (the Monday's date) -> { ids, done, correct, graded }
  quiz(week) { return state.quizzes?.[week] || null; },
  saveQuiz(week, rec) { (state.quizzes ||= {})[week] = rec; save(); },
  quizSeen() { return new Set(Object.values(state.quizzes || {}).flatMap((q) => q.ids)); },

  addBonusXp(n) { state.bonusXp = (state.bonusXp || 0) + n; this.logXp(n); save(); },

  logXp(n) {
    state.days ||= {};
    state.days[today()] = (state.days[today()] || 0) + n;
  },

  // XP per day. Days from before the log existed are filled in from
  // lesson completion dates so the calendar isn't empty.
  dayLog() {
    const log = { ...(state.days || {}) };
    for (const c of Object.values(state.completed)) if (c.date && !(c.date in log)) log[c.date] = (log[c.date] || 0) + (c.xp || 0);
    return log;
  },
  xpToday() { return this.dayLog()[today()] || 0; },
  dailyGoal() { return settings.get('dailyGoal') || 20; },

  bestStreak() {
    const days = Object.keys(this.dayLog()).filter((d) => this.dayLog()[d] > 0).sort();
    let best = 0, run = 0, prev = null;
    for (const d of days) {
      run = prev && addDays(prev, 1) === d ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    }
    return Math.max(best, this.streak());
  },

  // key = "lessonId:stepId"
  // variant: which version of the question was shown, so review can show a different one
  recordAnswer(key, correct, variant = 0) {
    const prev = state.review[key];
    const box = correct ? Math.min(MAX_BOX, (prev?.box || 0) + 1) : 1;
    // A miss is due again right away so it shows up in today's review.
    const due = correct ? addDays(today(), BOX_DAYS[box]) : today();
    state.review[key] = { box, due, v: variant };
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

  // ---- Backup: a small JSON file you keep in Files/iCloud.
  exportData() {
    return { app: 'neurolearn', format: 1, exportedAt: new Date().toISOString(), progress: state, settings: settings._s };
  },

  // Returns a short description of the backup, or throws if it isn't one.
  describeBackup(data) {
    if (data?.app !== 'neurolearn' || !data.progress || typeof data.progress.completed !== 'object' || typeof data.progress.review !== 'object') {
      throw new Error("That file isn't a Neuro Learn backup.");
    }
    const p = data.progress;
    const xp = Object.values(p.completed).reduce((s, c) => s + (c.xp || 0), 0) + (p.bonusXp || 0);
    const n = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
    return `${n(Object.keys(p.completed).length, 'lesson')}, ${xp} xp, ${n(Object.keys(p.review).length, 'review question')}, saved ${String(data.exportedAt).slice(0, 10)}`;
  },

  importData(data) {
    this.describeBackup(data);
    state = { ...empty(), ...data.progress };
    save();
    if (data.settings) { settings._s = { ...settings._s, ...data.settings }; write(SETTINGS_KEY, settings._s); }
  },
};

export const settings = {
  _s: read(SETTINGS_KEY, { unlockAll: false, track: null, hideInstallTip: false }),
  get(k) { return this._s[k]; },
  set(k, v) { this._s[k] = v; write(SETTINGS_KEY, this._s); },
};
