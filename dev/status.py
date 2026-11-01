"""Write ../APP-STATUS.md: where the app is at, for the Claude Project that
writes the content. Regenerated on every publish (dev/publish.sh) and import.
  python3 dev/status.py
"""
import hashlib
import json
import re
import subprocess
from datetime import datetime
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
ROOT = APP.parent
SRC = ROOT / 'content'
DST = APP / 'content'
LIVE = 'https://daniellopez06042004-cmyk.github.io/neuro-learn/'


def load(path, default=None):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return default


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*cmd):
    try:
        return subprocess.run(cmd, cwd=APP, capture_output=True, text=True, timeout=60).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ''


def circuits():
    text = (APP / 'src' / 'circuits-data.js').read_text(encoding='utf-8')
    return dict(re.findall(r"'?([\w-]+)'?: \{\s*name: '([^']+)'", text))


def main():
    course = load(DST / 'course.json', {'tracks': []})
    glossary = load(DST / 'glossary.json', {'terms': []})
    pulse = load(DST / 'pulse.json', {'items': []})
    manifest = load(APP / 'dev' / 'import-manifest.json', {})
    names = circuits()
    version = re.search(r"VERSION = '(v\d+)'", (APP / 'sw.js').read_text()).group(1)
    commit = run('git', 'log', '-1', '--format=%h %s (%cd)', '--date=format:%Y-%m-%d %H:%M')
    check = run('sh', 'dev/check.sh')

    out = []
    w = out.append
    w('# Neuro Learn: app status')
    w('')
    w(f'_Written automatically by the app side (Claude Code) on {datetime.now():%Y-%m-%d %H:%M}. Read this before writing content; don\'t edit it, because it gets overwritten._')
    w('')
    w(f'- **Live app:** {LIVE} (offline version {version})')
    w(f'- **Last publish:** {commit}')
    w('')

    w('## How content gets into the app')
    w('')
    w('1. You (the Project) write files into `content/` in this folder: `lessons/<id>.json`, `assets/*`, a `course-<units>-snippet.json` for new or changed units, and `glossary.json` / `pulse.json` entries.')
    w('2. Dan tells the app side "new content is in". It imports only files that are new or changed since the last import (`app/dev/import.py`), checks everything, verifies DOIs, and publishes. The phone updates on its next open.')
    w('3. Never edit anything under `app/`. Never rename step ids in a lesson that is already live (review history is keyed `lessonId:stepId`).')
    w('4. To ask or tell the app side something, write in `content/NOTES-FOR-APP.md`. It gets read on every import and shown at the bottom of this file.')
    w('')

    w('## What\'s live')
    w('')
    lessons_live = {p.stem for p in (DST / 'lessons').glob('*.json')}
    total_units = sum(len(t['units']) for t in course['tracks'])
    units_with = sum(1 for t in course['tracks'] for u in t['units'] if any(l in lessons_live for l in u['lessons']))
    w(f'{len(lessons_live)} lessons across {units_with} of {total_units} units. Units with no lessons don\'t block their dependents.')
    w('')
    for t in course['tracks']:
        circuit = names.get(t.get('circuit', ''), 'next free circuit')
        w(f"### {t['id']}: {t['title']} ({circuit})")
        w('')
        w('| Unit | Title | Prereqs | Lessons live |')
        w('|---|---|---|---|')
        for u in t['units']:
            live = [l for l in u['lessons'] if l in lessons_live]
            missing = [l for l in u['lessons'] if l not in lessons_live]
            cell = ', '.join(live) if live else '—'
            if missing:
                cell += f" (listed, not written: {', '.join(missing)})"
            w(f"| {u['id']} | {u['title']} | {', '.join(u.get('prereqs', [])) or '—'} | {cell} |")
        w('')

    terms = sorted((t['term'] for t in glossary.get('terms', [])), key=str.lower)
    w(f'## Glossary terms already defined ({len(terms)})')
    w('')
    w('Link these exactly as written with `[[term]]` (aliases work too). Don\'t redefine them; add only new terms.')
    w('')
    w(', '.join(terms) if terms else '_None yet._')
    w('')
    items = pulse.get('items', [])
    w(f'## Field Pulse papers live ({len(items)})')
    w('')
    w('\n'.join(f"- {p['id']} ({p['date']}): {p['title']}" for p in items) if items else '_None yet._')
    w('')

    w('## What the app supports')
    w('')
    w('- **Step types:** concept, mcq (`multi` for several answers), troubleshoot (optional `data.kind: "table"`), predict (choices, or `freeText` with self-grading), match, order.')
    w('- **Lesson extras:** `objective` becomes an intro card ("By the end you can…"); `confidence` (high/medium/low) shows on it; `sources` show on the finish screen as DOI links (verified only).')
    w('- **Flags:** `uncertain`, `debated` or `simplified` only, with a `note`. Anything else fails the check.')
    w('- **Visuals (`visual` on any step, shown above it):** `svg-anim`, `svg`, `image`, `gif` (shown as a picture); `mp4` (muted, looping); `interactive` (an HTML file run in a sandboxed frame: scripts only, no storage, no network, auto-sized to its content, so don\'t use `100vh`). `lottie` is **not supported yet** (only the alt text shows). `alt` is required, and files go in `content/assets/`.')
    w('- **Text formatting:** `**bold**`, `*italic*`, `` `code` ``, `- ` lists, blank-line paragraphs, `[[term]]` / `[[shown|term]]` glossary links.')
    w('- **The circuit picture:** each track is a real pathway, and units sit along it in course order. Finishing lessons grows dendrites; reviewing to the top boxes myelinates axons.')
    w('- **Review:** every answered question goes into spaced repetition (Leitner boxes 1–5). Misses come back at the end of the lesson and in daily review.')
    w('- **Phone first:** keep visuals legible at 375px wide and correct in dark mode.')
    w('')

    # Sync between the Project's folder and what's live.
    pending, app_edited = [], []
    if SRC.is_dir():
        for sub in ('lessons', 'assets'):
            for p in sorted((SRC / sub).glob('*')) if (SRC / sub).is_dir() else []:
                if not p.is_file() or p.name.startswith('.'):
                    continue
                key = f'{sub}/{p.name}'
                if manifest.get(key) != sha(p):
                    pending.append(key)
                elif (DST / key).exists() and sha(DST / key) != sha(p):
                    app_edited.append(key)
        for p in sorted(SRC.glob('course*snippet*.json')) + [q for q in (SRC / 'glossary.json', SRC / 'pulse.json') if q.exists()]:
            key = str(p.relative_to(SRC))
            if manifest.get(key) != sha(p):
                pending.append(key)
    w('## Sync with your `content/` folder')
    w('')
    w('- **Waiting to be imported:** ' + (', '.join(pending) if pending else 'nothing. Everything you\'ve written is live.'))
    w('- **Changed on the app side after import:** ' + (', '.join(app_edited) + '. Please update your copies to match the live versions (reasons are in the notes below).' if app_edited else 'none.'))
    w('')

    w('## Content check (same rules the app uses)')
    w('')
    w('```')
    w(check or '(check did not run)')
    w('```')
    w('')

    notes = APP / 'dev' / 'notes-for-project.md'
    w('## Notes from the app side')
    w('')
    w(notes.read_text(encoding='utf-8').strip() if notes.exists() else '_None._')
    w('')
    theirs = SRC / 'NOTES-FOR-APP.md'
    w('## Your notes to the app side (`content/NOTES-FOR-APP.md`)')
    w('')
    body = theirs.read_text(encoding='utf-8') if theirs.exists() else ''
    body = re.sub(r'<!--.*?-->', '', body, flags=re.S)
    body = body.split('Add new notes at the top, with the date.', 1)[-1]
    body = re.sub(r'^\s*# Notes for the app side\s*\n', '', body).strip()  # its own title
    w(body or '_None yet._')
    w('')

    (ROOT / 'APP-STATUS.md').write_text('\n'.join(out), encoding='utf-8')
    print(f'Wrote {ROOT / "APP-STATUS.md"}')


if __name__ == '__main__':
    main()
