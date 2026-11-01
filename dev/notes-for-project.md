### 2026-10-31: visual redesign reviewed on a phone (dark and light)

**Overall: a huge improvement.** Every label is readable now, everything sits on the app's surfaces in both themes, and widgets went from 830–884px tall down to 225–372px. `intersection` and `control-grid-anim` are excellent as they are, and the new `pseudounipolar-neuron` works well in D3-L3. I reviewed each animation by freezing it at its start, middle and end.

**Your questions:**
1. **`offset-path`:** it renders and animates correctly in the app. Safari supports it on iOS 16 and later, so keep it. In fact, use it in `aav-retrograde` too (see below). If Dan sees a still dot on his phone, we'll switch to SMIL.
2. **"On" color:** agreed. Use the track color for "on" or "active", and reserve green for ✓ checks. That's now the house rule.

**Fixes, one line each** (no files of yours were changed on this side):
- `cre-lox.svg` › end state: two loxP triangles remain → **one**. Cre excision leaves a single loxP behind; the other goes with the excised STOP. This one is a science fix.
- `aav-retrograde.svg` › virus particles: they `translateY(-150px)` straight up from x≈168, but the axon runs diagonally from (180,300) to the fork at (150,150). So they leave the axon and stop about 18px to the side, never reaching the cell body. Animate them along the branch path with `offset-path` and end at the soma (116,150).
- `aav-retrograde.svg` › labels: the tissue ellipse has no "pancreas" label → add one. "· expresses" has a stray leading "· ". "inject AAV2-retro" sits on top of the virus at the terminal → move it beside it.
- `creer-tamoxifen.svg` › end state ("+ tamoxifen: on"): the reporter stays pale and no tamoxifen is visible → light the reporter in the track color with an "ON" badge and show tamoxifen bound to CreER. The CreER pill also sits over the DNA line, so nudge it off.
- `cno-clozapine.svg` › end state: the clozapine dot stops on the "blood–brain barrier" label and covers it → end it beside the neuron, or move the label to the left end of the dashed line. The word "clozapine" overflows its circle → make it a pill.
- `pseudounipolar-neuron.svg` › "to organ" overlaps the organ ellipse → move it to the side and label the organ itself (for example "colon / pancreas").
- `targeting-funnel.svg` › the top row of dots and the "24" overlap the funnel walls → inset the first row and put all the counts outside the walls.
- `dreadd-excite-silence.svg` › the "fires" label overlaps the spike trace → move it below or to the left.
- `tamoxifen-dose.html` › the range input is 18px tall → give it `min-height: 44px` (the thumb can stay small visually).
- Widgets › selected options: I couldn't see a ✓ on the selected chips in `targeting-composer` → please add one, as the guide asks.

**Changed in the app for you:** widgets now get `color-scheme: light dark` added automatically. Without it, dark mode painted a white backdrop behind your transparent widgets, under light text, so selected options became invisible. It's fixed for all four. The guide now asks you to include the line too.

**Still to come:** D6, then the capstone unit E.

### Earlier (all resolved)

- C1 + D1–D3 imported; the D3-L3 diagram is now in place.
- Glossary links read `[[term|shown]]`; match steps may repeat right-hand items for sorting.
- The C4-L3 flag and the "sensory-immune organ" wording are settled.
