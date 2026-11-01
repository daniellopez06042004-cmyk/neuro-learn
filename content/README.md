# Adding lessons

All content is plain JSON in this folder. The app reads it as is, so adding a lesson never means touching code. The format is defined in `lesson-format.md` (v0.1).

## 1. Write the lesson file

Save it as `lessons/<lesson-id>.json`. The file name must match the lesson's `"id"`.

```json
{
  "id": "C2-L1",
  "unitId": "C2",
  "title": "What Cre actually does",
  "minutes": 4,
  "xp": 10,
  "objective": "…",
  "confidence": "high",
  "steps": [
    { "type": "concept", "id": "s1", "title": "…", "body": "…" },
    { "type": "mcq", "id": "s2", "prompt": "…", "options": ["…", "…"], "answer": [0], "explanation": "…" }
  ],
  "sources": []
}
```

The six step types are `concept`, `mcq`, `match`, `troubleshoot`, `predict` and `order`. The C2–C5 lessons use every one of them, so copy from those.

Rules the app checks:

- `id` matches the file name, and `unitId` matches the unit that lists the lesson in `course.json`.
- Every step has a `type` and an `id` that's unique within the lesson. Review progress is saved as `lessonId:stepId`, so **don't rename step ids** after you've used a lesson, or that question's review history is lost.
- `answer` is a list of option positions **counting from 0**. `[1]` means the second option. If you list more than one, also set `"multi": true`.
- Every question needs an `explanation` (a `predict` step needs a `reveal`).
- `order` steps list `items` in the **correct** order, and the app shuffles them.
- `match` steps list `pairs` as `["left", "right"]`, and the app shuffles the right-hand column.
- `flag` is optional: `{ "level": "uncertain" | "debated" | "simplified", "note": "…" }`.
- `sources` only holds entries with `"verified": true`.

Text fields support light formatting: `**bold**`, `*italic*`, `` `code` ``, a blank line for a new paragraph, and lines starting with `- ` for a list.

`match` steps can also sort items into categories: repeat the same right-hand item (for example, two pairs that both end in `"Afferent"`). Left-hand items must all be different.

**Visuals:** any step can have a `"visual"`, shown above the step: `{ "type": "svg-anim", "src": "assets/cre-lox.svg", "alt": "what it shows", "caption": "…" }`. Files go in `assets/`. Types:
- `svg-anim`, `svg`, `image` and `gif` are shown as pictures (animated SVGs play on their own)
- `mp4` plays muted on a loop
- `interactive` is a self-contained HTML widget, run in a sealed frame that sizes itself to its content (no storage, no access to the app)
- `lottie` isn't supported yet and shows the `alt` text instead

`alt` is required. The check makes sure every file exists, and the app saves each lesson's visuals for offline use.

## 2. List it in course.json

Add the id to its unit's `"lessons"` list, in the order you want lessons played:

```json
{ "id": "C2", "title": "Mouse Genetics I — The Logic", "prereqs": [], "lessons": ["C2-L1", "C2-L2"] }
```

You can list ids before their files exist. Those lessons show as "Not written yet" and don't block anything.

## How locking works

- A unit unlocks when every unit in its `"prereqs"` is complete. A unit is complete when it has at least one written lesson and you've finished all of its written lessons.
- Inside a unit, lessons open one after another.
- The map draws prereqs as axons and lays itself out automatically. Units that share a prereq branch side by side.
- **Settings → Unlock everything** skips all locks.

The current prereqs come from the "suggested starting points" in the curriculum (D1 → D2 → D3, C2 → C3 → C4 → C5, and the capstone after C5 and D6). Edit `"prereqs"` in `course.json` to change them.

## Your circuit

The circuit screen draws each track as a real neural pathway, with the track's units placed along it in course order (the direction the signal travels). Pick a track's pathway with `"circuit"` in `course.json`:

| `"circuit"` | Pathway |
|---|---|
| `somatosensory` | Receptor → DRG → dorsal horn → spinal cord → brainstem → thalamus → S1 → insula |
| `inflammatory-reflex` | Spleen → vagal afferent → nodose ganglion → NTS → hypothalamus → DMV → vagal efferent → spleen |
| `basal-ganglia` | Cortex → striatum → GPe → STN → GPi → thalamus → cortex |
| `spinal-reflex` | Skin → DRG → dorsal horn → interneuron → ventral horn → muscle |
| `pancreas-afferent` | Pancreas → splanchnic afferent → DRG → dorsal horn |
| `cerebellar` | Pontine nuclei → mossy fibers → granule cells → Purkinje cells → deep nuclei → thalamus |

A track without `"circuit"` gets the next unused one. Order the units so they follow the pathway, if you can. To add a new pathway, add an entry to `src/circuits-data.js`.

## Glossary (`glossary.json`)

Any lesson text can link a term with `[[DRG]]`, or wiki-style `[[DRG|dorsal root ganglia]]` (term first, then the words to show). Tapping it opens the definition without leaving the lesson. The glossary screen lists every term, with search.

```json
{ "terms": [
  { "term": "DRG", "aliases": ["dorsal root ganglion"], "definition": "…", "track": "A" }
] }
```

`aliases` and `track` (which colors the dot) are optional. The check warns about any `[[term]]` that isn't in the glossary. The two entries there now are placeholders, so replace them.

## Field Pulse (`pulse.json`)

Recent papers, newest first, with a "New" tag on ones you haven't seen. Only add a paper after checking its DOI, the same rule as lesson sources.

```json
{ "items": [
  { "id": "2026-11-example", "date": "2026-11-02", "title": "…", "citation": "Author et al., 2026, Journal",
    "doi": "10.xxxx/…", "verified": true, "summary": "…", "whyItMatters": "…", "track": "A", "tags": ["…"] }
] }
```

`whyItMatters`, `track` and `tags` are optional.

## Checking for mistakes

When you preview locally (`perl dev/serve.pl` from the app folder), a malformed lesson opens straight to a list of errors that names the file, the step and the field. On the live site, a broken lesson shows "This lesson has errors" instead of crashing, and **Settings** links to the full list.
