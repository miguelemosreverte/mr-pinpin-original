# Story worlds browser review

Status: final visual and desktop/mobile runtime checks passed for all three selected stacks. All three final cubemap exports are enabled.

## Selected images and findings

| Scene | Selected stack | Actual sphere review |
| --- | --- | --- |
| Elderhouse | Base v1, rear/up/down v1, registered rear detail v1 | Rear split and pole pinching corrected. Detail removes doubled kettle/bowl/scroll edges in the broad repair overlap. A minor front rug weave-scale transition remains. |
| Chapter 1 lake | Base v2, rear/up/down v2 | Rear path/tree split and radial canopy/ground pinching corrected. Oblique shore/rock and canopy joins are coherent; image sharpness varies. |
| Tractor worksite | Base v2, rear/up/down v2 | Rear trunk join and pole pinching corrected. Checked machine side, logs, oblique ground and canopy without an obvious repair-induced duplicated silhouette. The copied unfinished bridge deck remains a worksite, not a completed crossing. |

Each scene was inspected at four level directions, near both poles (±89°), rear/up, rear/down, front/down, and rear/down yaw offsets ±0.35 rad. Elder’s repaired still-life was checked again at its failed camera and both adjacent directions. These are bounded visual checks, not a claim that every illustrated pixel is perfect or that unseen surroundings are book canon.

Elder detail parameters: yaw π, pitch −0.7 rad, 90° FOV; mask center [−0.05, 0.10], half-extents [0.32, 0.36]. Other selected repairs use the established 110° cardinal projection and feathering; outdoor scenes need no custom detail.

## What the multi-input comparison shows

The page visibly separates target-location book references from the successful kitchen panorama supplied as a spherical-format and finish reference. Elder received both categories initially. Lake and tractor v1 used location references; v2 added the successful panorama. Both earlier outputs and their records remain available. Adding that reference retained each outdoor setting’s identity, but did not by itself eliminate rear or pole defects. The targeted perspective repair and actual sphere inspection steps were still necessary.

The user’s positive response to the designs is distinct from the technical checks recorded here. No redesign followed that approval.

## Runtime and exports

The isolated `story-worlds.html` route reuses the existing panorama and cubemap renderers. Selecting a format preserves yaw, pitch and FOV. The wrapper resets the WebGL texture unit before constructing the cubemap renderer; no shared renderer was changed. The final download is a deterministic export of the complete selected stack, including Elder’s final detail, not a separate six-image generation. Top row: front/right/back; bottom row: left/up/down, each 90°. Export metadata records source hashes and pixel checks.

Checks at 1400px desktop and 390px handheld: native drag and touch pinch, keyboard look, scene/format selection, exact camera preservation, decoded reference/output images, exact prompt loading, no horizontal overflow and no page errors. Shared native controls were tested once; per-scene format/asset checks were separated to avoid repeating them. The test harness explicitly loads offscreen lazy thumbnails before checking decoding.

Evidence is on TB4 under `pinpin-story-worlds-20260924/browser-check/`: `elder-detail/`, `lake-final/`, `tractor-final/`, `elder-mode-{panorama,cube}.png`, and `final-*-results.json` with desktop/mobile captures. Initial failures remain in the base capture folders and `lake-v2/`, `tractor-v2/`.

Owned source: `docs/story-worlds.html`, `.css`, `.js`, `.config.js`, and this report. Existing tours and the official homepage are unchanged. No commit or publication was performed by this lane.

Final tractor checks ran on the isolated mini mirror at port18792 after the Air’s SMB mount stalled. The temporary review URL is `http://127.0.0.1:18791/story-worlds.html`; this infrastructure workaround changes no official serving. Final source module revision: `worlds-final-v1`.
