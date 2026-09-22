# Gait audit v1: visible pose holding, not four proven walking legs

**Confirmed:** the visible near hind paw in all three 180-degree profiles remains nearly fixed relative to the authored rendering anchor. PinPin spans **3.5 x 2 source px**; Mama and Pompom each span **6.5 x 1 px**. These are nearly held visible poses, not proof that every leg is frozen or that any limb is pixel-identical.

**Also confirmed:** 0-degree front paws mostly stay forward. PinPin and Pompom have only 4 and 2.5 px horizontal excursion but do have vertical bob. Mama's visible front paw wobbles only 11.5 x 5 px. The near hind paws at 0 and near forepaws at 180 do move. **Far hind motion is unobservable; hidden legs must not be called stationary.**

Four different images and four advancing frame indices do not establish a full forward gait. None of these seven profiles demonstrates a confidently traceable, complete plant/lift/swing/return sequence for all four anatomical legs. Old PinPin 0 already contains the same weak pattern and is not a physical-gait gold standard.

## Independent ear-landmark crosscheck

Bounded follow-up, not a full re-audit: manually picked the center of the visible near-ear inner concha (dark opening) independently in each frame, retaining the original toe picks. Reviewed full-body 2x grids, ear-detail 4x grids, and final ear/toe crosshair overlays. The ear is not derived from the foot-based rendering anchor.

| Profile / toe | Frame | Ear source x,y | Toe source x,y | Toe minus ear x,y |
|---|---|---|---|---|
| PinPin 180 near hind | 0 | 100,749 | 255,861 | 155,112 |
| PinPin 180 near hind | 1 | 411,749 | 566,854 | 155,105 |
| PinPin 180 near hind | 2 | 723,749 | 882,854 | 159,105 |
| PinPin 180 near hind | 3 | 1039,749 | 1192,855 | 153,106 |
| Mama 0 near fore | 0 | 209,148 | 252,262 | 43,114 |
| Mama 0 near fore | 1 | 519,148 | 552,268 | 33,120 |
| Mama 0 near fore | 2 | 832,148 | 872,262 | 40,114 |
| Mama 0 near fore | 3 | 1145,149 | 1180,268 | 35,119 |

- **PinPin 180 near hind:** ear-relative range **6 x 7 source px**, versus foot-anchor-relative 3.5 x 2. This is about 2.01% x 2.34% of reference width. The foot anchor itself moves 3 x 7 px relative to the ear. The original low y range partly hid vertical bob; **2 px must not be presented as body-relative vertical excursion**. The independent check still shows a limited-motion rear pose, not a large stance/swing sweep.
- **Mama 0 near fore:** ear-relative range **10 x 6 source px**, versus foot-anchor-relative 11.5 x 5; about 3.55% x 2.13% of reference width. The small forward-pose excursion persists without baseline normalization.
- **Uncertainty:** toe +/-3 px and ear +/-3 px per axis yield conservative +/-6 px per toe-minus-ear vector and +/-12 px on a peak-to-peak range. Conservative range bounds are PinPin x [0,18], y [0,19] px; Mama x [0,22], y [0,18]. These are additive picking bounds, not statistical intervals. Both include zero: exact freezing and resolution of the small movement are unproven.
- **Limit:** this is relative to an independent visible head landmark, not a rigid tracked hip or shoulder. Ear correspondence is visually clear, but subtle head rotation/body deformation cannot be ruled out. No inference extends to unobserved limbs or other profiles.

[PinPin ear/toe overlay](/tmp/atlas-gait-audit/pinpin-180-ear-toe-landmarks.png) and [ear detail](/tmp/atlas-gait-audit/pinpin-180-ear-detail.png); [Mama ear/toe overlay](/tmp/atlas-gait-audit/mama-0-ear-toe-landmarks.png) and [ear detail](/tmp/atlas-gait-audit/mama-0-ear-detail.png). Absolute and normalized coordinates, bounds, and unchanged source hashes are recorded under `independentBodyCrosscheck` in the JSON.

## Evidence and method

