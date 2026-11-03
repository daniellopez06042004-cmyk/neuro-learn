### 2026-11-02 (later): C6–C12 and D4–D8 are live, after an independent review (146 edits to copy)

**Imported:** 44 lessons, 57 glossary terms and the 11 unit definitions. Your prereqs work as written. No new term collides with link rendering, and the checker passes. The map now places each unit under the units it depends on, so links don't cross.

**1. Please copy these 45 lesson files from `app/content/lessons/` over yours, unchanged:** all 44 new lessons plus `D6-L2` (its gut-wall alt text, see 4). An independent review made **146 edits** in them. The full record, with old text, new text and the reason for each, is in `app/dev/review-C6-C12-D4-D8.md`. If you don't copy them, the next import will undo them.

**The 19 science fixes:**
- `C6-L2`: the mouse colon and pancreas are thin and immersion-fix well. The "thick organ fixes poorly by immersion" example is now the liver, and the s1 card argues from the brain.
- `C6-L4` s1: tissue scatters light because lipids and proteins have a different refractive index from water.
- `C7-L1` s3: antibodies raised against linear peptides usually *tolerate* fixation better, so that detail pointed the wrong way and was removed.
- `C7-L3` s4: "secondary-only" and "no-primary" are the same control. The second is now knockout tissue.
- `C7-L4` s4: mRNA in the same cells is independent *support* for an antibody stain, not confirmation (C8-L1 says the two can diverge).
- `C8-L1` s2: DNA-FISH does read DNA, so "neither reads DNA" was wrong.
- `C8-L2`: it is the *preamplifier* that needs both Z tails. One dot is one mRNA because about 20 ZZ pairs tile each transcript and their trees merge into one spot, not because each pair makes its own dot.
- `C8-L3` s2 variant: DAPI marks the nucleus, not the cell border, and most dots are cytoplasmic.
- `C10-L2` s3 and `C10-L4` s2: each had two defensible answers. A reference gene's Ct also shifts with unequal input, and a target can rise more than its loading control. The stems now rule those out.
- `C11-L1` s1: dissociated culture is one common way to reach single DRG neurons, not the only one (intact-ganglion GCaMP imaging is routine).
- `C11-L2` s2: GCaMP signal *usually reflects* activity. It is indirect, as the card says.
- `D4-L2` s3: Aα fibers are faster than Aβ. Also, "fewer nodes" was a second defensible answer, so it now reads "fewer sodium channels at the nodes".
- `D5-L1` s1: deep muscle and joint pain is dull and poorly localized, so "sharp and well-localized" now applies to skin only.
- `D5-L2` s2 variant: some colon mucosal afferents do respond to light stroking.
- `D7-L4` s1: sensory control of glucose is stated as settled, but s4 in the same lesson flags it as uncertain. It now reads "may help… still being worked out".
- `D8-L2` s4: "much of physiology", not "nearly all", is built from reflex arcs (much regulation is hormonal or intrinsic).
- `D8-L4` s1: without visceral afferents the brain loses its *direct neural* readout; hormones and enteric circuits still report.

**What kept coming up, for future batches:**
1. **Throwaway wrong answers (95 of the edits).** These are mostly in the short variants: "Neither", "Weigh the colon", "Pure coincidence", "The heart has no sensory neurons". Your length audit passes these, but nobody would pick them. Please write each distractor as a misconception a learner might actually hold.
2. **Setups that state the answer (21).** For example, `D5-L3` s2's variant said cardiac afferents converge with left-arm afferents, then asked where heart pain is felt. A related tell: the correct option is the only one that mentions the cue word, such as "light" in the optotagging questions.

**2. Please check one claim:** `C8-L4` s3 says the colon paper defines five DRG subtypes by TrkB, TH, Bmpr1b, Sstr2 and Adra2a. We couldn't confirm that list against Wolfson et al. 2023, and it mixes protein names (TrkB, TH) with gene symbols. Please check it against the paper and use gene symbols (Ntrk2, Th, …) if it holds.

**3. The slide papers didn't arrive.** `content/slides.json` in the shared folder has no `paper` fields: it was re-saved at 20:15 with the same content as before. Your note says all 40 are done, so the save must have been lost, as happened with your design-tools note. Please save it again.

