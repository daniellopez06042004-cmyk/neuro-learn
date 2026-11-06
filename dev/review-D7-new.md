# Review of D7-L5 and D7-L6 (2026-11-06)

12 edits, already live in the app. Copy both lesson files from `app/content/lessons/` over yours.

## Science fixes (2)

- `D7-L5` › `s5 › explanation`: Plain 'some neurons' implies sensory/DRG neurons carry GLUT2, which isn't established (they run GLUT1/GLUT3); the documented GLUT2 neurons are central glucose-sensing ones, and the reported direct neuronal effects are a separate, hedged claim.
  - was: "GLUT2 is also in the kidney, liver and some neurons, so an STZ phenotype in a neuro study could partly reflect STZ's own off-target actions — not the diabetes alone."
  - now: "GLUT2 is also in the kidney, liver and some glucose-sensing neurons in the brain, and direct STZ effects on neurons have been reported, so an STZ phenotype in a neuro study could partly reflect STZ's own off-target actions — not the diabetes alone."
- `D7-L6` › `s6 › body`: Type 2 as a pure action-arm defect is a simplification stated as settled: progressive beta-cell secretory failure is part of the standard definition (insulin resistance plus relative insulin deficiency).
  - was: "Put it together with the kinetics: a **[[glucose tolerance test]]** gives a glucose load and watches it clear — faster in health, high and slow in diabetes. **Type 1** breaks the *secretion* arm (no β cells, no insulin — the STZ model, D7-L5); **type 2** breaks the *action* arm ([[insulin resistance]], blunted GLUT4). Same loop, two failure points."
  - now: "Put it together with the kinetics: a **[[glucose tolerance test]]** gives a glucose load and watches it clear — faster in health, high and slow in diabetes. **Type 1** breaks the *secretion* arm (no β cells, no insulin — the STZ model, D7-L5); **type 2** breaks the *action* arm ([[insulin resistance]], blunted GLUT4) — though beta-cell output usually falls over time too, so type 2 is rarely action alone. Same loop, two failure points."

## Questions that gave the answer away (1)

- `D7-L5` › `s2 › variants[0] › options`: Setup names GLUT2 and the answer was the only option naming GLUT2 *and* naming beta cells outright; trimmed the giveaway.
  - was: "Cells that express a lot of GLUT2, such as β cells" / "Cells with no glucose transporters of any kind" / "Only cells that are actively dividing at the time"
  - now: "Cells that express a lot of GLUT2" / "Cells with low GLUT2, which can't pump the STZ back out" / "Only cells that are actively dividing at the time"

## Throwaway wrong answers replaced (9)

- `D7-L5` › `s2 › options`: Old option (works only in a dish) is a throwaway nobody picks and doesn't answer 'what makes it selective'; route-of-delivery is a real learner misconception.
  - was: "β cells take it up through their GLUT2 transporter, which they express heavily" / "β cells are simply far more fragile than any other cell type in the whole body" / "STZ is an antibody raised specifically against the β-cell surface proteins" / "STZ only ever works on cells grown in a dish, never inside a living animal"
  - now: "β cells take it up through their GLUT2 transporter, which they express heavily" / "β cells are simply far more fragile than any other cell type in the whole body" / "STZ is an antibody raised specifically against the β-cell surface proteins" / "It's injected straight into the pancreas, so only islet cells ever meet it"
- `D7-L5` › `s4 › options`: 'STZ acts only on the liver' is a throwaway; confusing STZ diabetes with the high-insulin picture of type 2 is a mistake learners actually make.
  - was: "STZ mice: high glucose and low insulin; buffer mice: roughly normal" / "Both groups end up about equally diabetic, just from the injection itself" / "The STZ mice stay normal while the buffer mice become the diabetic ones" / "Neither group changes at all, because STZ acts only on the liver"
  - now: "STZ mice: high glucose and low insulin; buffer mice: roughly normal" / "Both groups end up about equally diabetic, just from the injection itself" / "The STZ mice stay normal while the buffer mice become the diabetic ones" / "STZ mice: high glucose and high insulin, since the pancreas compensates"
