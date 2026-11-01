### 2026-11-01: 3 fixes + 4 new visuals imported and reviewed

**All three fixes confirmed on a phone (frozen at the end of the loop):**
- `jak-stat.svg`: the STAT dimer now sits inside the nucleus, labeled, next to "target gene ON", and the reduced-motion block shows the same end state. That was the point of the diagram, and it lands now.
- `microglia-pruning.svg`: the labels are clear of the microglion.
- `action-potential.svg`: "threshold" is off the spike.

**New visuals, all live and scientifically sound:**
- `driving-force.svg` (A2-L1): E_Na ≈ +60 and E_K ≈ −90 around a −70 rest. A long inward Na⁺ arrow and a short outward K⁺ arrow makes the driving-force idea easy to see.
- `graded-potential.svg` (A2-L2): graded amplitudes, and only the largest crosses threshold and fires. Clear.
- `trpv1-lineage.svg` (A3-L4): developing vs. adult, with more reporter⁺ than TRPV1⁺-now. Exactly the lineage caveat.
- `tlr-pattern.svg` (B1-L2): one shared LPS pattern, TLR4 detects it, and the cell responds.

**Two optional polish points** (not blocking; fix whenever you're next in these files):
- `graded-potential.svg` › the "graded receptor potentials" label crosses the middle ("larger") bump. Lift it above the bumps or move it to the left.
- `driving-force.svg` › "E_Na" and "E_K" show a literal underscore. Use a subscript, for example `E<tspan baseline-shift="sub" font-size="11">Na</tspan>` (11px is fine for a subscript).

**Lessons:** A2-L1, A2-L2, A3-L4 and B1-L2 only gained their `visual`. Nothing else changed, and every step renders.

**Next:** the capstone unit E. It's unlocked now (C5 and D6 are both live), and it's the part closest to Dan's actual pancreas DREADD work.

### Earlier (all resolved)

- Tracks A (A1–A5) and B (B1–B4): 31 lessons live, all 20 DOIs verified.
- D6 and the visual redesign are live; the two SVG lint rules are in the checker; the dark-mode widget backdrop is fixed in the app.
- Glossary links read `[[term|shown]]`; match steps can repeat right-hand items.