**4. Gut wall: villi dropped, as you asked.** `gut-wall-layers.svg` now shows a colon mucosa: a flat surface and deep test-tube crypts lined with goblet cells. The `D6-L2` s1 alt text now says "colon mucosa with crypts". The new SVG is in your `content/assets/`.

**5. A2-L3: the DRG note is in.** The model's footer now reads: "DRG nociceptors fire wider spikes, carried largely by Nav1.8, a sodium channel that resists inactivation." I scoped it to nociceptors because large Aβ DRG neurons fire narrow spikes. The updated HTML is in your `content/assets/`.

**6. Your visual ideas for C6–C12 and D4–D8:** received. I'll build them once Dan gives the go-ahead.

### 2026-11-02: visuals overhaul, microscope in the slide box, and a request: one paper per slide

**1. A request: a `paper` for every slide.** Dan wants each slide to link to a published paper with a sample like the one on the slide, so he can read about it. Please add this to every entry in `slides.json`:
```json
"paper": { "citation": "Wolfson RL et al., 2023, Cell", "doi": "10.1016/j.cell.2023.07.007", "figure": "Fig. 2C" }
```
- **Choose a figure that shows the same tissue and stain (or close),** e.g. a DRG section stained for NF200/CGRP, or a whole-mount colon with CGRP fibers.
- **`figure` is optional but very helpful.**
- **Brain slides:** the Allen atlas paper is fine unless a paper shows the region better.
- **Same DOI rules as lessons:** check that each one resolves. The checker validates the field.
- **Until a slide has one,** the slide shows "Read about it", linking to its first source with a DOI.

**2. The slide box now has a microscope.** You drag the slide onto a stage and look through a round eyepiece. You can drag to move around, pinch to zoom, or switch between 4×/10×/40× objectives, with a scale bar that re-sizes as you zoom. Nothing to do on your side; it uses the existing drawings.

**3. Four more visuals are now live models (like A2-L3's action potential).** These are app-side files, but **please copy each new `visual` into your lesson files**, or a later import of those lessons will bring the old SVGs back. You can read them from the live JSON or from `app/content/lessons/`:
- `A2-L1` › `s2` → `assets/driving-force-model.html`. E_Na and E_K are computed with the Nernst equation at 37 °C from typical mammalian concentrations (Na⁺ 145/15, K⁺ 5/140 mM), giving +61 and −89 mV. That matches your "≈ +60 / ≈ −90". Drag Vm and watch both driving forces change.
- `A2-L2` › `s2` → `assets/graded-potential-model.html`. A passive ending (mechanically gated conductance) is coupled to a Hodgkin–Huxley spike zone. Gentle and firmer presses give graded receptor potentials (about 6 and 12 mV at the ending, smaller at the zone); a hard press fires a train. This matches your text on passive spread and the spike initiation zone. The ending's shape is a **real traced mouse skin afferent** (Wu, Williams & Nathans 2012, eLife; NeuroMorpho.Org).
- `A5-L1` › `s1` → `assets/fiber-race-model.html`. Myelinated speeds follow Hursh's rule (≈6 m/s per µm): Aβ 9 µm → 54 m/s, Aδ 3 µm → 18 m/s. C is ≈1 m/s. Over ≈1 m (a person's foot to cord) they arrive at 19 ms, 56 ms and 1.0 s. **Please check** the readout line: "That gap is why sharp first pain comes before burning second pain."
- `A5-L2` › `s2` → `assets/threshold-tiling-model.html`. The thresholds are **illustrative** and say so on screen. If the colon paper gives real threshold values or ranges for its subtypes, send them and I'll use them.

**4. All 20 diagram-style SVGs are redrawn** in place, with the same file names, entities and labels. They now use filled shapes, a subject that fills the frame, and animations told in 2–4 beats. Nothing to copy except two alt texts below. **Please check the depiction changes and open questions:**
- **Fixed in the drawing (please confirm):**
  - `piezo-gating`: the old drawing bulged the membrane *toward* the probe pushing it. It now dips under the probe.
  - `trp-gating`: capsaicin was shown acting from outside. It now enters the membrane, where its binding site is.
  - `gut-wall-layers`: the muscle orientation was inverted. In a cross-section, circular muscle runs in the plane and longitudinal muscle is cut across; this now matches the colon slide.
  - `dreadd-excite-silence`: hM4Di was drawn greyed out, which read as "not working". Both receptors are now active; the difference shows in the outcome traces.
  - `control-grid-anim`: both actuator cells now visibly get the drug.
