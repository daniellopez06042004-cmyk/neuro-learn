### 2026-11-01: new request: one microscope slide per unit (the slide box)

Dan approved a **slide box**: finishing a unit earns a specimen slide that drops into a lab slide box, and tapping it shows the section under the microscope with a caption. The app side draws the slides; **you decide what each unit's slide shows**, because that's content. Please write `content/slides.json` with one entry for each of the 40 units (A1–A10, B1–B9, C1–C12, D1–D8, E).

```json
{
  "slides": [
    {
      "unit": "A5",
      "tissue": "drg",
      "label": "DRG L4",
      "stain": "NF200 · CGRP · DAPI",
      "caption": "Large NF200+ neurons and small peptidergic CGRP+ neurons share one ganglion.",
      "sources": [{ "citation": "…", "doi": "…", "verified": true }]
    },
    {
      "unit": "A6",
      "tissue": "brain-coronal",
      "label": "brain",
      "stain": "Nissl",
      "atlas": { "regions": ["VPM", "VPL", "SSp"] },
      "caption": "…"
    }
  ]
}
```

**Fields:**
- `tissue`: pick one from the library below. The checker rejects anything else.
- `label`: what's handwritten on the frosted end, **12 characters or fewer** (e.g. "DRG L4", "cord L3", "sciatic").
- `stain`: must describe what the drawing shows; see the library. For `rnascope` you choose the two probe names (e.g. "Trpv1 · Calca · DAPI").
- `caption`: 1–2 plain sentences, true for the drawing, tied to the unit's big idea. No invented numbers.
- `sources`: optional but preferred; same rules as lessons (only `verified: true` after you've checked the DOI).
- `atlas` (only for `brain-coronal`): `regions` are **Allen Mouse Brain Atlas acronyms** (e.g. "VPM", "SSp", "NTS", "AP", "PVH", "CEA"). The app side finds the Allen section that contains them and highlights them, credited to the Allen Institute.

**The tissue library (what the app can draw today):**

| `tissue` | What's drawn | Stain (fixed) |
|---|---|---|
| `brain-coronal` | Real Allen atlas coronal section, any level; your `regions` highlighted | Nissl (plus an "atlas colours" toggle) |
| `drg` | DRG, longitudinal, with its root | NF200 · CGRP · DAPI |
| `cord` | Lumbar spinal cord, transverse (outline traced from the Allen Spinal Cord Atlas) | Luxol fast blue · cresyl violet |
| `nerve` | Sciatic nerve, semithin cross-section, fascicle edge | Toluidine blue |
| `islet` | Pancreatic islet with surrounding acini | Insulin · glucagon · DAPI |
| `microglia` | Cortex microglia | Iba1 · DAPI |
| `rnascope` | Cells with single-mRNA dots, two probes | your two probes · DAPI |
| `cortex-if` | Cortex from the pia down | NeuN · GFAP · DAPI |

**If a unit needs something the library doesn't have** (likely candidates: skin with nerve endings, gut wall with the enteric plexus, lymph node or spleen, nodose/vagal ganglion, sympathetic ganglion, vagus nerve), use `"tissue": "request"` and add:
- `"wish"`: one sentence on what the section should show, the stain and the species. Mouse preferred.
- `"references"`: 1–2 published figures to draw from (DOI or PMC link plus figure number).

The app side will draw it from those references, add it to the library and tell you here. Reusing a library tissue is fine when it fits: a nodose ganglion could use `drg` with a different `label` and caption.

**Until a unit has an entry**, its slide is still earned but shows a blank label. Send all 40 in one file when ready; partial batches are fine too.

### 2026-11-01: distractor rewrite + all 3 app requests are live

**Your three requests are built, tested and live:**
1. **Shuffled options** on every showing. In tests, 40 showings of a four-option question gave 18 different orders, with the right answer landing in every position. Grading and the "Correct answer: C." letter always matched what was on screen. Options starting with "Both", "Neither", "All of" or "None of" stay at the bottom.
2. **Glossary terms in questions**, rendered in prompts, options, matching tiles and ordering items. Before answering they're plain text, and tapping one just selects that answer. After answering they open the definition. Concept cards are unchanged. This also fixed a live bug: `[[…]]` links in question prompts and tiles were showing as raw brackets.
3. **Variants: your format works exactly as proposed**, so roll them out. The first showing is the base; a retry after a miss shows a different version; review avoids the version shown last time (it's stored per item as `v`). All versions share the step id. The checker validates each variant like a step (no `id`, no nested variants, not a concept card), and visuals inside variants are linted and cached too. Tested live: A1-L1 s4 came back on retry as its `predict` version.

**Your rewrite, independently reviewed** (all 134 base questions plus the 5 variants, old vs. new, read against each explanation): no rewritten distractor is defensibly correct, and no correct answer lost its meaning. Under shuffle, the remaining length differences are tiny (a median of 2 characters). **Two fixes, made on this side; please apply them to your copies:**
- `lessons/A1-L1.json` › `s4` › `variants[0]`:
  - `setup`: "A warm (not hot) cup rests on the skin over a pure touch (Aβ) ending." → "Warm (not hot) air flows gently over the skin above a pure touch (Aβ) ending, with no change in pressure."
  - `reveal`: "(Pressing the cup down *would* fire it…)" → "(Pressing on that skin *would* fire it…)"
  - Why: a cup resting on skin is itself a mechanical stimulus, so a rapidly adapting Aβ ending would fire once at contact. That made "Fires a single spike and then adapts" defensible.
- `lessons/C1-L5.json` › `s3` › `options[1]`: "It's 'significant' only because cells were counted as n; real n is 2" → "…'significant' **largely** because…" (pseudoreplication inflates significance; it doesn't wholly create it).

**Two small notes:**
- `A1-L4` › `s2` › `variants[0]`: the correct option is about 16 characters longer than any distractor (the only outlier left). Lengthen one distractor when you're next in there.
- 28 of the 134 questions kept identical option text. That's fine if they had no length tell; just confirm none were missed.

**Next:** roll out variants track by track, then the capstone unit E.

### Earlier (all resolved)

- A/B tracks, D6, the visual redesign and all fixes are live; two SVG lint rules in the checker; dark-mode widget backdrop fixed.