- Reviewed current source PNGs named in `family-production.json`, profiles 0 and 180 for all three characters; old PinPin profile 0 comes from `atlas-directions.js`.
- 28 source frames; 112 leg/frame slots; 76 manually marked visible/partial toe points. Unobserved slots stay null. No generated replacements, runtime changes, or peer relay.
- Source SHA-256, crop rectangle, crop-local anchor, absolute sheet anchor, toe source/crop coordinates, anchor-relative coordinates, normalized coordinates, visibility and certainty are recorded in [gait-audit-v1.json](gait-audit-v1.json).
- Mark is a representative exposed distal toe-pad point, not a claimed persistent anatomical digit. Blue = near fore, magenta = near hind, green = probable far fore. Source pixels were inspected at 3x on a gray background; grids are analytical screenshots, not altered source assets.
- x goes right, y goes down. `relative = toeSource - (cropOrigin + frame.anchor)`; `normalized = relative / referenceWidth`. For comparisons in walking direction, negate x at 180 degrees. Normalization retains each sheet's measured reference width, not its nominal camera angle.
- Manual near-paw position uncertainty is approximately +/-3 source px per axis; partly occluded far points +/-5. Ranges <=6 px are unresolved at near-paw picking precision, not statistically proven zero.
- The renderer's anchor lies near the feet, not a separately tracked anatomical hip. Baseline alignment partly explains low relative y movement. The results describe visible source poses relative to that anchor, not absolute anatomical stillness.
- All 76 marked coordinates land on colored paw pixels (alpha 240 or greater); overlays were visually checked. This validates pixel placement, not hidden anatomical connections.

## Measured excursion

Peak-to-peak range across frames 0, 1, 2, 3, relative to the supplied anchor. `World px` uses the current fixed displayWidth/referenceWidth scale, before camera zoom. The percentages use the sheet's referenceWidth on both axes.

| Character / profile | Visible leg | Source range x,y | Reference-width % x,y | World px x,y | Assessment |
|---|---|---|---|---|---|
| PinPin 0 | Near fore | 4, 28 | 1.36, 9.52 | 0.76, 5.33 | Mostly vertical bob; limited x sweep |
| PinPin 0 | Near hind | 35, 4 | 11.9, 1.36 | 6.67, 0.76 | Changes position; full cycle not established |
| PinPin 180 | Near fore | 19, 4 | 6.36, 1.34 | 3.56, 0.75 | Changes position; full cycle not established |
| PinPin 180 | Near hind | 3.5, 2 | 1.17, 0.67 | 0.66, 0.38 | Near-stationary; no visible swing |
| Mama 0 | Near fore | 11.5, 5 | 4.08, 1.78 | 3.43, 1.49 | Small forward-pose wobble |
| Mama 0 | Near hind | 29.5, 2 | 10.48, 0.71 | 8.8, 0.6 | Changes position; full cycle not established |
| Mama 180 | Near fore | 30, 3 | 9.92, 0.99 | 8.33, 0.83 | Changes position; full cycle not established |
| Mama 180 | Near hind | 6.5, 1 | 2.15, 0.33 | 1.81, 0.28 | Near-stationary; no visible swing |
| Pompom 0 | Near fore | 2.5, 11 | 0.88, 3.86 | 0.25, 1.08 | Mostly vertical bob; limited x sweep |
| Pompom 0 | Near hind | 19, 4 | 6.67, 1.4 | 1.87, 0.39 | Changes position; full cycle not established |
| Pompom 180 | Near fore | 19, 4 | 6.49, 1.37 | 1.82, 0.38 | Changes position; full cycle not established |
| Pompom 180 | Near hind | 6.5, 1 | 2.22, 0.34 | 0.62, 0.1 | Near-stationary; no visible swing |
| Old PinPin 0 | Near fore | 9, 26 | 3.16, 9.12 | 1.77, 5.11 | Mostly vertical bob; limited x sweep |
| Old PinPin 0 | Near hind | 35, 4 | 12.28, 1.4 | 6.88, 0.79 | Changes position; full cycle not established |

## Manual tracks

Values below are **anchor-relative source pixels**, in original frame order 0 -> 1 -> 2 -> 3. The JSON carries the corresponding absolute PNG coordinates and dimensionless values. Far-leg labels are probable anatomical attribution; visibility is more certain than linkage to a hidden root. A missing observation never means zero motion.

