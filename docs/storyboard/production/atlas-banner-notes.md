# Atlas Banners

The map uses the four existing, text-free miniatures recorded in `covers.json`.
The full preview continues to use the localized title cover. Artwork and its
generation records are retained under `images/covers/<cover-id>/miniature/`.
Proposed miniature records are explicitly permitted for this atlas review;
their approval status and the original title-cover records are not rewritten.

## Placement

`atlas-banners.json` owns each location's authored placement:

- `anchor`: normalized map coordinates for the ground ring.
- `offset`: horizontal and vertical map-pixel offsets for the whole grounded banner.
- `elevation`: map-pixel gap above the anchor.
- `rotation`: X, Y, Z rotations in degrees.
- `scale`: per-banner artwork scale.
- `ground`: ring radius in map pixels and its tilt in degrees.
- `dots`: connector dot count.

The banner remains upright and faces the player, with restrained perspective.
Its footprint should sit beside the walking route, not cover the character.
Three white dots and a tilted ground ring explain its connection to the map.
The miniature is 160x240 at opening zoom and shrinks with the map at overview
scale, down to a 48px-wide plane before perspective. Text-free artwork permits
this smaller overview presentation without squeezing an unreadable title.
The map camera moves the anchor and the banner together. Offscreen placement
is clipped naturally rather than clamped to the screen edge.

Initial art direction: Home sits west of the doorstep route; Lake rises over
the open water above the southern shore; Elder sits east of the approach;
Timber sits behind the tractor at map point [1360,720], beside the crane.
Coordinates are reviewed in screenshots,
not inferred from the region center alone.

## Grounding Calibration (V9)

The v2 normal raster uses right-handed camera coordinates: X right, Y up,
Z toward the viewer. Its arbitrary depth scale 0.75 and ground span 0.65
produce a base-plane slope of 0.4875, too shallow for the authored ring tilt.
Banner grounding rescales normal tangent slopes by tan(tilt)/0.4875 exactly
once. It does not rotate an already-calibrated normal or change the shared
normal assets. Positive normal Y makes the upper ring edge recede; fallback
rotation is correspondingly negative around X.

A 5x5 neighborhood at six-map-pixel spacing rejects steep/reversed silhouette
normals and averages the ground-like half. This keeps a crane or shrub at the
anchor from defining the ring plane while preserving gentle terrain slope.
This is an artistic ground estimate, not recovered physical geometry.
Cover orientation and the vertical connector dots remain independent of it.

Tractor's authored anchor is [0.8854166666666666,0.703125] with radius 17.
The existing visibility solver resolves to [1360,720] on desktop/390px and
[1348,720] on 320px. Both clear the tractor loop by more than 75 map pixels.
Reviewed farther-east candidates at [1395,735], [1400,720] and [1410,726]
lost readability to foliage even after elevation and horizontal adjustment.

Card, ring and dots retain the same GPU color/depth coverage and calibrated
v1 foot depth; global lens focus uses its separate v2 ground-depth value.
There is no CSS stacking override. The artistic v1 occlusion map still has
limited silhouette accuracy, notably on bright crane surfaces.

V9 validation: 11 normal/calibration unit tests pass. The focused grounding
browser script passes at 1440x1000, 390x844 and 320x740, including basis,
upright cover, anchored dots and changed real GPU pixels under occlusion.
The existing surface suite passes 42/45 checks; all tractor checks pass,
with independent dense visibility 91.54%, 90.59%, 92.46%. Its three Home
visibility failures reproduce with original normal sampling and predate v9.
Screenshots with the default lens and with the lens disabled for geometry
inspection are recorded under /tmp/atlas-banner-v9-grounding/.

## Selection

Only one location is active. The input is Mr. PinPin's actual position, not
the camera center, pointer position, or planned walking destination.
Decoded segmentation supplies a precomputed nearest-region and confidence
field. Confidence measures geometric separation from competing regions; it
is not a statistical probability or image-model certainty estimate.
Low-confidence boundary movement retains the current choice. A sufficiently
confident new candidate must persist for a short debounce interval.

Lookup data stays in memory. Selection does not read image pixels, decode
artwork, fetch files, or scan the segmentation during movement. Banners reuse
their DOM elements and cached images across selection, panning, and zooming.
The packed RG8 field occupies 3 MiB. Its first byte is the region label; the
second stores confidence and a direct-mask-hit flag. The shipping field is
built offline and hash-checked, avoiding distance calculations at phone startup.
If it is unavailable or invalid, the detector can rebuild it from the mask.
Current thresholds are 20% confidence and 160ms of sustained candidacy.

## Review

Production controls stay unchanged: the map's language toggle, the contextual
banner, and the existing full-preview interaction. No placement editor or
diagnostic controls are added to the children's reading interface.

Browser verification covers desktop and phone-sized viewports, native touch
pan/pinch starting on the banner, and separate taps for preview and reader.
Phone checks use browser emulation and do not claim physical-device coverage.

Final checks: `scripts/verify-atlas-banners.cjs` passes 113/113 checks across
1440x1000, 390x844 and 320x740, including all four focused and overview
placements, character/path clearance, native gestures, image caching and
36 localized reader flows. Full-title review cases use `coverPreview=1`;
normal-mode checks retain the chapter titles' existing approval gate.
The field, selection and miniature unit suites pass 35 tests. The offline
field builder's `--check` reproduces the shipping binary byte-for-byte.
