# C lane: seven completed source-locked stops

Stops **13, 14, 15, 20, 21, 22 and 23** have complete selected backgrounds, source-locked spherical exports, cube atlases, six individual faces and forward views. All selected descriptors set `sourceLockStatus: experimental`. The coordinator reassigned 16–19 to the UI/production lane; they are outside this report. No image calls remain in flight in this lane.

The user explicitly accepted one-to-one source geometry and deferred motion-blur refinement until all cubemaps were complete. Each source anchor uses the unchanged decoded video frame (`source-display.png`), its selected camera, a rectangular 16:9 frustum and feather starting at normalized 0.94. The tractor stays in the known source field. Generated scenery fills the unknown sphere. Visible focus rectangles and some vegetation/ground transitions remain; these are experimental candidates, not seamless physical reconstructions.

## Selected results

| Stop | Background | Fitted vertical FOV | Review |
| --- | --- | ---: | --- |
| 13 | Guide-first v2 + rear/up/down v2 | 67.818° | Rear-facing identity and source-field geometry retained; old manual-80° v1 preserved separately. |
| 14 | Guide-first v1 + rear/up/down v1 | 65.386° | Strong broad registration; actual browser boundary review passed for geometry, softness deferred. |
| 15 | Guide-first v1 + rear/up/down v1 | 68.551° | Complete machine supplied by source anchor; sharpness differences at the field boundary remain. |
| 20 | Guide-first v1 + rear/up/down v1 | 65.150° | Broad registration and coherent sampled rear/pole joins. |
| 21 | Guide-first v1 + rear/up/down v1 | 65.054° | Source geometry preserved; softer foreground boundary remains visible. |
| 22 | Guide-first v1 + rear/up/down v1 | 65.510° | Central source vegetation remains blurred; generated poles/rear corrected. |
| 23 | Guide-first v1 + rear/up/down v1 | 68.343° | Weakest background registration and visible lower vegetation alignment/softness transition; explicitly experimental. |

These FOVs are authored registration parameters, not measurements of a physical camera lens. Inlier counts alone did not determine acceptance: the full source field is controlled by the runtime anchor. Stop23's fit is substantially weaker than14/20; it is not presented as an exact generated match.

## Production and preservation

The guide-first recipe supplied a mathematical 65° source-frame projection as the first edit canvas, the actual frame as appearance/identity authority second, and the accepted sphere as projection/continuity reference third. The third reference was explicitly forbidden from determining vehicle orientation. New bases13v2,15,20–23 use the browser-decoded frame;14 retains its earlier successful raw-frame generation. Optional restoration candidates remain preserved and were not used as the source-lock texture.

Each selected stop uses one full 2:1 sphere and three demonstrated 110° rear/up/down repairs: **28 selected original model outputs** across these seven stops. Of these,14's base already existed; this completion phase made27 calls. The earlier superseded13 v1 sphere and its three repairs, restoration candidates, and separate04 pilot trials remain intact with their original records. No six-face independent generation, new Blender render or paid video call was used for these exports.

The old13 `forward.png` and previous selection are preserved as `selected-legacy-v1.json`; new13 uses separately versioned v2 files. The failed04 one-call perimeter repair is retained with status `rejected-boundary-mismatch-after-source-reapplication` and is not activated.

## Verification and artifact contract

For every stop, nine final sphere directions and nine source-field edge views were inspected: forward, sides, rear, poles, rear/up, rear/down, front/down, relative yaw ±30°/±60° and lower corners. The demonstrated hard rear joins and central pole starbursts were corrected in these samples. Source softness and some scenery detail changes remain;23 has the most noticeable vegetation boundary. This sampled review does not establish perfection over every possible camera direction.

Each selected `panorama` is the generated background only. `anchoredPanorama` is a separate **4096 × 2048** deterministic projection of the source over that background. `anchoredCube` is a **3072 × 2048** atlas in `[front,right,back; left,up,down]` order, accompanied by six **1024 × 1024** PNG faces. The selected forward is **1280 × 720**, extracted at the canonical camera from the anchored sphere. It is resampled; direct runtime source projection supplies the original known pixels instead of claiming this exported forward is byte-identical.

All **84 shared-ray edge comparisons** and **42 face-to-atlas tile identities** pass. These checks prove consistent projection sampling, not artistic seamlessness. Exact selected paths, cameras and SHA-256 values are in `C-FINAL-EXPORTS.json`; each stop has its own prompts, generation records, selected stack, selected descriptor, review and export manifest. `finalize_c_stops.py` reproduces the deterministic completion for the six newly exported stops;14 follows the same recorded CLI operations.

All original masters and heavy derivatives are on the mini's TB4 pack. Small metadata is synchronized to the source checkout; media use working links. The coordinator owns archival preservation, Git checkpoint and final integration. No publication was performed by this lane.

Final HTTP check: all seven anchored-cube and seven source-anchor URLs returned 200 through mini port18792. See C-HTTP-CHECK.json.
