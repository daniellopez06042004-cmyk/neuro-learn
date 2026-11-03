#!/usr/bin/env python3
"""Real traced neurons for the app's drawings.

Turns NeuroMorpho.Org reconstructions (SWC files) into simplified, flattened SVG
paths, so a visual can draw a real mouse cell instead of an invented one.

  python3 dev/neurons.py sheet <dir-of-swc> <out.html>     contact sheet of every cell, to choose from
  python3 dev/neurons.py path <file.swc> [--size 300] [--tol 1.5] [--rot DEG]
                                                            one cell as an SVG path (viewBox 0 0 size size)

Credit every cell you use: NeuroMorpho.Org (Ascoli et al. 2007, J Neurosci) and the
original paper (each record's reference_doi), e.g. the Nathans archive is
Wu, Williams & Nathans 2012, eLife, 10.7554/eLife.00181.
"""
import math
import sys
from pathlib import Path


def read_swc(path):
    nodes = {}
    for line in Path(path).read_text(errors='replace').splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        i, t, x, y, z, r, p = line.split()[:7]
        nodes[int(i)] = (int(t), float(x), float(y), float(r), int(p))
    return nodes


def branches(nodes):
    """Unbranched runs of points, from each branch point (or the root) to the next."""
    kids = {}
    for i, (_, _, _, _, p) in nodes.items():
        kids.setdefault(p, []).append(i)
    runs, stack = [], [k for k in kids.get(-1, [])]
    starts = [(None, s) for s in stack]
    while starts:
        parent, i = starts.pop()
        run = [parent] if parent is not None else []
        while True:
            run.append(i)
            c = kids.get(i, [])
            if len(c) != 1:
                starts.extend((i, k) for k in c)
                break
            i = c[0]
        runs.append(run)
    return runs


def simplify(pts, tol):
    """Drop points closer than tol to the last kept one, then Douglas-Peucker (iterative: traces can have 80k points)."""
    thin = [pts[0]]
    for p in pts[1:-1]:
        if math.hypot(p[0] - thin[-1][0], p[1] - thin[-1][1]) >= tol:
            thin.append(p)
    thin.append(pts[-1])
    if len(thin) < 3:
        return thin
    keep, stack = {0, len(thin) - 1}, [(0, len(thin) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = thin[a], thin[b]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy) or 1e-9
        far, at = 0, 0
        for k in range(a + 1, b):
            x, y = thin[k]
            d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm
            if d > far:
                far, at = d, k
        if far > tol:
            keep.add(at)
            stack += [(a, at), (at, b)]
    return [thin[k] for k in sorted(keep)]


def to_path(path, size=300, tol=1.5, rot=0.0, pad=6):
    nodes = read_swc(path)
    a = math.radians(rot)
    xy = {i: (x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)) for i, (_, x, y, _, _) in nodes.items()}
    xs, ys = [p[0] for p in xy.values()], [p[1] for p in xy.values()]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    span = max(x1 - x0, y1 - y0) or 1
    k = (size - 2 * pad) / span
    ox = pad + (size - 2 * pad - (x1 - x0) * k) / 2
    oy = pad + (size - 2 * pad - (y1 - y0) * k) / 2
    tf = lambda p: ((p[0] - x0) * k + ox, (p[1] - y0) * k + oy)
    d = []
    for run in branches(nodes):
        pts = simplify([tf(xy[i]) for i in run], tol)
        if len(pts) > 1:
            d.append('M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts))
    um = span  # micrometres across the drawing
    root = next((tf(xy[i]) for i, v in nodes.items() if v[4] == -1), (0, 0))  # where the parent axon enters
    to_path.root = root
    return ' '.join(d), um


def sheet(folder, out):
    cells = []
    for f in sorted(Path(folder).glob('*.swc')):
        d, um = to_path(f, 160, 1.2)
        cells.append(f'<figure><svg viewBox="0 0 160 160"><path d="{d}" fill="none" stroke="#1D9E75" stroke-width="1.2" stroke-linecap="round"/></svg><figcaption>{f.stem.replace(".CNG", "")} · {um:.0f} µm</figcaption></figure>')
    Path(out).write_text('<!doctype html><meta charset="utf-8"><style>body{font:12px system-ui;background:#f7f6f1;margin:8px}'
                         'main{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}figure{margin:0;background:#fff;border-radius:6px;padding:4px}'
                         'svg{width:100%;display:block}</style><main>' + ''.join(cells) + '</main>')


if __name__ == '__main__':
    if len(sys.argv) >= 4 and sys.argv[1] == 'sheet':
        sheet(sys.argv[2], sys.argv[3])
    elif len(sys.argv) >= 3 and sys.argv[1] == 'path':
        args = sys.argv[3:]
        opt = lambda name, dflt: float(args[args.index(name) + 1]) if name in args else dflt
        d, um = to_path(sys.argv[2], int(opt('--size', 300)), opt('--tol', 1.5), opt('--rot', 0))
        print(f'<!-- {Path(sys.argv[2]).name}: {um:.0f} µm across; parent axon enters at {to_path.root[0]:.1f},{to_path.root[1]:.1f} -->')
        print(d)
    else:
        print(__doc__)
