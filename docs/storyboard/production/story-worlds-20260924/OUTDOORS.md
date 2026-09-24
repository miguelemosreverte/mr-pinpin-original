# Outdoor story worlds: selected multi-reference workflow

The selected lake and tractor panoramas use **a successful complete 360° panorama and the target chapter illustrations together**. The kitchen panorama supplies a projection example only; the book images supply the location, appearance and machinery. The generated outdoors contain no kitchen or other indoor furnishings. This reference combination did not automatically prevent wrap seams or pole pinching: actual sphere review identified three regions per scene, repaired with registered rear/up/down perspective images.

Both scenes passed final cardinal and oblique overlap review. The hard rear joins and pole pinches are corrected; no obvious duplicated rocks, vehicle parts or logs were found in the inspected overlap views. Minor illustration softness changes remain. The lake export is complete and the tractor's selected stack is handed off for the same deterministic export. Neither original book art nor the prior tours were changed.

## Scene references and selected facts

**Lake:** the current Chapter1 registry in illustrations.json depicts the lake dry, then restored by the story's magic. This scene selects the restored ending: drooping willow, clear green water, lilies, reeds, pale shore stones and layered sunlit forest. The authoritative location reference is images/chapter-01-landscapes/shot-12.png; images/chapter-01-direct/08.png supplies the same place and finished book appearance, with its cast omitted. The camera is on dry shore. The rear woodland path and unseen terrain are inferred extensions, not established book canon.

**Tractor:** the current timber-tractor.json selects scene-11-v3.png and scene-09-v4.png. Scene11 supplies the stream, bridge worksite and parked-machine setting; scene09 supplies the same machine's anatomy. The selected panorama retains the book's unfinished deck gap, so it is labeled a **bridge repair worksite**, not a completed crossing. The red tractor has an empty cab, front grille/weight, one yellow logging crane mounted directly behind the cab before the empty trailer, and a tandem trailer bogie. It stays off the pedestrian bridge. No character action is frozen into the environment.

Both v2 calls additionally use kitchen-bootstrap.png: the previously successful assembled 3072×1536 panorama, expressly restricted to full-sphere organization, horizon, wrap and overhead/underfoot treatment. Its SHA-256 is fbf70ac4415fbc9e63febdc756af4a512ee9b7cd29e693fa4423e65608178184. All target-reference hashes and literal role instructions are in each scene's generation-v2.json and prompt-v2.txt.

## Selected construction

1. Generate one whole 2:1 panorama per scene, native1774×887, forward at u=.5 and horizon at v=.5. No six independently generated faces.
2. Extract a registered rear110° view, repair the observed longitude cut.
3. Extract upward and downward110° views from that same base with its new rear already applied; repair the observed canopy/soil pole pinches.
4. Review the assembled sphere at front/rear/sides/up/down and oblique repair overlaps. Only after that selection, derive the full assembled panorama and six90° cube faces deterministically.

No Blender scene was created or rendered. These are fixed-viewpoint illustrated worlds; camera rotation does not establish translated 3D geometry. Physical distances, heights and unseen surroundings are inferred. Ordinary softness and synthesized foliage/detail should not be confused with measured botanical or machine reconstruction.

## Selected source identities

| Scene | Asset | SHA-256 |
|---|---|---|
| lake | [panorama-v2.png](lake/panorama-v2.png) | 53a67c9bae7db2123fb48e2795e36eb16770e1d6759c64ba793cff5e01e41acf |
| lake | [rear-v2.png](lake/rear-v2.png) | 3d6c5d66fc103e1d6680556a4f0a8b7c8e08d8a0bb9a13be18ad645cd8a840ca |
| lake | [up-v2.png](lake/up-v2.png) | 33ed2e5ea4ddabe5974affb0f53fef2cee5fb8b5e210aa3e9256072daacacfe0 |
| lake | [down-v2.png](lake/down-v2.png) | 174e85f376baef6a7a926bd9928c03eb36403af4dab621a6bb3b24319bea2041 |
| tractor | [panorama-v2.png](tractor/panorama-v2.png) | 35a06d283b5cb58f62dd063597c3a9fb47f22f3ff838e7f007d9e1ee75145869 |
| tractor | [rear-v2.png](tractor/rear-v2.png) | 99fcd18d2a4008c24d0af0b5825a7fd206a0b88a5fb5f05a87f04f666872deea |
| tractor | [up-v2.png](tractor/up-v2.png) | 79ec5ac931dd7f128ac5ac8a73e53520ef8b164d19f527f6e9aa512c4142b0f5 |
| tractor | [down-v2.png](tractor/down-v2.png) | bfcda19c5c1d300403ec0e446002e2b9351866e59dc13b045e77a4bf5c98ce00 |

Each repair has its own literal prompt and generation record. The extraction records identify the exact inherited stack, orientation and hashes. Original generated masters remain preserved with source/TB4 copies. The projector/export and archive records are maintained by the separate preservation lane.

## Calls and retained history

This outdoor lane made **12 image calls**: eight selected (lake v2 base plus3 repairs; tractor v2 base plus3 repairs), and four retained earlier attempts (v1 base plus rear repair for each scene). The earlier v1 calls used only book references. They are preserved as history and never mixed into the v2 repair stacks. The coordinator's Elder scene is separate from this count.

[Open the review](../../../story-worlds.html?scene=lake). Actual screenshots are under external pinpin-story-worlds-20260924/browser-check/lake-final/ and tractor-final/. Projection edge equality checks establish conversion consistency, not artistic seam quality; visual review is separate.
