"""Make the Allen brain section for a unit's slide.

  python3 dev/atlas.py A6 VPM VPL SSp          # pick the best coronal section for these regions
  python3 dev/atlas.py A6 VPM VPL SSp --plate 100960232   # or use a specific section
  (add --out dev/sample to write somewhere other than content/assets/atlas)

Regions are Allen Mouse Brain Atlas acronyms (children count too: SSp covers
every SSp area and layer). The script downloads the ontology and the annotated
coronal plates once (cached in dev/.atlas-cache), picks the plate where the
regions cover the most area, simplifies every outline, and writes
content/assets/atlas/<unit>.json for the app. The plate is a hemisphere; the app
mirrors it across the midline.

Data: Allen Mouse Brain Atlas (P56, coronal), © Allen Institute for Brain Science.
"""
import json
import math
import re
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
CACHE = APP / 'dev' / '.atlas-cache'
OUT = APP / 'content' / 'assets' / 'atlas'
API = 'https://api.brain-map.org/api/v2/'
SCALE = 1 / 40          # plate pixels → output units (a hemisphere is about 120 × 160)
EPS = .55               # outline simplification tolerance, in output units


def fetch(name, url):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if not path.exists():
        with urllib.request.urlopen(url, timeout=60) as r:
            path.write_bytes(r.read())
    return path.read_text(encoding='utf-8')


def ontology():
    data = json.loads(fetch('ontology.json', API + 'structure_graph_download/1.json'))
    nodes = {}

    def walk(n, parent):
        nodes[n['id']] = {'acr': n['acronym'], 'col': n.get('color_hex_triplet') or 'CCCCCC', 'parent': parent}
        for c in n.get('children', []):
            walk(c, n['id'])
    walk(data['msg'][0], None)
    return nodes


def ancestors(nodes, sid):
    out = []
    while sid is not None and sid in nodes:
        out.append(nodes[sid]['acr'])
        sid = nodes[sid]['parent']
    return out


def plates():
    q = ("query.json?criteria=model::AtlasImage,rma::criteria,[annotated$eqtrue],"
         "atlas_data_set(atlases[id$eq1]),rma::options[order$eq'sub_images.section_number'][num_rows$eqall]")
    data = json.loads(fetch('plates.json', API + 'data/' + q))
    return [p['id'] for p in data['msg']]


TOKEN = re.compile(r'[MmCcLlHhVvSsZz]|-?\d*\.?\d+(?:e-?\d+)?')


def polygons(d):
    """SVG path data → list of point lists (Béziers sampled)."""
    t = TOKEN.findall(d)
    i, cmd, x, y, sx, sy, out, cur, pc = 0, None, 0.0, 0.0, 0.0, 0.0, [], [], None

    def num():
        nonlocal i
        i += 1
        return float(t[i - 1])

    def bez(p0, p1, p2, p3):
        for k in range(1, 7):
            u = k / 6
            a, b, c, e = (1 - u) ** 3, 3 * (1 - u) ** 2 * u, 3 * (1 - u) * u * u, u ** 3
            cur.append((a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]))

    while i < len(t):
        if t[i].isalpha():
            cmd = t[i]
            i += 1
        if cmd in 'Zz':
            if cur:
                out.append(cur)
                cur = []
            x, y = sx, sy
            continue
        if cmd in 'Mm':
            nx, ny = num(), num()
            if cmd == 'm':
                nx, ny = nx + x, ny + y
            if cur:
                out.append(cur)
            cur, x, y, sx, sy = [(nx, ny)], nx, ny, nx, ny
            cmd = 'l' if cmd == 'm' else 'L'
        elif cmd in 'Ll':
            nx, ny = num(), num()
            if cmd == 'l':
                nx, ny = nx + x, ny + y
            cur.append((nx, ny))
            x, y = nx, ny
        elif cmd in 'Hh':
            nx = num()
            x = nx + x if cmd == 'h' else nx
            cur.append((x, y))
        elif cmd in 'Vv':
            ny = num()
            y = ny + y if cmd == 'v' else ny
            cur.append((x, y))
        elif cmd in 'Cc':
            v = [num() for _ in range(6)]
            if cmd == 'c':
                v = [v[0] + x, v[1] + y, v[2] + x, v[3] + y, v[4] + x, v[5] + y]
            bez((x, y), (v[0], v[1]), (v[2], v[3]), (v[4], v[5]))
            pc, x, y = (v[2], v[3]), v[4], v[5]
        elif cmd in 'Ss':
            v = [num() for _ in range(4)]
            if cmd == 's':
                v = [v[0] + x, v[1] + y, v[2] + x, v[3] + y]
            c1 = (2 * x - pc[0], 2 * y - pc[1]) if pc else (x, y)
            bez((x, y), c1, (v[0], v[1]), (v[2], v[3]))
            pc, x, y = (v[0], v[1]), v[2], v[3]
        else:
            raise ValueError(f'unsupported path command {cmd}')
    if cur:
        out.append(cur)
    return out


