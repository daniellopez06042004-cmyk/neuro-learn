### 2026-11-01: A1–A5 + B1–B4 imported (31 lessons, 10 visuals, glossary now 123)

**Checked and live:**
- All 31 lessons pass, and every one of their 149 steps renders and grades in the app. All 75 glossary links in them resolve, and `RNAscope` is now defined (A3-L4 and A5-L3 use it).
- **All 20 DOIs** match Crossref on first author and year (Caterina 1997/2000, McKemy 2002, Jordt 2004, Bautista 2007, Coste 2010, Ranade 2014, Servin-Vences 2023, Usoskin, Sharma, Abraira & Ginty, Lemaitre, Poltorak, Nimmerjahn, Ginhoux, Stevens, Schafer, and the Wolfson and Qi papers). Nicely sourced. One small thing: Usoskin et al. is online in 2014 and in print in 2015, and you cite 2015, which is correct for print.
- Prereqs work: A2←A1, A3/A4←A2, A5←A3+A4, B2–B4←B1.
- **Visuals:** all 10 pass both lint rules, and I reviewed each one on a phone, frozen at several points. **Excellent:** `fiber-classes` (Aβ arrives first, then Aδ, then C), `threshold-tiling`, `clonal-selection`, `antigen-presentation` (MHC I → cytotoxic, MHC II → helper), `trp-gating`, `piezo-gating`, `inflammatory-soup`, and `action-potential` (it labels each phase as it happens).

**Fixes (one line each; I haven't changed any of your files):**
- `jak-stat.svg` › the key step doesn't show. The moving STAT (`.statMove`) does travel into the nucleus (y 150 → 250), but it fades to opacity 0 by about 70% of the loop. Meanwhile a static "STAT" square stays in the cytoplasm the whole time. So the final hold shows STAT apparently stuck outside while the gene is "ON", and the reduced-motion version (`opacity:0`) hides it entirely. Fix: keep the STAT (ideally drawn as a dimer) **visible inside the nucleus**, next to "target gene ON", through the end hold and in reduced motion. Dim or remove the static cytoplasm copy once it has moved.
- `microglia-pruning.svg` › end state: the microglion circle sits on top of the "weak synapse / complement tag" labels. Move the labels up or left, or stop the microglion slightly lower.
- `action-potential.svg` › the "threshold" label sits on the falling limb of the spike. Move it to the left end of the dashed line.

**Your question:** `offset-path` works in `fiber-classes`, `jak-stat` (the motion itself is fine), `trp-gating` and `piezo-gating`.

**Next:** the capstone unit E (it unlocks after C5 + D6, both live). After that, more A/B visuals. The most visual-hungry lessons with nothing yet are A2-L1 (the resting potential and driving force), A2-L2 (graded receptor potentials), A3-L4 (TRPs as tools and in the gut), and B1-L2 (TLR pattern recognition).

### Earlier (all resolved)

- D6 and all visual fixes are live; the two SVG lint rules are in the checker.
- Visual redesign done; dark-mode widget backdrop fixed in the app.
- Glossary links read `[[term|shown]]`; match steps can repeat right-hand items.
