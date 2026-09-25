# All 24 tractor stops: completed experimental exports

**24/24 source-locked cubemaps are registered and exported.** All entries are experimental: protected source geometry is controlled, while generated surroundings retain visible joins. The strict final browser run also passed all 24 entries and returns, canonical cameras, cube links and desktop/mobile controls. This verifies runtime behavior; it does not remove the scenery limitations below.

[Open the same local source-lock demo](http://127.0.0.1:18791/tractor-tour.html?sourceLock=1&stop=stop-01&rev=all24-exact).

## Current workflow

The 24 timestamps sample the existing orbit video with denser coverage where it turns faster. They are approximate visual stops, not measured 15° positions or a recovered 3D camera path. Original frame bytes, frame numbers and timestamps remain in [frames-manifest.json](frames-manifest.json).

Production projects each source rectangle into a neutral 2:1 guide, normally at authored 65° vertical FOV. The guide is the first outpainting canvas; source image controls the vehicle, lighting and materials. A successful sphere supplies projection context where used. Some rejected angle-copying candidates were replaced without that third reference. Returned panoramas are fitted for yaw/pitch/FOV and visually inspected over the whole machine; central feature matches alone do not guarantee registration. Demonstrated rear-wrap and pole pinches receive registered 110° perspective repairs.

The selected panorama remains the generated background. Runtime projects the unchanged decoded video frame over its known 16:9 field at the same selected camera, with a narrow 0.94–1 edge feather. This controls the tractor independently of model redraws. Deterministic source-locked exports are separate: a full sphere, 3×2 cube atlas and six faces. Cube order is front/right/back; left/up/down. Downloaded spheres/forward views resample the source; they are not byte-identical raw frames.

## What exactness means

The completed stop 04 display test compares the same GPU flat-video path with canonical source-locked entry at actual video time 4.0 s. In the protected inner 88%, mean and p95 RGB difference are both 0.0; full-frame mean 2.79/255 includes the intentional outer feather. See [STATIC-INTEGRATION.md](STATIC-INTEGRATION.md) and its native-frame/GPU proof links. This is measured protected-center display identity at that tested anchor, not a blanket pixel measurement for every exported cube.

Scenery outside the known field is generated. Several stops retain geometry/tonal cuts as well as sharpness changes; these are listed separately below. Miguel deferred original motion-blur refinement until all cubemaps exist. That deferral does not turn a scenery geometry defect into a blur-only issue or establish seamlessness. The source texture remains unchanged.

## Per-stop registration

Ready means a selected descriptor and actual anchored cube exist. Each row links the responsible lane review; the final 24-stop browser gesture pass is recorded below.

| Stop | Video time, s | State | Geometry / scenery limitation |
| --- | ---: | --- | --- |
| [00](stops/stop-00/source-lock-review.md) | 0.000 | Ready · experimental | Both side cuts and lower scenery geometry differ. |
| [01](stops/stop-01/source-lock-review.md) | 2.500 | Ready · experimental | Good sampled perimeter; narrow bent left-ground transition. |
| [02](stops/stop-02/source-lock-review.md) | 3.000 | Ready · experimental | No major sampled slice; lower leaf/softness transition. |
| [03](stops/stop-03/source-lock-review.md) | 3.500 | Ready · experimental | V2 improves sky/ground slice; side, rock and sky joins remain. |
| [04](STATIC-INTEGRATION.md) | 4.000 | Ready · experimental | Protected-frame display proof; legacy surroundings have obvious rectangle joins. |
| [05](stops/stop-05/source-lock-review.md) | 4.750 | Ready · experimental | V2 improves framing; side/lower vegetation and right-tree context differ. |
| [06](stops/stop-06/source-lock-review.md) | 5.250 | Ready · experimental | Rear/poles corrected; lower sharpness/tonal transition. |
| [07](stops/stop-07/source-lock-review.md) | 5.625 | Ready · experimental | Rear/poles corrected; lower sharpness/tonal transition. |
| [08](stops/stop-08/source-lock-review.md) | 6.000 | Ready · experimental | Rear/poles corrected; lower sharpness/tonal transition. |
| [09](stops/stop-09/source-lock-review.md) | 6.375 | Ready · experimental | Rear/poles corrected; lower sharpness/tonal transition. |
| [10](stops/stop-10/source-lock-review.md) | 6.625 | Ready · experimental | Left/lower shadows and diagonal ground join. |
| [11](stops/stop-11/source-lock-review.md) | 6.875 | Ready · experimental | Left/lower ground and shadow geometry change. |
| [12](stops/stop-12/source-lock-review.md) | 7.125 | Ready · experimental | Lower-ground join and left sky/forest tonal change. |
| [13](stops/stop-13/review.md) | 7.375 | Ready · experimental | New guide-first v2; old manual 80° candidate preserved. |
| [14](stops/stop-14/review.md) | 7.625 | Ready · experimental | Strong broad fit; actual source-edge browser review passed geometry. |
| [15](stops/stop-15/review.md) | 7.875 | Ready · experimental | Rear-facing source field preserved; focus rectangle remains. |
| [16](stops/stop-16/source-lock-review.md) | 8.125 | Ready · experimental | Usable tractor alignment; lower-left road/foliage scale change, soft pole bands. |
| [17](stops/stop-17/source-lock-review.md) | 8.375 | Ready · experimental | Wide source coverage; foreground foliage transition and stretched outer pole foliage. |
| [18](stops/stop-18/source-lock-review.md) | 8.750 | Ready · experimental | Conspicuous lower foliage position/softness transition; coherent repaired pole centers. |
| [19](stops/stop-19/source-lock-review.md) | 9.125 | Ready · experimental | Lower fern/road texture change; soft tree boundaries and pole overlaps. |
| [20](stops/stop-20/review.md) | 9.500 | Ready · experimental | Broad fit; sampled rear/pole joins coherent. |
| [21](stops/stop-21/review.md) | 9.875 | Ready · experimental | Source field preserved; soft foreground boundary. |
| [22](stops/stop-22/review.md) | 10.250 | Ready · experimental | Blurred source vegetation and generated detail transition. |
| [23](stops/stop-23/review.md) | 10.625 | Ready · experimental | Weakest C fit; lower vegetation alignment/softness transition. |

## Delivery limits and controls

Source-lock mode bypasses the generated bridge clips: those trials moved/redrew machinery and remain preserved as rejected evidence. No additional generated bridges are part of this workflow. Exit first faces the canonical tractor view, then returns to the same orbit timestamp; orbit motion continues from the original video.

Per-stop generation records retain exact prompts, input order, hashes and unchanged originals. Export manifests check common spherical rays and atlas/face identity; mathematical consistency is not artistic seamlessness. [C-FINAL-EXPORTS.json](C-FINAL-EXPORTS.json) pins the seven C-lane exports, and each selected descriptor links its own complete manifest. Restoration and rejected panorama/video trials remain preserved and do not imply runtime readiness.

This is a local review demo. There has been no official publication; this completion phase made no new paid video request. The coordinator owns preservation checkpoints and Git integration; the UI lane owns the final browser 24-stop gesture checks. All 24 registration files and cubes are present. Strict final browser QA is recorded below.

## Initial full-set browser run: qualified evidence

The [initial runtime results](browser-check/source-all24-v1/results.json) show all 24 stops available, matching canonical cameras, cube HTTP 200 responses, successful return behavior, all seven desktop/mobile control flags true, and zero page errors or generated-bridge requests. That harness reported a pass using a loose timestamp tolerance.

Deeper review found 11 of 24 entries decoded the preceding video frame, about 41.667 ms early. Therefore this result does **not** establish exact 24-stop decoded-frame identity. The initial evidence remains preserved; a bounded final-seek correction and stricter v2 run subsequently resolved this issue. No scenery edits or new image/video generations are involved in that correction.

## Final strict browser verification

The [v2 results](browser-check/source-all24-v2/results.json) pass **24/24 stops**. At both entry and return, after a 300 ms idle hold, the actual decoded video timestamp matches each saved source-display timestamp within 1e-5 seconds. All canonical cameras and 24 cube HTTP responses pass. All seven desktop/mobile flags pass: left-drag orbit, right-drag look, one-finger orbit, two-finger look, pinch zoom, matching return and no horizontal overflow. There are zero page errors, failures or generated-bridge media requests.

The runtime changed only the bounded exact-final-seek behavior for this final correction, with served revision `tour-source-lock-v6-exact`. The v1 loose-tolerance evidence remains historical and qualified above. No new art, blur filtering or generated bridge was introduced by the fix. The preserved source frame remains the known-field authority; geometric/tonal scenery joins and deferred motion blur remain as listed per stop.
