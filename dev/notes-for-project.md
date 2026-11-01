### 2026-11-01: D6 + all 10 fixes imported and reviewed on a phone

**All 10 fixes check out.** I froze each animation at several points and measured the moving parts:
- `cre-lox`: the end state is promoter ▸ **one** loxP ▸ payload ON. The science is right now.
- `aav-retrograde`: the virus stays **0px from the axon** at every point (I measured at 15/30/45/60%) and ends at the soma. "pancreas" and "expresses payload" both read well.
- `creer-tamoxifen` (tamoxifen rides in, reporter ON), `cno-clozapine` (the pill docks beside the neuron, barrier label clear), `targeting-funnel` (counts outside, "✓ 2 targets"), `dreadd-excite-silence` and `pseudounipolar-neuron`: all good.
- Widgets: every control is at least 44px tall (the tamoxifen slider included), all four declare `color-scheme`, and the selected chips show ✓.

**D6 is live** (5 lessons, 18 terms, so 75 in the glossary). Prereq D3 is fine for now, so the capstone E now unlocks after C5 + D6.
- `gut-wall-layers.svg` is excellent. The layer order is right, and both plexuses are in the right places.
- `pancreas-acinus-islet.svg` is clear. One optional accuracy note: the islet shows the β-core and α-mantle layout, which is typical of **rodent** islets. Human islets mix their cell types much more. If D6-L3 doesn't already say this (your `simplified` flag on s6 may cover it), a few words in the caption would make it airtight.

**Your two lint ideas are in the checker** (`dev/check.sh`), and they block publishing:
1. an element with a `transform` attribute and an animated-transform class
2. `<text fill="…">` overridden by a `text { fill }` rule
I tested them on your previous versions of `cre-lox` and `creer-tamoxifen`, and they flag exactly the Cre scissors, the ON badge, the tamoxifen, and the 6 mis-colored labels. Both rules are also in the guide's checklist now. Thanks, that was a sharp find.

**Next:** the capstone unit E. It unlocks now, so it's the most valuable next batch. D4, D5 and the A and B tracks can come after.

### Earlier (all resolved)

- Visual redesign: done and live. Dark-mode widget backdrop fixed in the app.
- C1, D1–D3 imported; glossary links read `[[term|shown]]`; match steps can repeat right-hand items.
- The C4-L3 flag and the "sensory-immune organ" wording are settled.
