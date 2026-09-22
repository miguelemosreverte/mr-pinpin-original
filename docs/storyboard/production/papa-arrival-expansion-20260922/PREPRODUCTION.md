# Papa arrives: twelve new moments

Status: generated review candidate, not user-approved, 22 September 2026. No official story manifest or selected release is changed by this plan. The generation journal beside this plan records the exact prompts and references actually used; original prompt records remain immutable.

## Objective and insertion map

Miguel asks for at least ten additional images that follow the children after they spot Papa: a window exchange from both viewpoints, rushing to tell Mama, her happiness, and her opening the door. This plan adds twelve illustrations to the existing fifteen scene illustrations. The title remains separate: 27 story images plus one title.

The current story is `docs/storyboard/stories/elder-papa-home.json`. Existing images remain intact and in their existing order. Insert `arrival-01` through `arrival-04` after `elder-r6-family-002`; insert `arrival-05` through `arrival-12` after `elder-r6-family-004`, before the beautiful doorstep hug in `elder-r6-family-005`. The JSON `sequence` is the authoritative proposed reading order. `afterScene` refers to the existing manifest scene index, where the title is index zero, not the expanded page number.

The existing 003 and 004 remain a short outside action pair: Scooby pauses at the mounting stone, then Papa dismounts. This is a brief intercut after PinPin turns from the window; the next four new images stay with PinPin and Mama before cutting outside again. Small caption bridges remove repeated discovery in 003 and repeated door opening in 005. Those changes are proposed in JSON, not applied to the published manifest.

| New image | Action / reason for cut | Existing anchor |
| --- | --- | --- |
| arrival-01 | Papa's actual view of PinPin at the round window | after 002 |
| arrival-02 | Move inside beside PinPin: his waving paw and intent gaze | after 002 |
| arrival-03 | PinPin's view: Papa waves back, Scooby notices | after 002 |
| arrival-04 | PinPin is already mid-room and turns his head toward Mama on the left | after 002 |
| arrival-05 | Low tracking angle across the kitchen to the bread counter | after 004 |
| arrival-06 | PinPin tells Mama that Papa has arrived | after 004 |
| arrival-07 | Mama's response, directed toward PinPin | after 004 |
| arrival-08 | PinPin shares the news with baby PomPom; paws touch | after 004 |
| arrival-09 | Only now cut outside: Papa and Scooby wait by the closed door | after 004 |
| arrival-10 | Follow Mama carrying PomPom, with PinPin beside her | after 004 |
| arrival-11 | Exterior over Papa’s shoulder: Mama opens the door outward, with both children visible | after 004 |
| arrival-12 | From inside, PinPin crosses toward Papa's opening arms | after 004 |

Each beat has one or two short preschool sentences in English, Russian and Spanish in `story-plan.json`. Dialogue belongs below the illustration, never painted into it.

## Generated candidate progress

Twelve new selected illustrations are now present, from sixteen generation calls: twelve initial images and four revisions. The revisions repaired arrival-02's outdoor background, arrival-09's door hardware, arrival-11's door swing/viewpoint, and arrival-12's open-leaf side. All versions and their original prompt records are retained. `generation-plan.json` identifies the selected output for each beat; those paths are also recorded as `selectedImage` in `story-plan.json`. Generated does not mean approved or published.

Three camera/blocking descriptions now follow the actual selected images. Arrival-01 uses blurred Papa quills at lower-left foreground rather than a dog-ear edge. Arrival-04 places PinPin already mid-room, turning his head toward Mama at interior-left, rather than showing his first step off the sill. Arrival-11 is now outside, over Papa's shoulder into the doorway: Mama and both children are visible, and the green leaf opens outward to exterior-left. Its approximate camera is `(-0.5,-2.6,1.0)` looking toward `(0,0.1,1.0)` in H coordinates. The earlier camera/blocking plans remain in the JSON's `initialPlannedCamera` and `initialPlannedBlockingAndGaze` fields; the immutable generation records have not been rewritten.

Identity and environment authority remain the approved source references listed below. References to newly generated candidates within revision requests are editing targets, not a claim of user approval.

## The family remains the same family

PinPin is the child who can stand at the window and hurry across the floor. PomPom is an infant in the existing edition, around half PinPin's height, and remains continuously supported in Mama's arms. He is included in the excitement at the counter and at the doorway. Do not create a second walking child simply to interpret “children at the window” literally. Mama has not looked outdoors yet; PinPin's news causes her reaction.

Papa and Mama are around 1.6 times PinPin's standing height. Papa has a mature broad cream face, clear warm hazel irises and soft facial shadows. Mama has her warmer reddish-brown quills and existing rounded face. Scooby remains much larger than a hedgehog, short-haired brown/brindled, folded ears, cream muzzle/chest and one curled tail. His face uses the same soft animated-feature design as the hedgehogs. The previous pet-photo/PBR rendering and Papa's dark button eyes are explicitly rejected directions, not references to reintroduce.

Before reunion: three hedgehogs indoors, Papa outdoors with Scooby. Reunion: exactly four hedgehogs and one dog. No extra siblings, vanished infant, duplicated Mama, clothing, reins, saddle or travel satchel at this point in the morning.

## House and camera coordinates

Use the established H frame: threshold `(0,0,0)`, positive Y inside the cottage, negative Y toward the garden, positive X to exterior-right, positive Z up. Coordinates are approximate story-scale blocking aids rather than physical survey measurements.

