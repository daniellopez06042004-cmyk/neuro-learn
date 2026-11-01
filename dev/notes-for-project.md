### 2026-11-01: Track A variants imported

**Imported:** all 20 changed lessons (A1–A5 variants plus your fixes to A1-L1, A1-L4 and C1-L5). The fixes check out.

**One fix made on this side, please apply it to your copy:** `A1-L3` › `s3` is a concept card but had a variant ("Where are two-point touch receptive fields largest and most sparse?"). Concept cards can't have variants, so the checker blocked publishing. It's the same idea as `s2` (two-point discrimination), so I **moved it onto `s2` as a second variant**. Unchanged otherwise.

**An independent review of all 33 variants: 25 fine, 8 fixed on this side.** Please copy these into your files:
- `A1-L1` › `s4` › `variants[0]` › `setup` → "The skin above a pure touch (Aβ) ending is gently warmed by a heat lamp (warm, not hot). Nothing touches or moves the skin." **My earlier suggestion was wrong:** moving air bends hairs, and hair-follicle Aβ endings fire to exactly that.
- `A4-L2` › `s3`: loss plus rescue shows a gene is *necessary*, not *sufficient*. Sufficiency needs the gene added to cells that never had the current, which is how Piezo1 was shown in HEK cells.
  - base `options[1]` → "That gene is necessary for this current in these cells"
  - `variants[0]` › `options[1]` → "The gene is necessary for this current"
  - `variants[0]` › `reveal` → "Loss plus rescue shows the gene is necessary for the current, and the rescue rules out an off-target effect. (Showing it's sufficient takes one more step: adding the gene to cells that never had the current.) This logic identified Piezo."
- `A4-L1` › `s4`: a stretched patch can still carry cytoskeleton, so it *suggests* intrinsic mechanosensitivity. The proof is the purified channel in an artificial bilayer, shown for Piezo1. Piezo itself was found by a knockdown screen, not by patch stretch.
  - base `reveal` → "A channel that opens to membrane stretch in an isolated patch is probably intrinsically mechanosensitive. The strongest proof is the purified channel opening in an artificial lipid membrane, later shown for Piezo1 (next lesson)."
  - `variants[0]` › `prompt`: "This shows" → "This suggests"
  - `variants[0]` › `explanation` → "Current from stretch alone, with no other cells or messengers, points to intrinsic mechanosensitivity. The strongest proof is the purified channel opening in an artificial lipid membrane, later shown for Piezo1."
- `A4-L1` › `s3` › `variants[0]` › `setup` → "Touch has to be signaled fast enough to adjust your grip as an object starts to slip." ("well under a millisecond" overstated it.)
- `A1-L2` › `s5` › `variants[0]` › `options[1]` → "Its firing rate climbs steadily as pressure rises". The old wording "(rate coding)" named the concept being tested, which gave the answer away.
- `A3-L4` › `s3` › `variants[0]`: distractors lengthened. Avoid "dose" here, since CNO dose is a real concern.
  - `options[0]` → "Which fluorophore the reporter used, and how bright it was"
  - `options[2]` → "How many years the authors have worked with mice"
  - `options[3]` → "Which solvent the actuator was dissolved in"
- `A2-L4` › `s4` › `variants[0]`: Aβ axons are also thicker, and length doesn't affect speed.
  - `setup` → "Compare a myelinated Aβ axon and an unmyelinated C axon."
  - `reveal`: append "(Aβ axons are also thicker, which helps, but myelin is the main reason.)"
- `A5-L1` › `s3` › `variants[0]`: being poorly localized comes from sparse, convergent innervation (A1-L3), not from fiber type.
  - `setup` → "Most gut and pancreas sensation arrives slowly."
  - `prompt` → "Which fiber type best fits that?"

**Length tells remain in three variants** (the correct option is 22–24 characters longer than any distractor), and their distractors are throwaways that make the answer obvious ("Which dye color was used", "Only …"). Please rewrite the distractors as plausible, length-matched statements like you did for the base questions:
- `A3-L3` › `s5` › `variants[0]` (correct: "Chemical and inflammatory danger, like acid and irritants")
- `A4-L1` › `s4` › `variants[0]` (correct: "Intrinsically mechanosensitive — opened by tension itself")
- `A5-L1` › `s4` › `variants[0]` (correct: "What stimuli actually drive it, since speed isn't modality")

Please run the same length-tell audit on variants for B, C and D before sending them.

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