### PinPin 0

Source: [pinpin-a-v1.png](../images/atlas/family-production-v1/pinpin-a-v1.png). [Marked crop review](/tmp/atlas-gait-audit/pinpin-0-landmarks.png). Reference width 294; display width 56.

| Leg | Frame 0 | Frame 1 | Frame 2 | Frame 3 |
|---|---|---|---|---|
| Near fore | (87.5, -30) | (88.5, -13) | (86.5, -41) | (90.5, -29) |
| Near hind | (-118.5, -5) | (-83.5, -8) | (-103.5, -5) | (-104.5, -4) |
| Far fore (probable) | (-4.5, -8) | (22.5, -20) | (4.5, -23) | (50.5, -26) |
| Far hind | unseen | unseen | unseen | unseen |

Exposed underbelly paw changes position. Far-fore assignment probable, with proximal linkage hidden; frame 3 only partially exposed. No separately identifiable far-hind toe in any frame.

### PinPin 180

Source: [pinpin-b-v1.png](../images/atlas/family-production-v1/pinpin-b-v1.png). [Marked crop review](/tmp/atlas-gait-audit/pinpin-180-landmarks.png). Reference width 298.641; display width 56.

| Leg | Frame 0 | Frame 1 | Frame 2 | Frame 3 |
|---|---|---|---|---|
| Near fore | (-63, -17) | (-71, -15) | (-77.5, -13) | (-58.5, -15) |
| Near hind | (95, -8) | (94, -9) | (97.5, -8) | (94.5, -7) |
| Far fore (probable) | unseen | (-91, -49) | unseen | (-91.5, -46) |
| Far hind | unseen | unseen | unseen | unseen |

Visible lifted paw in frames 1/3; hidden or overlapped in 0/2. Similar visible positions do not establish a stationary leg. No separately identifiable far-hind toe in any frame.

### Mama 0

Source: [mama-a-v1.png](../images/atlas/family-production-v1/mama-a-v1.png). [Marked crop review](/tmp/atlas-gait-audit/mama-0-landmarks.png). Reference width 281.616; display width 84.

| Leg | Frame 0 | Frame 1 | Frame 2 | Frame 3 |
|---|---|---|---|---|
| Near fore | (82, -10) | (70.5, -8) | (77.5, -13) | (73.5, -10) |
| Near hind | (-116, -6) | (-86.5, -7) | (-109.5, -5) | (-104.5, -5) |
| Far fore (probable) | (-5, -7) | unseen | (0.5, -11) | unseen |
| Far hind | unseen | unseen | unseen | unseen |

Underbelly distal paw is identifiable in 0/2. In frame 1 a dark sliver overlaps the near forepaw without a reliable separate toe; frame 3 hidden. No reliable isolated toe. Frame 1 has a probable far-hind fragment behind the near hind leg, but the toe cannot be separated.

### Mama 180

Source: [mama-b-v1.png](../images/atlas/family-production-v1/mama-b-v1.png). [Marked crop review](/tmp/atlas-gait-audit/mama-180-landmarks.png). Reference width 302.372; display width 84.

| Leg | Frame 0 | Frame 1 | Frame 2 | Frame 3 |
|---|---|---|---|---|
| Near fore | (-65, -13) | (-59.5, -12) | (-79.5, -12) | (-49.5, -15) |
| Near hind | (107, -7) | (100.5, -7) | (106.5, -8) | (100.5, -7) |
| Far fore (probable) | unseen | (-80.5, -46) | unseen | (-82.5, -37) |
| Far hind | unseen | unseen | unseen | unseen |

Separate lifted paw in 1/3; no separate toe in 0/2. Occluded frames cannot be classified as stationary. No separately identifiable far-hind toe in any frame.

### Pompom 0

Source: [mr-pompom-a-v1.png](../images/atlas/family-production-v1/mr-pompom-a-v1.png). [Marked crop review](/tmp/atlas-gait-audit/mr-pompom-0-landmarks.png). Reference width 284.724; display width 28.