- **Simplifications kept, flagged in case you want them changed:**
  - `tlr-pattern` omits the MD-2/CD14 helpers.
  - `antigen-presentation` draws MHC I and MHC II with the same shape.
  - `inflammatory-soup` leaves out bradykinin (the body lists it).
  - `gut-wall-layers` shows villi, which belong to the small intestine and not the colon. Fine if D6-L2 means the gut generally.
  - `pseudounipolar-neuron` draws the cord with the dorsal horn facing the DRG (schematic).
- **Alt texts updated on this side to match what's drawn. Please copy them:**
  - `B1-L2` › `s1` › `visual.alt` → "Three differently shaped bacteria each carry the same surface molecule, LPS. TLR4 receptors on an immune cell bind that shared pattern from all three, and the cell switches on a danger response."
  - `C4-L4` › `s1` › `visual.alt` → "Three filters — retrograde route, DIO switch, and a subtype Cre line — narrow 24 cells down to 2 target neurons." (The old alt said "the single target neuron", but the drawing has always shown 2.)
- **Optional:** `C4-L4` › `s1`'s body is about DIO/FLEX specifically, while the funnel shows all three filters. Ask if you want a DIO-specific visual.

**Your `content/assets/` folder now has the new files.** I copied the 20 redrawn SVGs and the 5 live-model HTML files into it, so your copies match the app. Edit those versions if you need to change one; don't restore the old ones.

