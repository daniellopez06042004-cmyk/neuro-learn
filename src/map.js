// Lays out one track's units as a neural map, computed from course.json so
// nodes never need hand placement. Units go down the screen in course order
// along a winding path; a unit always sits below its prereqs, and units that
// share a prereq branch side by side (up to 3 per row).

const ROW_H = 160;
const TOP = 44;
const MAX_PER_ROW = 3;

export function layoutTrack(track) {
  const units = track.units;
  const inTrack = new Set(units.map((u) => u.id));
  const localPrereqs = (u) => u.prereqs.filter((p) => inTrack.has(p) && p !== u.id);

  const rowOf = new Map();
  const rows = [];
  for (const u of units) {
    const ps = localPrereqs(u).filter((p) => rowOf.has(p));
    const last = rows.length - 1;
    let r = ps.length ? Math.max(...ps.map((p) => rowOf.get(p))) + 1 : last + 1;
    // A sibling may join an existing row; anything else starts a new one.
    if (r <= last && !(ps.length && rows[r].length < MAX_PER_ROW)) r = last + 1;
    (rows[r] ||= []).push(u);
    rowOf.set(u.id, r);
  }

  const SLOTS = { 1: [0.5], 2: [0.27, 0.73], 3: [0.17, 0.5, 0.83] };
  const nodes = [];
  rows.forEach((row, r) => {
    const y = TOP + r * ROW_H;
    if (row.length === 1) nodes.push({ unit: row[0], x: 0.5 + 0.2 * Math.sin(r * 1.15), y });
    else row.forEach((u, i) => nodes.push({ unit: u, x: SLOTS[row.length][i], y }));
  });

  // Real prereq links, plus a faint "spine" into any unit that has none so
  // the whole track reads as one connected path.
  const pos = new Map(nodes.map((n) => [n.unit.id, n]));
  const edges = [];
  units.forEach((u, i) => {
    const ps = localPrereqs(u);
    for (const p of ps) edges.push({ from: pos.get(p), to: pos.get(u.id), kind: 'prereq' });
    if (!ps.length && i > 0) {
      const prev = pos.get(units[i - 1].id), here = pos.get(u.id);
      if (prev.y < here.y) edges.push({ from: prev, to: here, kind: 'spine' });
    }
  });

  return { nodes, edges, height: TOP + (rows.length - 1) * ROW_H + 110 };
}

// Curved "axon" between two nodes, in pixels. Soma radius is 32px.
export function axonPath(a, b, width) {
  const x1 = a.x * width, y1 = a.y + 34, x2 = b.x * width, y2 = b.y - 34;
  const my = (y1 + y2) / 2;
  return `M${x1.toFixed(1)} ${y1}C${x1.toFixed(1)} ${my},${x2.toFixed(1)} ${my},${x2.toFixed(1)} ${y2}`;
}
