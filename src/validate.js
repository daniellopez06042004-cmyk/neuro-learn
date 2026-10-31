// Checks course.json and lesson files against lesson-format.md (v0.1).
// Every function returns a list of human-readable problems; empty = valid.

const STEP_TYPES = ['concept', 'mcq', 'match', 'troubleshoot', 'predict', 'order'];
const FLAG_LEVELS = ['uncertain', 'debated', 'simplified'];

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isArr = Array.isArray;

export function validateCourse(course) {
  const errs = [];
  const at = (where, msg) => errs.push(`course.json › ${where}: ${msg}`);
  if (!course || typeof course !== 'object') return ['course.json is not a JSON object'];
  if (!isStr(course.schemaVersion)) at('schemaVersion', 'missing (expected "0.1")');
  if (!isStr(course.title)) at('title', 'missing');
  if (!isArr(course.tracks) || !course.tracks.length) return [...errs, 'course.json › tracks: needs at least one track'];

  const unitIds = new Set(), lessonIds = new Set(), trackIds = new Set();
  course.tracks.forEach((t, ti) => {
    const w = `tracks[${ti}]${t?.id ? ` (${t.id})` : ''}`;
    if (!isStr(t?.id)) at(w, '"id" is missing');
    else if (trackIds.has(t.id)) at(w, `duplicate track id "${t.id}"`);
    else trackIds.add(t.id);
    if (!isStr(t?.title)) at(w, '"title" is missing');
    if (t?.color != null && !/^#[0-9a-fA-F]{6}$/.test(t.color)) at(w, `"color" should look like "#5B8DEF", got ${JSON.stringify(t.color)}`);
    if (!isArr(t?.units)) { at(w, '"units" must be a list'); return; }
    t.units.forEach((u, ui) => {
      const uw = `${w} › units[${ui}]${u?.id ? ` (${u.id})` : ''}`;
      if (!isStr(u?.id)) at(uw, '"id" is missing');
      else if (unitIds.has(u.id)) at(uw, `duplicate unit id "${u.id}"`);
      else unitIds.add(u.id);
      if (!isStr(u?.title)) at(uw, '"title" is missing');
      if (u?.prereqs != null && !isArr(u.prereqs)) at(uw, '"prereqs" must be a list of unit ids');
      if (!isArr(u?.lessons)) at(uw, '"lessons" must be a list of lesson ids (can be empty)');
      else u.lessons.forEach((id) => {
        if (!isStr(id)) at(uw, `lesson id ${JSON.stringify(id)} is not a string`);
        else if (lessonIds.has(id)) at(uw, `lesson "${id}" is listed in more than one unit`);
        else lessonIds.add(id);
      });
    });
  });

  // Prereqs must point at real units, and must not loop.
  const prereqs = {};
  course.tracks.forEach((t) => (t.units || []).forEach((u) => {
    prereqs[u.id] = isArr(u.prereqs) ? u.prereqs : [];
    for (const p of prereqs[u.id]) {
      if (p === u.id) at(`unit ${u.id}`, 'lists itself as a prereq');
      else if (!unitIds.has(p)) at(`unit ${u.id}`, `prereq "${p}" is not a unit id in course.json`);
    }
  }));
  const state = {};
  const visit = (id, path) => {
    if (state[id] === 2) return;
    if (state[id] === 1) { at(`unit ${id}`, `prereqs form a loop: ${[...path, id].join(' → ')}`); return; }
    state[id] = 1;
    for (const p of prereqs[id] || []) if (prereqs[p]) visit(p, [...path, id]);
    state[id] = 2;
  };
  Object.keys(prereqs).forEach((id) => visit(id, []));
  return errs;
}

export function validateLesson(lesson, expectedId, expectedUnit) {
  const errs = [];
  const file = `lessons/${expectedId}.json`;
  const at = (where, msg) => errs.push(`${file} › ${where}: ${msg}`);
  if (!lesson || typeof lesson !== 'object' || isArr(lesson)) return [`${file} is not a JSON object`];

  if (lesson.id !== expectedId) at('id', `is ${JSON.stringify(lesson.id)} but the file name says "${expectedId}"`);
  if (expectedUnit && lesson.unitId !== expectedUnit) at('unitId', `is ${JSON.stringify(lesson.unitId)} but course.json puts it in unit "${expectedUnit}"`);
  if (!isStr(lesson.title)) at('title', 'missing');
  if (lesson.xp != null && !(Number.isFinite(lesson.xp) && lesson.xp >= 0)) at('xp', 'must be a number');
  if (lesson.minutes != null && !Number.isFinite(lesson.minutes)) at('minutes', 'must be a number');
  if (lesson.sources != null) {
    if (!isArr(lesson.sources)) at('sources', 'must be a list');
    else lesson.sources.forEach((s, i) => {
      if (!isStr(s?.citation)) at(`sources[${i}]`, '"citation" is missing');
      if (s?.verified !== true) at(`sources[${i}]`, 'only verified sources belong here ("verified": true)');
    });
  }
  if (!isArr(lesson.steps) || !lesson.steps.length) { at('steps', 'needs at least one step'); return errs; }

  const seen = new Set();
  lesson.steps.forEach((s, i) => {
    const w = `steps[${i}]${s?.id ? ` (${s.id}${s.type ? `, ${s.type}` : ''})` : ''}`;
    const need = (field, ok, msg) => { if (!ok) at(w, msg || `"${field}" is missing`); };
    if (!s || typeof s !== 'object') { at(w, 'is not an object'); return; }
    if (!isStr(s.id)) at(w, '"id" is missing');
    else if (seen.has(s.id)) at(w, `duplicate step id "${s.id}" (ids must be unique in a lesson)`);
    else seen.add(s.id);
    if (!STEP_TYPES.includes(s.type)) { at(w, `unknown "type" ${JSON.stringify(s.type)} (use one of: ${STEP_TYPES.join(', ')})`); return; }

    if (s.flag != null) {
      if (typeof s.flag !== 'object' || !FLAG_LEVELS.includes(s.flag.level)) at(w, `"flag.level" must be one of: ${FLAG_LEVELS.join(', ')}`);
    }
    if (s.difficulty != null && ![1, 2, 3].includes(s.difficulty)) at(w, '"difficulty" must be 1, 2 or 3');

    const checkChoices = () => {
      need('prompt', isStr(s.prompt));
      if (!isArr(s.options) || s.options.length < 2 || !s.options.every(isStr)) { at(w, '"options" must be a list of at least 2 strings'); return; }
      if (!isArr(s.answer) || !s.answer.length) { at(w, '"answer" must be a list of option indexes, like [1]'); return; }
      for (const a of s.answer) {
        if (!Number.isInteger(a) || a < 0 || a >= s.options.length) at(w, `"answer" index ${JSON.stringify(a)} is out of range (options are numbered 0–${s.options.length - 1})`);
      }
      if (!s.multi && s.answer.length > 1) at(w, '"answer" has several indexes, so set "multi": true');
    };

    switch (s.type) {
      case 'concept':
        need('body', isStr(s.body));
        if (s.image != null && !isStr(s.image) && !isStr(s.image?.src)) at(w, '"image" must be a path string or { "src": ..., "alt": ... }');
        break;
      case 'mcq':
        checkChoices();
        need('explanation', isStr(s.explanation));
        break;
      case 'troubleshoot':
        need('scenario', isStr(s.scenario));
        checkChoices();
        need('explanation', isStr(s.explanation));
        if (s.data != null) {
          if (s.data.kind !== 'table') at(w, '"data.kind" must be "table"');
          else if (!isArr(s.data.rows) || !s.data.rows.every(isArr)) at(w, '"data.rows" must be a list of rows (each a list of cells)');
        }
        break;
      case 'predict':
        need('reveal', isStr(s.reveal), '"reveal" is missing (shown after the prediction)');
        if (s.freeText) need('prompt', isStr(s.prompt));
        else checkChoices();
        break;
      case 'match':
        need('prompt', isStr(s.prompt));
        need('explanation', isStr(s.explanation));
        if (!isArr(s.pairs) || s.pairs.length < 2 || !s.pairs.every((p) => isArr(p) && p.length === 2 && p.every(isStr))) {
          at(w, '"pairs" must be a list of at least 2 ["left", "right"] pairs');
        } else {
          const rights = s.pairs.map((p) => p[1]), lefts = s.pairs.map((p) => p[0]);
          if (new Set(rights).size !== rights.length || new Set(lefts).size !== lefts.length) at(w, 'every left and right item must be different');
        }
        break;
      case 'order':
        need('prompt', isStr(s.prompt));
        need('explanation', isStr(s.explanation));
        if (!isArr(s.items) || s.items.length < 2 || !s.items.every(isStr)) at(w, '"items" must be a list of at least 2 strings (in the correct order)');
        else if (new Set(s.items).size !== s.items.length) at(w, '"items" must all be different');
        break;
    }
  });
  return errs;
}