**5. Real neuron shapes.** `dev/neurons.py` turns NeuroMorpho.Org reconstructions into drawable paths. FlyWire (Dan's suggestion) is a fly connectome, so we're using mouse cells instead: the Nathans lab's skin endings (Wu et al. 2012) and, later, the Todd lab's dorsal horn neurons. If you know a published mouse DRG reconstruction that has both the cell body and the stem, name it.

### 2026-11-02: A2-L3 now uses a live, model-driven action potential (pilot for the visuals overhaul)

**Dan approved a new kind of visual and it's live:** `assets/action-potential-model.html`, an `interactive` widget on `A2-L3` › `s1`, replacing `action-potential.svg` there. **Please copy this `visual` into your `A2-L3` › `s1`,** or the next import of A2-L3 will bring the old SVG back:
```json
"visual": { "type": "interactive", "src": "assets/action-potential-model.html",
  "alt": "A live Hodgkin–Huxley model: a membrane patch with sodium and potassium channels above a voltage trace. A strong stimulus crosses threshold; sodium channels open, then inactivate as potassium channels open, giving a spike, an undershoot and recovery. Buttons replay a weak stimulus (no spike), a strong one, or two quick ones (the second fails).",
  "caption": "Computed live from the Hodgkin–Huxley model. Tap a stimulus to replay." }
```
The HTML file is written and maintained on this side. You don't need a copy, and the import never deletes it. Leave `action-potential.svg` where it is.

**What it is:** a membrane patch with Na⁺ and K⁺ channels, a voltage trace, and a strip showing what fraction of each channel type is open. All of it is computed from the Hodgkin–Huxley equations (modern convention, rest −65 mV, squid constants at 6.3 °C), and nothing is hand-drawn.
- The **threshold line** is found by the model itself: the smallest 1 ms pulse that fires (about −59 mV).
- **Checked in Python against the textbook:** peak about +40 mV, undershoot about −76 mV, Na⁺ conductance peaking before K⁺, and a second stimulus failing for about 12 ms.
- **Buttons:** Weak (sub-threshold), Strong (spike) and Twice, fast (5 ms apart; the second fails). So it also illustrates `s2` (inactivation and the refractory period).

**Please review the science and wording.** The on-screen sentences are in the file's `phase()` function. In particular:
1. **Squid numbers vs. DRG numbers:** the footer says "Hodgkin–Huxley model neuron (squid axon values)". Is that enough, or do you want a line saying DRG spikes are wider and use Nav1.8?
2. **The rest of the lesson:** nothing else in A2-L3 states −70/−55/+30, so there's no conflict there. But other lessons may quote those numbers.

**Where this is going:** quantitative concepts (graded potentials, driving force, conduction with and without myelin, threshold tiling) can become live models like this one. The diagrammatic ones will be redrawn in a richer style. Dan is also keen on neurons drawn from real reconstructed cells. FlyWire is fly, so I suggested mouse sources (NeuroMorpho.org, the Allen Cell Types Database, Janelia MouseLight). More on that once Dan has seen the pilot on his phone.

### 2026-11-02: the two design tools (Taste Skill, animate)

**Your 2026-11-02 note never reached `NOTES-FOR-APP.md`.** Dan pasted it to me directly. The file was saved at 17:54, but its newest entry is still the 2026-11-01 one. Please check that the save went through.

**I checked both tools against their real GitHub repos and this Mac. Some details in your note were off:**
- **This Mac has no Node, Playwright or ffmpeg.** The visuals are animated SVGs written by hand; there's no rendering pipeline. Dan isn't a developer, so installing that toolchain is a real cost, not a formality.
- **The app isn't React.** It's plain HTML/CSS/JS with no build step.
- **Taste Skill isn't just markdown.** It ships Node scripts, needs Node 22+ and Chrome, and fetches stock photos. Its main job is designing marketing pages from scratch (it picks an "art direction" and redesigns).
- **animate needs Node, Playwright/Chromium and ffmpeg.** Narration also needs ElevenLabs. The app plays `mp4` muted and looping (iPhone only autoplays muted video), so a voice-over would never be heard. Each video would also add to the offline download.

**What we did instead:** I read Taste Skill's rules (its type, colour and app-screen guides, plus its list of tells) and audited the app against them by hand, without installing anything. I've proposed the shell changes to Dan.
- **Your figures:** nothing in that audit touches your SVGs or `VISUAL-GUIDE.md`. Track colours stay as they are.
- **animate:** skipped for now. If a concept truly can't be shown with an animated SVG, name it and we'll weigh a one-off video then.

### 2026-11-01: B8 caption and D6-L3 imported, nothing to fix

**Imported:** B8's new caption and your D6-L3 copy. The checker passes. B8 now stays on the `colon` slide, and the caption matches the drawing. Nothing to change on your side.

### 2026-11-01: "Because" sweep and slide fixes imported

**Imported:** 10 questions with "Because" stripped from their distractors (base and variant each), plus your 6 slide revisions. The checker passes, and **all 59 earlier edits are intact.** I read every changed question against its prompt: the options still fit as answers, and none gives the answer away. D2's slide now shows PVH alone, which matches its caption.

**One fix on this side, please copy it:**
- `D6-L3` › `s5` › `options[1]` (base **and** `variants[0]`): "So the pancreas doesn't digest itself; activated in the duodenum" → "It stops self-digestion; they're activated only in the duodenum". The old wording was ungrammatical ("activated" had no subject), and it was the only option starting "So…", a small tell.

**B8 is still a `request` in your copy, so the import turned it back into one.** I restored it on this side again. The gut-wall slide is **already drawn and live** (see the next entry down). Please change your B8 to:
```json
{ "unit": "B8", "tissue": "colon", "label": "gut wall", "stain": "CGRP · CD45 · DAPI", "caption": "…",
  "sources": [
    { "citation": "Wolfson RL et al., 2023, Cell", "doi": "10.1016/j.cell.2023.07.007", "verified": true },
    { "citation": "Zhang W et al., 2022, Cell", "doi": "10.1016/j.cell.2022.09.008", "verified": true } ] }
```
Write a caption about what's on the slide. A8 and B6 can use `colon` now too if you like.

### 2026-11-01: B8's gut-wall slide is drawn; new library tissue `colon`

**Your B8 request is built:** the library has a new tissue, `colon`, drawn from Wolfson et al. 2023 and Zhang et al. 2022. It shows a transverse section of mouse distal colon wall, lumen at the top, with the layers labelled.
- **The layers:** crypts in the mucosa, then muscularis mucosae, submucosa with two vessels, circular muscle, myenteric ganglia, longitudinal muscle and serosa.
- **CGRP+ fibers:** varicose fibers run up the lamina propria to just under the epithelium, wrap the submucosal vessels, run along the muscle and pass through the myenteric ganglia.
- **CD45+ immune cells:** mostly in the lamina propria, several right beside fibers.

**Stain (fixed for this tissue):** CGRP · CD45 · DAPI.

**Please update your copy of B8** so the next import doesn't turn it back into a request. I've made this change on this side:
```json
{ "unit": "B8", "tissue": "colon", "label": "gut wall", "stain": "CGRP · CD45 · DAPI",
  "caption": "…",
  "sources": [
    { "citation": "Wolfson RL et al., 2023, Cell", "doi": "10.1016/j.cell.2023.07.007", "verified": true },
    { "citation": "Zhang W et al., 2022, Cell", "doi": "10.1016/j.cell.2022.09.008", "verified": true } ] }
```
**For the caption,** your current "A drawn gut-wall section showing the neuroimmune unit in one view." reads like a description of the request. Please write one about what's on the slide, e.g. sensory fibers and immune cells side by side in the lamina propria.

**`colon` can be reused:** A8 or B6 could use it too, with their own label and caption. Add it to the library table: `colon` | Mouse distal colon wall, transverse, lumen up | CGRP · CD45 · DAPI.

### 2026-11-01: all-track variants and slides.json imported

**Imported:** all 65 changed lessons (variants on every track, 120 in all) and `slides.json` with all 40 units. The checker passes. The 5 slide DOIs check out on Crossref (Usoskin et al. is listed there as 2014, not 2015).

**The slide box is now live,** since `slides.json` exists. The 5 brain slides were drawn from these Allen sections: A6 thalamus/SSp, A7 and B9 medulla (AP, NTS, DMX), D1 isocortex/HPF, D2 hypothalamus.

**An independent review of all 120 variants found 35 to fix, plus some base steps with the same problems.** I made the 59 edits below on this side. **Please copy every one into your files,** or the next import will undo them. Three problems kept coming up:
1. **The prompt no longer fits the options.** Many variants now reuse the base options, but kept their own prompt, so the stem and the options don't read as one sentence.
2. **The setup gives the answer away,** often by restating the correct option.
3. **The "Because…" tell.** In several base questions every distractor began "Because…" and the correct answer didn't. Please check for this in new questions.

**The 59 edits** (`lesson` › `step` › field → new text, and why):

**Track A**
- `A2-L3` › `s5 › variants[0] › prompt` → "Inflammation shifts a nociceptor's Nav channels so they open at more negative voltages. What happens to its excitability?" (prompt must fit options that start "Excitability…")
- `A2-L4` › `s4 › variants[0] › prompt` → "The myelinated Aβ axon conducts much faster. What is the main way myelin speeds it up?" (options are "It…" clauses about myelin; none says which axon is faster)
- `A2-L4` › `s4 › prompt` → "Why does myelin speed conduction?" ("…mainly because it…" followed by "It adds…" doesn't read)
- `A2-L4` › `s5 › variants[0] › prompt` → "A mutation makes Piezo2 inactivate much more slowly. What happens to a normally rapidly adapting touch neuron?" (prompt must fit options that start "It…")
- `A3-L2` › `s2 › variants[0] › setup` → "Capsaicin, the active compound in chili peppers, opens TRPV1 on nociceptors." (the setup stated the answer)
- `A3-L2` › `s2 › variants[0] › prompt` → "Why does eating chili feel hot?" (prompt must fit the "Capsaicin opens…" options)
- `A3-L2` › `s4 › variants[0] › prompt` → "After paw inflammation, wild-type mice withdraw from merely warm stimuli. How do TRPV1-knockout mice respond after the same inflammation?" (stem gave away the result; options are outcomes)
- `A3-L2` › `s5 › options[0]` → "TRPV1 is expressed by essentially every neuron in the body" (distractors started "Because…", the answer didn't (a tell))
- `A3-L2` › `s5 › options[2]` → "TRPV1 is found only in muscle, which gives very clean access" (same "Because" tell)
- `A4-L3` › `s3 › variants[0] › setup` → "The gut wall is stretched constantly as its contents move through it." (the setup repeated the correct option)
- `A4-L3` › `s4 › variants[0] › prompt` → "Disrupting sensory Piezo2 changes gut transit. Does that prove sensory Piezo2 directly senses the stretch that drives transit?" (options are "Yes…/No…")
- `A5-L1` › `s3 › variants[0] › prompt` → "What does that suggest about the afferents carrying it?" (options start "They are…")
- `A5-L1` › `s3 › options[2]` → "C fibers are in fact the fastest-conducting class of axon" ("Because" tell)
- `A5-L1` › `s3 › options[3]` → "The brain simply ignores the Aβ input from the viscera" ("Because" tell)

**Track B**
- `B1-L1` › `s5 › options[1]` → "An early innate response, but no specific or long-term immunity" (without T and B cells there is essentially none (matches the explanation))
- `B1-L1` › `s5 › variants[0] › options[1]` → "An early innate response, but no specific or long-term immunity" (same)
- `B1-L2` › `s5 › variants[0] › setup` → "TLR4 is best known on macrophages, where it detects bacterial LPS." (the setup gave the answer away)
- `B1-L2` › `s5 › variants[0] › prompt` → "Why does TLR4 also matter for the nervous system?" (distractors are about TLR4)
- `B1-L2` › `s5 › options` → ["It isn't relevant; TLRs act only in blood-borne immune cells", "Glia and some neurons also carry TLRs, so the CNS can sense danger", "TLR4 functions only in plants, not in any mammalian tissue", "TLR4 directly blocks action potentials in nearby neurons"] ("Because" tell)
- `B1-L2` › `s5 › variants[0] › options` → ["It isn't relevant; TLRs act only in blood-borne immune cells", "Glia and some neurons also carry TLRs, so the CNS can sense danger", "TLR4 functions only in plants, not in any mammalian tissue", "TLR4 directly blocks action potentials in nearby neurons"] (same)
- `B1-L3` › `s5 › variants[0] › setup` → "Macrophages are usually taught as resident cells of the gut, lung, liver and skin." (the setup was the answer)
- `B1-L3` › `s5 › variants[0] › prompt` → "Why are resident macrophages also relevant to neuroscience?" (fits the options)
- `B1-L3` › `s5 › options` → ["Resident macrophages themselves conduct action potentials", "Macrophage-like cells reside in nervous tissue, e.g. microglia", "They divide to replace neurons lost to injury or disease", "Macrophages are found only in blood, never within tissue"] ("Because" tell)
- `B1-L3` › `s5 › variants[0] › options` → ["Resident macrophages themselves conduct action potentials", "Macrophage-like cells reside in nervous tissue, e.g. microglia", "They divide to replace neurons lost to injury or disease", "Macrophages are found only in blood, never within tissue"] (same)
- `B2-L2` › `s4 › variants[0] › reveal` → "MHC class I displays peptides made inside the cell, including viral ones, letting cytotoxic T cells spot and kill infected cells." (T cells don't kill "from the inside")
- `B2-L3` › `s4 › options[1]` → "An antibody binds one specific target: primary→protein, secondary→primary" ("secondary→it" was unclear)
- `B2-L3` › `s4 › variants[0] › options[1]` → "An antibody binds one specific target: primary→protein, secondary→primary" (same)
- `B3-L1` › `s3 › variants[0] › setup` → "Hormones like insulin travel in the blood to act on distant organs. Immune cells also secrete signaling molecules called cytokines." (copied s5's scenario and gave away "act locally")
- `B3-L1` › `s5 › options` → ["Local concentration and receptors: nearby cells get enough signal", "Cytokines never actually act on any target cell at all", "The distant cell has already died and cannot respond", "Cytokines can act only on neurons, never on other cells"] ("Because" tell)
- `B3-L1` › `s5 › variants[0] › options` → ["Local concentration and receptors: nearby cells get enough signal", "Cytokines never actually act on any target cell at all", "The distant cell has already died and cannot respond", "Cytokines can act only on neurons, never on other cells"] (same)
- `B3-L2` › `s3 › variants[0] › setup` → "A cytokine binds its surface receptor and, hours later, the cell is making new proteins." ("minutes later" is too fast for new protein)
- `B3-L2` › `s5 › variants[0] › prompt` → "A drug blocks JAK enzymes. What happens to signaling by cytokines that use JAK-STAT?" (prompt must fit the options)
- `B3-L3` › `s4 › variants[0] › reveal` → "Lowered thresholds mean normally sub-threshold stimuli now fire nociceptors — peripheral sensitization. Central sensitization also contributes to touch-evoked pain (allodynia)." (allodynia also involves central sensitization)
- `B3-L3` › `s4 › flag` → {"level": "simplified", "note": "Touch-evoked pain also involves central sensitization."} (same overclaim in the base)
- `B4-L1` › `s3 › variants[0] › setup` → "Most tissues are patrolled by immune cells that arrive from the blood." (the setup restated the answer)
- `B4-L1` › `s3 › variants[0] › prompt` → "Why does the CNS keep its own resident immune cells instead?" (fits the options)
- `B4-L1` › `s3 › options` → ["Blood-borne immune cells are simply too small to be useful", "The blood-brain barrier limits entry, so resident surveillance is needed", "Neurons themselves already act as the brain's immune cells", "The brain has no immune needs and never faces infection"] ("Because" tell)
- `B4-L1` › `s3 › variants[0] › options` → ["Blood-borne immune cells are simply too small to be useful", "The blood-brain barrier limits entry, so resident surveillance is needed", "Neurons themselves already act as the brain's immune cells", "The brain has no immune needs and never faces infection"] (same)
- `B4-L3` › `s5 › variants[0] › prompt` → "A mouse lacks the complement component that tags synapses. What do you predict for its developing circuits?" (fit, and the base is flagged uncertain)

**Track C**
- `C5-L2` › `s5 › variants[0] › options` → ["hM3Dq", "hM4Di", "Neither — you need optogenetics", "Both at once"] ("to excite / to silence" glosses gave the answer away)
- `C2-L3` › `s5 › variants[0] › prompt` → "You want to measure the branching of individual labeled afferent endings. What tamoxifen strategy fits?" (the correct option repeated the prompt)
- `C4-L4` › `s5 › variants[0] › prompt` → "Retrograde Cre from the pancreas plus a DIO silencing-DREADD AAV. Which neurons end up with the silencing DREADD?" (expression isn't silencing (no actuator given))
- `C5-L5` › `s6 › variants[0] › prompt` → "Before silencing pancreas-innervating sensory neurons during a glucose tolerance test, what's the honest set of outcomes to prepare for?" (the glucose readout had no antecedent)
- `C3-L4` › `s4 › variants[0] › prompt` → "What does that tell you about the design?" (the prompt echoed the correct option)

**Track D**
- `D2-L1` › `s3 › variants[0] › prompt` → "Which division of the nervous system is it a major component of?" ("Somatic motor" isn't an autonomic branch)
- `D2-L1` › `s3 › variants[0] › reveal` → "The vagus is the main parasympathetic nerve to the viscera; its sensory fibers (cell bodies in the nodose ganglion) carry much interoception." (nodose is a ganglion)
- `D2-L3` › `s3 › variants[0] › prompt` → "Neurons with cell bodies in the DRG innervate a visceral organ. Are they autonomic motor neurons?" ("report" gave the answer away)
- `D3-L1` › `s3 › variants[0] › setup` → "You're tracing a spinal nerve just outside the intervertebral foramen, distal to the DRG." (the setup gave the answer away)
- `D2-L4` › `s3 › variants[0] › prompt` → "Recent work reports an enteric-to-DRG pathway. Why is that noteworthy?" (keeps the base's "recent work" hedge)
- `D6-L2` › `s6 › variants[0] › prompt` → "DRG afferent fibers run in a thin sheet sandwiched between the inner circular and outer longitudinal muscle layers of the gut wall. Which structure are they alongside?" (the submucosal plexus is also between two muscle layers)
- `D6-L2` › `s6 › setup` → "You image a colon section where DRG afferent fibers carry a reporter. Many labeled fibers run in a thin sheet sandwiched between the inner circular and outer longitudinal muscle layers." (same ambiguity)
- `D6-L3` › `s5 › variants[0] › reveal` → "Keeping enzymes inert until the duodenum protects the gland; activation too early, inside the pancreas, is a key step in pancreatitis." ("causes pancreatitis" overstated)
- `D6-L3` › `s6 › variants[0] › flag` → {"level": "simplified", "note": "Exocrine function can also be reduced in diabetes; the point here is that the two compartments are distinct."} (the variant lacked the base's simplified flag)
- `D6-L4` › `s6 › variants[0] › reveal` → "CCK acts directly on rodent acinar cells, but in humans its effect is thought to be largely vagally mediated (this is debated), so state findings for the species you studied." (species difference is debated)
- `D6-L4` › `s6 › explanation` → "Mouse work is powerful, but here the wiring may differ between species: CCK acts directly on rodent acinar cells, while in humans its effect is thought to be largely vagally mediated (debated). State findings for the species you studied and flag translation as an open question. That habit will matter in your own pancreas experiments." (same)
- `D6-L5` › `s4 › variants[0] › reveal` → "The celiac ganglion is a sympathetic motor relay. Sensory fibers pass through it to their DRG cell bodies; some give off collaterals there, but their signal isn't relayed through it." (afferents give off collaterals in prevertebral ganglia)
- `D6-L5` › `s4 › explanation` → "The celiac ganglion is a sympathetic relay for *motor* fibers. Sensory fibers pass through it on the way to their [[pseudounipolar]] cell bodies in the DRG (D3); some give off collaterals there, but their signal isn't relayed through it. This is why retrograde tracing from the pancreas labels DRG cell bodies." (same)
- `D3-L2` › `s4 › variants[0] › explanation` → "The dorsal root is sensory; cutting it removes that root's sensory input (overlap from neighboring roots can mask the loss), while ventral (motor) output remains." (overlapping dermatomes)
- `D3-L2` › `s4 › reveal` → "Cutting the dorsal root removes that root's sensory input (overlap from neighboring roots can mask the loss) while motor output (ventral root) is spared — the classic demonstration that the roots are functionally separate." (same)

**Noted, not changed:** `C4-L3` › `s5` › `variants[0]` drops the Flp layer that the base step teaches. That's fine if it's on purpose.

**Slides: six captions don't match what can be drawn.** Please revise these:
- **D2 (brain):** no single coronal section contains both PVH and DMX, because they're far apart along the brain. The slide shows **PVH only**, but the caption names both. Pick one region, or change the caption.
- **C3 (`rnascope`, Bmpr1b · Th):** in DRG, Bmpr1b and Th probably mark *separate* populations, so the dots would show little overlap. That's the opposite of the "intersection" the caption describes. Choose two markers that genuinely co-express, or make the caption say the overlap is rare and that the intersection is what the experiment targets.
- **C11 (`drg`):** the caption says "dissociated DRG neurons", but the `drg` tissue is an intact ganglion section. Either describe it as a ganglion section, or ask for a dissociated-culture tissue with `"tissue": "request"`.
- **B5 (`cortex-if`):** the drawing shows the normal, sparse GFAP pattern. The caption says "reactive astrocytes". Either caption it as baseline (the reference you'd compare inflammation against), or ask for a reactive version with `request`.
- **C5 (`rnascope`, hM4Di · Fos):** with an inhibitory DREADD, Fos goes *down*. A drop in Fos is a weak check, because baseline Fos is often low. Consider an hM3Dq slide, where Fos rising is the classic check, or say the comparison is against an uninhibited control.
- **B1 (minor):** Lyz2 is also expressed by neutrophils, so it isn't a clean macrophage marker. "Myeloid cells (Lyz2)" is more accurate.

**B8 request received:** the colon wall with CGRP+ afferent endings and immune cells. I'll draw it from Zhang et al. 2022 and Wolfson et al. 2023 and add it to the library. It will also suit A8 and B6 if you want to reuse it there. Until it's drawn, B8's slide shows a placeholder.

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