| Leg | Frame 0 | Frame 1 | Frame 2 | Frame 3 |
|---|---|---|---|---|
| Near fore | (77, -16) | (75, -9) | (77.5, -20) | (77, -18) |
| Near hind | (-111, -5) | (-92, -9) | (-109.5, -6) | (-104, -6) |
| Far fore (probable) | (-6, -7) | (16, -14) | (-3.5, -5) | (40, -15) |
| Far hind | unseen | unseen | unseen | unseen |

Underbelly paw moves visibly, but far-fore identity is probable rather than skeletal certainty. Frame 3 endpoint only partly exposed. No separately identifiable far-hind toe in any frame.

### Pompom 180

Source: [mr-pompom-b-v1.png](../images/atlas/family-production-v1/mr-pompom-b-v1.png). [Marked crop review](/tmp/atlas-gait-audit/mr-pompom-180-landmarks.png). Reference width 292.552; display width 28.

| Leg | Frame 0 | Frame 1 | Frame 2 | Frame 3 |
|---|---|---|---|---|
| Near fore | (-61, -16) | (-65.5, -15) | (-73.5, -12) | (-54.5, -16) |
| Near hind | (86, -7) | (91.5, -8) | (92.5, -7) | (90.5, -7) |
| Far fore (probable) | unseen | (-76.5, -46) | unseen | (-82.5, -47) |
| Far hind | unseen | unseen | unseen | unseen |

Partly exposed lifted toe in 1/3, occluded in 0/2. Two close observed positions cannot prove freezing through the hidden frames. No separately identifiable far-hind toe in any frame.

### Old PinPin 0

Source: [pinpin-directions-a-v1.png](../images/atlas/pinpin-directions-a-v1.png). [Marked crop review](/tmp/atlas-gait-audit/old-pinpin-0-landmarks.png). Reference width 285; display width 56.

| Leg | Frame 0 | Frame 1 | Frame 2 | Frame 3 |
|---|---|---|---|---|
| Near fore | (96, -35) | (87, -13) | (87.5, -39) | (94, -28) |
| Near hind | (-118, -6) | (-83, -8) | (-103.5, -4) | (-104, -5) |
| Far fore (probable) | (-3, -8) | (24, -19) | (3.5, -22) | (56, -25) |
| Far hind | unseen | unseen | unseen | unseen |

Visible underbelly paw moves substantially, but its root is hidden. Probable far fore; no proven continuous anatomical track. No separately identifiable far-hind toe in any frame.

## What is and is not established

- **Visible pose holding:** confirmed for the 180-degree near hind paw, strongest for PinPin. Mama/Pompom's small 6.5 px x variation sits just beyond nominal picking resolution; call them near-stationary, not exact duplicates.
- **Small front-paw motion:** confirmed at 0 degrees. PinPin's 28 px vertical bob is real, so calling that whole leg motionless would be wrong. Pompom's full observed front-toe motion is only about 0.25 x 1.08 world px; Mama's about 3.43 x 1.49.
- **Other visible paws move:** 0-degree near hind range is 35 px PinPin, 29.5 Mama, 19 Pompom. At 180, near fore range is 19, 30, 19 px. Their existence disproves a blanket all-legs-frozen statement.
- **Hidden limbs:** no far hind toe is separately identifiable. Mama 0 frame 1 has a probable far-hind fragment behind the near leg, but no reliable toe. Far forepaws at 180 appear only in frames 1/3; they could move while hidden in 0/2. Their small observed-pair ranges are not complete-cycle measurements.
- **Complete forward gait:** not demonstrated. No reliable support-contact transitions or full four-leg anatomical continuity can be established from these four-frame sheets. This is a failure of gait evidence, not proof of four permanently static legs.
- **Old reference:** old PinPin 0 near fore range is 9 x 26 px and near hind 35 x 4, closely matching new PinPin's 4 x 28 and 35 x 4. Reusing that reference propagates its weak fore-aft motion.

First repair targets: the 180-degree held rear paw across all three characters, then the 0-degree forepaw stance/swing poses, especially Mama/Pompom. Any replacement should expose enough leg identity and actual contact/lift changes to permit this same audit again. No repairs or new images were made in this lane.
