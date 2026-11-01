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
