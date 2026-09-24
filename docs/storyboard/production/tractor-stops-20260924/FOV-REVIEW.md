# Video → V2 projection review

Actual browser captures compare the video at3.99999s with its V2 look-around opening view at the identical16:9 stage. Desktop viewport1440px produces a1372×771.75px stage; mobile390px produces358×201.375px. The settled panorama camera was yaw0.008315083783520577, pitch0.007868339068120121, vertical FOV89.4156598312888. Capture waited for completed seek and canvas opacity1.

| Viewport | Video | Current V2 |
|---|---|---|
| Desktop1440 | [Video](browser-check/fov/before-video-1440.png) | [Panorama](browser-check/fov/before-panorama-1440.png) |
| Mobile390 | [Video](browser-check/fov/before-video-390.png) | [Panorama](browser-check/fov/before-panorama-390.png) |

The video shows the whole machine with compact tires and surrounding space. The current spherical rendering expands the outer tires and crane, crops both ends and gives a close wide-angle impression. The center cab is much closer to the reference than the periphery. This is not fixed merely by reducing vertical FOV: that would crop a smaller portion of the same incorrectly interpreted art.

Projection correction is pending from the separate geometry lane. Original V2 is preserved; no runtime selection, image generation or source-frame texture overlay has been applied in this review. Any candidate must be checked in the same actual browser stage against these captures, plus side transitions. `capture-tour-fov.cjs` retains the browser capture procedure; `browser-check/fov/before.json` records the actual camera/stage/time.


## Projection candidate1: front improvement, periphery failure

The browser loaded `pilot/fov-correction/panorama-projection-v1.png` using a test-only configuration interception. Entry yaw0/pitch0/verticalFOV45; served default V2 was not changed. Desktop and mobile stage dimensions match the earlier captures exactly.

- [Corrected front, desktop](browser-check/fov/candidate-panorama-1440.png) and [mobile](browser-check/fov/candidate-panorama-390.png): whole vehicle visible; wheel proportions and framing substantially closer to the video.
- [Left−36°](browser-check/fov/candidate-left.png) and [right+36°](browser-check/fov/candidate-right.png): conspicuous rectangular transition and stretched forest outside the corrected region.
- [Up+22°](browser-check/fov/candidate-upper.png) and [down−22°](browser-check/fov/candidate-lower.png): severe foliage/ground elongation beside the front region. The lower view makes the limitation especially clear.
- [Lower-left corner](browser-check/fov/candidate-corner-left.png) and [lower-right corner](browser-check/fov/candidate-corner-right.png) are retained for adjacent-angle review.

Verdict: the corrected front solves the immediate close/wide-angle framing defect, but the available surrounding image is stretched strongly to absorb the changed projection. Mathematical absence of folds does not establish visual continuity. This candidate is a useful projection diagnostic, not a seamless look-around replacement. A second derivative preserves polar coordinates, but no claim about improved front-boundary continuity follows from that alone. Runtime selection remains with the coordinator after visual review. No new model calls, original-frame overlay or shared-renderer edits occurred.


## Candidate3: broader transition, still visibly distorted

Actual browser test loaded `pilot/fov-correction/panorama-projection-v3.png` with yaw0/pitch0/verticalFOV65. Both desktop/mobile used the same stage dimensions as before. A test-only config interception preserved the served default.

[Front desktop](browser-check/fov/candidate3-panorama-1440.png) and [front mobile](browser-check/fov/candidate3-panorama-390.png) retain the successful full-machine proportions. [Left−36°](browser-check/fov/candidate3-left.png), [right+36°](browser-check/fov/candidate3-right.png) and [lower-left corner](browser-check/fov/candidate3-corner-left.png) show smoother transitions than candidate1, but strong forest and floor elongation persists. The broader [left−48°](browser-check/fov/candidate3-left48.png) and [down−32°](browser-check/fov/candidate3-lower32.png) views make the residual stretching unmistakable.

Candidate3 improves the front framing and removes the earlier abrupt-looking transition, but is not an acceptable seamless360° correction. A positive projection Jacobian and preserved polar caps do not remove the visual shortage of correctly drawn peripheral content. No live configuration was selected by this lane. Reproducers: `capture-tour-candidate3.cjs` and `capture-tour-perimeter3.cjs`; exact results are retained externally as `browser-check/fov/candidate3.json` and `candidate3-perimeter.json`.


## Selected V4 preview and actual runtime

The coordinator generated one surroundings repair from projection candidate3, preserving the improved tractor-facing composition while replacing streaked surroundings. Actual browser captures at yaw0/pitch0/VFOV65 show good front, ±36° sides,−32° ground and+32° upper views. The prior stretched bands are gone in those inspected views. A hard vertical wrap seam remains at rear180°; its separate repair is pending.

After root visual selection, `tractor-tour.config.js` selects `panorama-repaired-v4.png` with the actual raw-frame fitted camera yaw0.003557808640356198, pitch0.0009270482291129821, verticalFOV65.41537697357725. The entry/app/config revision is `tour-fov-v4`. [Selected desktop capture](browser-check/tour-v4-look.png) and [mobile capture](browser-check/tour-v4-mobile.png) record the real runtime rather than a test override.

Focused actual-browser checks passed: decoded V4 texture, fitted canonical opening, entering wheel discarded, fresh wheel changes direction, real orbit drag wraps97%→5%, mobile390px load with no horizontal overflow, and no page errors. `TOUR-V4-RESULTS.json` and `verify-tour-v4.cjs` preserve this behavior check. `tractor-fov-review.html` provides the requested original-video / oldV2 / selectedV4 image comparison and exact camera/provenance links.

This is a preview selection. Generative detail drift, softer resolution and the rear wrap seam remain disclosed; this report does not assert pixel identity or completed full-sphere seam approval.


## Final rear repair and freeze

The selected stack now includes the110° registered `rear-v4-repair.png` on V4. Cache revision `tour-fov-v4r` was mirrored and opened by the coordinator. Actual browser captures at [rear180°](browser-check/fov/selected-repaired-rear180.png), [140°](browser-check/fov/selected-repaired-rear140.png) and [220°](browser-check/fov/selected-repaired-rear220.png) show the straight tree/rock split removed, without an obvious new doubled edge at those blend views. The sharper patch center transitions into softer surrounding art; no claim of exact texture/geometry identity is made. Root independently inspected all three and accepted the preview.

The front calibration and behavior tests remain applicable; only the rear texture was added. No redundant gesture suite was run. Main demo and simple comparison report are final for this bounded task. Earlier candidates and unmodified V2 remain preserved; no official page or shared renderer was changed.