- `D7-L5` › `s4 › variants[0] › options`: 'The buffer kills the beta cells' is a non-answer to 'why inject'; mistaking the vehicle arm for a dose check is a real confusion about controls.
  - was: "To control for the injection itself, isolating STZ's effect" / "The buffer itself is what actually kills off the β cells" / "To give those control mice a milder form of diabetes"
  - now: "To control for the injection itself, isolating STZ's effect" / "To confirm the STZ dose was high enough to work" / "To give those control mice a milder form of diabetes"
- `D7-L5` › `s5 › options`: 'Makes neurons fire continuously, which is the intended effect here' is a throwaway; assuming the drug is inert once diabetes is established is the real misconception.
  - was: "GLUT2 isn't limited to β cells, so STZ can act off-target, including on neurons" / "STZ is physically unable to enter any tissue other than the pancreas at all" / "STZ makes sensory neurons fire continuously, which is the intended effect here" / "STZ has no effect on blood glucose, so the whole model is meaningless anyway"
  - now: "GLUT2 isn't limited to β cells, so STZ can act off-target, including on neurons" / "STZ is physically unable to enter any tissue other than the pancreas at all" / "Any neuron change must come from the high glucose, never from STZ itself" / "STZ has no effect on blood glucose, so the whole model is meaningless anyway"
- `D7-L5` › `s5 › variants[0] › options`: 'The citrate buffer tastes slightly sweet' is a joke option nobody picks; mistaking the intended exposure (hyperglycaemia) for the confound is a genuine error.
  - was: "STZ's own direct effects on non-β-cell tissues, including neurons" / "That the mice were simply stressed by being handled during the injection" / "That the citrate buffer used as the vehicle tastes slightly sweet"
  - now: "STZ's own direct effects on non-β-cell tissues, including neurons" / "That the mice were simply stressed by being handled during the injection" / "That high glucose itself, not the drug, changed the neurons"
- `D7-L6` › `s2 › options`: 'It works backward, making glucose' is a throwaway; reading 'good sensor' as 'high affinity' is the classic Km misconception.
  - was: "Its high Km keeps it unsaturated at normal glucose, so its rate tracks glucose levels" / "It runs flat out at every glucose level alike, giving one steady, constant output rate" / "It is the only enzyme anywhere in the β cell that can bind glucose at all" / "It works backward, actually making glucose instead of phosphorylating it"
  - now: "Its high Km keeps it unsaturated at normal glucose, so its rate tracks glucose levels" / "It runs flat out at every glucose level alike, giving one steady, constant output rate" / "It is the only enzyme anywhere in the β cell that can bind glucose at all" / "It binds glucose more tightly than hexokinase, so it detects even tiny rises"
- `D7-L6` › `s4 › options`: 'Converts the muscle cell into a beta cell' is a throwaway; thinking insulin gates resident transporters rather than recruiting them is a real misconception.
  - was: "It triggers GLUT4 transporters to move to the cell surface, letting glucose in" / "It pumps glucose directly across the membrane using its own chemical energy" / "It converts the muscle cell into a β cell that then makes its own insulin" / "It raises the cell's resting membrane potential to let the glucose come in"
  - now: "It triggers GLUT4 transporters to move to the cell surface, letting glucose in" / "It pumps glucose directly across the membrane using its own chemical energy" / "It opens glucose channels that are already sitting in the membrane" / "It raises the cell's resting membrane potential to let the glucose come in"
- `D7-L6` › `s4 › variants[0] › options`: 'Glucokinase is exported out of the cell' is a throwaway, and it left GLUT4 as a keyword only in the correct option.
  - was: "GLUT4 transporters move to the cell surface" / "The cell starts secreting its own insulin" / "Glucokinase is exported out of the cell"
  - now: "GLUT4 transporters move to the cell surface" / "The cell starts secreting its own insulin" / "GLUT4 transporters are pulled back inside the cell"
- `D7-L6` › `s5 › variants[0] › options`: 'Only the next day's levels' is nonsensical and unpickable; a too-short window tied to recent meals is the actual misconception about HbA1c.
  - was: "Weeks to a few months on average" / "Just the past few minutes" / "Only the next day's levels"
  - now: "Weeks to a few months on average" / "Just the past few minutes" / "Just the last meal or two"
