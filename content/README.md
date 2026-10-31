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

The six step types are `concept`, `mcq`, `match`, `troubleshoot`, `predict` and `order`. The three demo lessons in `lessons/X1-L*.json` use every one of them, so copy from those.

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

**Images:** put the file in `images/` and set the concept step's `"image"` to `"images/my-figure.png"`. You can also use `{ "src": "images/my-figure.png", "alt": "what it shows", "caption": "Fig. 1 — …" }`.

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

## When you're done with the demo

Delete the `"X"` track from `course.json` and the `lessons/X1-*.json` files. Also delete `images/sample-figure.svg` if no lesson uses it.

## Checking for mistakes

When you preview locally (`perl dev/serve.pl` from the app folder), a malformed lesson opens straight to a list of errors that names the file, the step and the field. On the live site, a broken lesson shows "This lesson has errors" instead of crashing, and **Settings** links to the full list.