def simplify(pts, eps):
    if len(pts) < 3:
        return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay
    length = math.hypot(dx, dy)
    best, idx = 0, 0
    for k in range(1, len(pts) - 1):
        px, py = pts[k]
        dist = abs(dy * px - dx * py + bx * ay - by * ax) / length if length > 1e-6 else math.hypot(px - ax, py - ay)
        if dist > best:
            best, idx = dist, k
    if best > eps:
        return simplify(pts[:idx + 1], eps)[:-1] + simplify(pts[idx:], eps)
    return [pts[0], pts[-1]]


def area(pts):
    return abs(sum(pts[k][0] * pts[k - 1][1] - pts[k - 1][0] * pts[k][1] for k in range(len(pts)))) / 2


def read_plate(pid, nodes, regions):
    svg = fetch(f'plate-{pid}.svg', f'{API}svg_download/{pid}?groups=28')
    width = int(re.search(r'width="(\d+)"', svg).group(1))
    rows, hit = [], 0.0
    for sid, d in re.findall(r'<path[^>]*structure_id="(\d+)"[^>]*d="([^"]+)"', svg, re.S):
        sid = int(sid)
        if sid not in nodes:
            continue
        anc = ancestors(nodes, sid)
        match = next((i for i, r in enumerate(regions) if r in anc), None)
        flag = f'h{match}' if match is not None else 'f' if 'fiber tracts' in anc else 'v' if anc[0] in ('VL', 'V3', 'V4', 'SEZ', 'chpl') else ''
        segs = []
        for poly in polygons(d):
            pts = simplify([(px * SCALE, py * SCALE) for px, py in poly], EPS)
            if len(pts) >= 3 and area(pts) >= .6:
                segs.append(pts)
                if match is not None:
                    hit += area(pts)
        if segs:
            rows.append((nodes[sid]['acr'], nodes[sid]['col'], flag, segs))
    return rows, hit, width


def main(argv):
    if len(argv) < 2:
        sys.exit(__doc__)
    plate, out_dir = None, OUT
    if '--out' in argv:
        k = argv.index('--out')
        out_dir = APP / argv[k + 1]
        argv = argv[:k] + argv[k + 2:]
    if '--plate' in argv:
        k = argv.index('--plate')
        plate = int(argv[k + 1])
        argv = argv[:k] + argv[k + 2:]
    unit, regions = argv[0], argv[1:]
    nodes = ontology()
    known = {n['acr'] for n in nodes.values()}
    unknown = [r for r in regions if r not in known]
    if unknown:
        sys.exit(f'Not Allen acronyms: {", ".join(unknown)}')
    if plate is None:
        best = None
        for pid in plates():
            rows, hit, width = read_plate(pid, nodes, regions)
            found = {int(f[1:]) for _, _, f, _ in rows if f.startswith('h')}
            score = (len(found), hit)   # cover as many of the regions as possible, then the most area
            if best is None or score > best[0]:
                best = (score, pid, rows, width)
        (count, _), plate, rows, width = best
        if count < len(regions):
            print(f'Note: no single section contains all of {", ".join(regions)}; using the one with {count}.')
    else:
        rows, _, width = read_plate(plate, nodes, regions)
    # The plate is a hemisphere; its midline is the centre of the image (a few
    # structures cross it slightly). x = 0 is the midline, which the app mirrors.
    xs = [x for *_, segs in rows for s in segs for x, _ in s]
    ys = [y for *_, segs in rows for s in segs for _, y in s]
    mx, my = width / 2 * SCALE, min(ys)
    out = {
        'unit': unit, 'plate': plate, 'regions': regions,
        'w': round(max(xs) - mx), 'h': round(max(ys) - my),
        'credit': 'Allen Mouse Brain Atlas, © Allen Institute for Brain Science',
        'r': [[acr, col, flag, ''.join('M' + ' '.join(f'{round(x - mx)},{round(y - my)}' for x, y in s) + 'Z' for s in segs)]
              for acr, col, flag, segs in rows],
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f'{unit}.json'
    path.write_text(json.dumps(out, separators=(',', ':')), encoding='utf-8')
    print(f'Wrote {path.relative_to(APP)}: plate {plate}, {len(rows)} regions, {path.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1:])
