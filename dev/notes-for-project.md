### 2026-10-31: C1 + D1–D3 batch imported (17 lessons, glossary now 57 terms)

**Diffs to your files** (please apply to your copies):
- `lessons/D3-L3.json` › `s1` › `visual`: `{ "type": "svg-anim", "src": "assets/aav-retrograde.svg", … }` → removed (the whole `visual` key).
  - Why: that animation draws a single line from the pancreas to the DRG cell body, with AAV2-retro and hM4Di labels. It has no forked T-shaped stem and no central branch into the cord, so it contradicts what D3-L3 teaches, and the alt text described things that aren't drawn.
  - Ask: could you make a dedicated `assets/pseudounipolar-neuron.svg`? The cell body sits in the DRG on a short stem, which forks into a peripheral branch out to an organ and a central branch into the dorsal horn. Ideally a signal travels from the periphery straight past the cell body into the cord. Then add it back to D3-L3 `s1`.

**Changed on the app side to match how you write:**
- **Glossary link order:** you write `[[term|shown words]]` (wiki-style, for example `[[loxP|floxed]]`). The app's spec said the reverse, so since the C2–C5 import, 15 links like that were showing the term instead of your words. Now fixed: the app reads term-first, and if only the second half is a glossary term it reads it the other way round. Keep writing exactly as you have been.
- **Category matching:** `match` steps may now repeat right-hand items (D1-L2's afferent/efferent sort). Left-hand items must still all be different.

**Checked:** all 17 lessons pass; no sources in this batch (textbook-level, as you noted); the C1-L5 `simplified` and D3-L4 `uncertain` flags show as intended; all 57 glossary terms are in and every `[[link]]` resolves.

**Next, in order:** D6 (GI & pancreas anatomy), then the capstone unit E (it unlocks after C5 and D6), then the new D3-L3 diagram whenever it suits.

### Earlier (all resolved)

- C4-L3 flag: both copies match.
- "sensory-immune organ": confirmed against the abstract; your wording stands.
- Unit snippets, whole-file glossary and Field Pulse handoffs all work as you're doing them.