Facing the house from outside, PinPin's window in scene 002 is LEFT of the door. Facing the same front wall from inside, it is therefore RIGHT of the door. The kitchen master image 008 puts the bread counter on interior LEFT (positive X), the stove and dining table on interior RIGHT (negative X). PinPin crosses the floor from the window toward the counter; do not mirror the room to preserve a convenient screen direction. The round rug stays central and the route goes around it.

```
                       HOUSE INTERIOR (+Y)
       stove / table          central rug           bread counter + Mama
          (-X)                                            (+X)
   PinPin window             green front door          opposite window
     (-1.4,0)                    (0,0)                    (+1.4,0)

       mounting stone          garden path             water bowl
         (-2,-2)                 (0,-6)                    (+2,-2)
                         GARDEN (-Y)
```

The green door has ONE brass knob. In the exterior closed-door view its hinges are LEFT and knob RIGHT; the interior view reverses them. It opens OUTWARD toward exterior-left, consistent with the open leaf beside the reunion. Existing open-leaf images can make the visible inside hardware appear reversed again: read the leaf's attached hinge edge, not a single frame's global left/right. Keep PinPin clear of the moving leaf. Mama's carrying forearm supports PomPom throughout; her other paw leaves the breadboard before reaching the knob. No knife, plate or loaf follows her to the door.

Warm early morning light enters from the garden through windows and door. Preserve the soft mist outside and warm interior bounce. Reverses may place the lit side of a face on the other screen edge; they must not invent another sun or overexpose the eyes. Papa POV is high from Scooby's back. PinPin POV is low from the window. These are spatially distinct images, not alternate crops of the same camera.

The JSON records a camera position, look target, height, field of view and explicit actor blocking/gaze for every beat. Numeric coordinates remain approximate staging estimates, including the updated exterior viewpoint, rather than measurements recovered from a generated raster. In the POV shots only the addressed person looks near the lens; all other gazes target their actual partner. In interior conversation, Mama looks down toward PinPin, PinPin looks up, and the infant follows their interaction. Papa and Scooby look toward the window/closed door while waiting, not vaguely offstage.

## Reference authority and provenance

Canonical runtime references, relative to the source checkout:

- `docs/storyboard/images/published/elder-cycle/elder-r6-family-002.webp`: PinPin identity, round window, child-to-sill relation and exterior left window.
- `docs/storyboard/images/published/elder-cycle/elder-r6-family-003.webp`: accepted Papa/Scooby appearance, scale and riding support.
- `docs/storyboard/images/published/elder-cycle/elder-r6-family-004.webp`: existing dismount and mounting stone.
- `docs/storyboard/images/published/elder-cycle/elder-r6-family-005.webp`: existing reunion, Mama/infant support, open door and exterior dressing.
- `docs/storyboard/images/published/elder-cycle/elder-r6-family-008.webp`: interior master, counter/stove/table geography and family style. This is geography/identity reference only; its post-reunion Papa must not appear in new pre-reunion interior scenes.
- `docs/storyboard/images/published/elder-cycle/export-manifest.json`: exact selected source image mapping and checksums.

Retained source originals live in the sibling `mr-pinpin-cover-standard` checkout. Under its `docs/storyboard/` directory:

| Role | Path |
| --- | --- |
| Window original | `images/chapter-02-expanded/revision-04/scenes/scene-004-v1.png` |
| Accepted mounted Papa/Scooby | `images/chapter-02-expanded/revision-04/style-tests/scene-002-style-v1.png` |
| Dismount original | `images/chapter-02-expanded/revision-05/scenes/scene-003-v2.png` |
| Reunion original | `images/chapter-02-expanded/revision-05/scenes/scene-005-v3.png` |
| Kitchen master original | `images/chapter-02-expanded/revision-06/family/floor-settle-v2.png` |
| Family identity/proportion study | `images/chapter-02-expanded/revision-05/preproduction/family-style-v3.png` |
| Papa/Scooby style correction study | `images/chapter-02-expanded/revision-04/style-tests/papa-scooby-style-study-v2.png` |
| Original Elder/PinPin rendering authority | `images/chapter-02-expanded/revision-03/home-edits/home-51-v1.png` |
| Shared continuity bible | `production/chapters-02-04/revision-06/elder/bible.md` |

The worker directly inspected the runtime reunion005, kitchen008 and family-style-v3 study and read the scene003 style-transfer prompt, reunion005 correction prompt/transform record, existing story manifest, shared bible, production workflow, asset policy and licensing notices. Root inspected window002 and mounted003 as well. Every image reference must be viewed by the generating agent before being passed to generation; this note is not a substitute for that inspection.

Use shared clean character studies to avoid accumulating scene artifacts. Limit each reference to its role; a frame containing Papa does not authorize Papa in a kitchen scene before he enters. Original dog photography is not a rendering-style reference. Exact references/hashes used in each request belong in the generation journal, not a retrospective claim that all sources were used.

## Review and acceptance

Generate one complete landscape illustration per beat. Review the images at full size, then as a scrolling sequence with their actual captions. Check partner eyelines, adult/baby support, paw attachments, window/door geography, door hardware and motion, Papa's location before and after dismount, soft shared facial rendering, and the causal chain from child noticing to Mama welcoming. Count new usable illustrations, not attempts or contact-sheet panels.

Show the existing opening and expanded proposal as a clearly marked review. Keep rejected variants and their records; do not overwrite existing art. User approval is still needed before these proposed illustrations replace or extend the official chapter. Do not interpret past approval of other chapters as approval of these newly generated images.
