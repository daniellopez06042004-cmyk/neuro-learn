"""Bring the Project's content into the app.

The Project writes into the top-level Learning App/content/ folder. This copies
what changed there since the last import into app/content/:
  - lessons/*.json and assets/*          (copied when new or changed)
  - course-*-snippet.json                (units replace the same unit id in course.json)
  - glossary.json                        (merged by term; the Project's version of a term wins)
  - pulse.json                           (merged by paper id)
Files the Project hasn't touched since the last import are left alone, so fixes
made on the app side stay put. Run from the app folder:
  python3 dev/import.py            # import
  python3 dev/import.py --dry-run  # just show what would change
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
SRC = APP.parent / 'content'          # the Project's folder
DST = APP / 'content'
MANIFEST = APP / 'dev' / 'import-manifest.json'
DRY = '--dry-run' in sys.argv


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def save_json(path, data):
    if not DRY:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def main():
    if not SRC.is_dir():
        print(f'No Project content folder at {SRC}')
        return 1
    seen = load_json(MANIFEST) if MANIFEST.exists() else {}
    changed = []

    def is_new(path):
        key = str(path.relative_to(SRC))
        return seen.get(key) != sha(path), key

    report = []

    # Lessons and assets: plain copies.
    for sub in ('lessons', 'assets'):
        for path in sorted((SRC / sub).glob('*')) if (SRC / sub).is_dir() else []:
            if not path.is_file() or path.name.startswith('.'):
                continue
            new, key = is_new(path)
            if not new:
                continue
            target = DST / sub / path.name
            report.append(f"{'updated' if target.exists() else 'added  '} {sub}/{path.name}")
            if not DRY:
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, target)
            changed.append((key, path))

    # Unit definitions: each snippet's units replace (or add) units in course.json.
    course_path = DST / 'course.json'
    course = load_json(course_path)
    course_changed = False
    for path in sorted(SRC.glob('course*snippet*.json')):
        new, key = is_new(path)
        if not new:
            continue
        data = load_json(path)
        units = data['units'] if 'units' in data else [{k: v for k, v in data.items() if not k.startswith('_')}]
        for unit in units:
            unit = {k: v for k, v in unit.items() if not k.startswith('_')}
            track = next((t for t in course['tracks'] if any(u['id'] == unit['id'] for u in t['units'])), None)
            if track is None:  # a new unit: put it in the track whose id starts its unit id
                track = next((t for t in course['tracks'] if unit['id'].startswith(t['id'])), None)
                if track is None:
                    report.append(f"skipped  {path.name}: no track for unit {unit['id']}")
                    continue
                track['units'].append(unit)
                report.append(f"added    unit {unit['id']} ({path.name})")
            else:
                i = next(k for k, u in enumerate(track['units']) if u['id'] == unit['id'])
                if track['units'][i] != unit:
                    track['units'][i] = unit
                    report.append(f"updated  unit {unit['id']} ({path.name})")
            course_changed = True
        changed.append((key, path))
    if course_changed:
        save_json(course_path, course)

    # Glossary: merge by term name (case-insensitive).
    gpath = SRC / 'glossary.json'
    if gpath.exists():
        new, key = is_new(gpath)
        if new:
            mine = load_json(DST / 'glossary.json') if (DST / 'glossary.json').exists() else {'terms': []}
            theirs = load_json(gpath)
            index = {t['term'].lower(): i for i, t in enumerate(mine['terms'])}
            added = updated = 0
            for t in theirs.get('terms', []):
                k = t['term'].lower()
                if k in index:
                    if mine['terms'][index[k]] != t:
                        mine['terms'][index[k]] = t
                        updated += 1
                else:
                    index[k] = len(mine['terms'])
                    mine['terms'].append(t)
                    added += 1
            save_json(DST / 'glossary.json', mine)
            report.append(f'glossary +{added} new, {updated} updated')
            changed.append((key, gpath))

    # Field Pulse: merge by paper id.
    ppath = SRC / 'pulse.json'
    if ppath.exists():
        new, key = is_new(ppath)
        if new:
            mine = load_json(DST / 'pulse.json') if (DST / 'pulse.json').exists() else {'schemaVersion': '0.1', 'items': []}
            index = {p['id']: i for i, p in enumerate(mine['items'])}
            added = 0
            for p in load_json(ppath).get('items', []):
                if p['id'] in index:
                    mine['items'][index[p['id']]] = p
                else:
                    mine['items'].append(p)
                    added += 1
            save_json(DST / 'pulse.json', mine)
            report.append(f'pulse    +{added} new papers')
            changed.append((key, ppath))

    print('\n'.join(report) if report else 'Nothing new from the Project since the last import.')
    if not DRY:
        for key, path in changed:
            seen[key] = sha(path)
        MANIFEST.write_text(json.dumps(seen, indent=2, sort_keys=True) + '\n')
    elif report:
        print('(dry run: nothing was changed)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
