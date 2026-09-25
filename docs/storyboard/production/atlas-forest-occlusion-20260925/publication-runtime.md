# Publication Runtime

Runtime activation is ready for packaging; this lane did not publish, commit, restart servers, or modify animation/media. Baseline was the accepted frozen 57791 source. Mission Control was unavailable; the previously authorized bounded built-in-tools exception continued.

## Activation

- `atlas-production.js` explicitly enables video sprites, SDF ground steering, regenerated turn gait, and the reviewed 0.3 pace on the queryless public atlas. Production manifest: `./images/atlas/walk/manifest.json`; packaging must retain this JSON and its original frame anchors/sheet geometry.
- `atlas-webgpu.js` passes that configuration into motion without adding sandbox query flags. Existing public story/book interactions remain enabled. Explicit local trial URLs retain their trial manifest and review behavior; original-sprite, family-preview, and turn/gait switches remain available.
- Recorder import is optional and outside the public dependency closure. Only a local hostname with both `sandbox=1` and `reviewCapture=1` imports it; the recorder still requires the enabled server handshake. Public defaults perform no review request and introduce no controls.
- `atlas-motion.js` preserves the reviewed movement/animation implementation and exposes field readiness plus `locationPoint(id)`. Public reader returns wait for readiness, resolve an invalid authored endpoint using existing SDF recovery, and cancel stale movement intent so the character stays parked.
- House arrival accepts the planner's safe endpoint only when its requested goal matches the authored doorway (within 2 world pixels), and the completed arrival is within 4 pixels of that endpoint. It does not require reaching the clearance-blocked raw doorway. Unrelated near-house goals do not enter; explicit trial sandbox still suppresses entry.

## Verification

Focused tests ran on the mini/TB4: production activation, SDF steering, and camera-return suites: **31 passed, 1 hardware-browser test skipped**. Two additional existing motion tests passed: all four reader-return endpoints and both atlas house-entry/language paths. New coverage includes the public static manifest/default pace, capture exclusion, projected doorway arrival, safe reader-return placement, and cancellation of sticky walking intent.

The broader video integration run still has the five previously reported failures (cache bound, 180-degree retarget expectation, old route timeout, sharp final-leg arrival, and missing-turn waiting expectation). They were not changed or represented as green. Terminal video-load failure fallback tests pass. Final built-artifact browser verification remains with packaging/verification; unit results are not a publication receipt.

## Packaging Handoff

### Frozen 57791 Differential Check

Follow-up verification on mini, Node v23.11.0: downloaded `atlas-motion.js`, `atlas-video-sprite.js`, `atlas-geometry.js`, and `sprite-turn-profile.mjs` directly from frozen port 57791 into an isolated baseline directory. Ran the identical current `atlas-video-integration.test.cjs` against that baseline and a separate activation-candidate directory. **Both: 19 tests, 14 passed, 5 failed.** Full TAP output is identical after removing only wall-clock durations and baseline/candidate directory names, including assertion values and the route-timeout state. These five failures therefore predate production activation; this comparison does not replace public-default browser acceptance.

Evidence retained on mini/TB4 at `/Volumes/TB4/mac-mini-storage/shared/atlas-publication-diff-4WcOml/`: `baseline.tap`, `candidate.tap`, and both source/test directories. Baseline motion SHA-256: `6fa42b6a698e03f42f2fb55c5a91c6110d38655d7ae163e2270ab8d97dc09d1e`; pre-arrival-fix candidate motion SHA-256: `b248e10c89a8534d5d1f2f6b2b61a9b9edc790cb769daaea9cefa4fc0e4b10dd`. Test SHA-256 in both directories: `1c6e1fd6e9000b0c26f3b031a65ec5731c67b37b4d7a2d0676733f3c006db951`. The other three runtime dependencies have identical hashes across both directories.

### Artifact-v2 Home Arrival Fix

Parfit's actual pointer trace reached projected home endpoint [311,719] without navigation. Confirmed cause: `tick()` checked journey completion only after steering could already end the goal; short lookahead journeys also do not represent goal completion. The narrow runtime fix captures the active steering-goal edge before steering, emits arrival once when that goal finishes, and suppresses held failures. Non-steering event handling, animation, coordinates, and thresholds are unchanged.

Post-fix mini verification: **28/28 production and SDF-steering tests passed**. New integration coverage drives actual video/steering ticks through an ordinary goal followed by an invalid authored home goal projected onto safe ground, feeds real arrival callbacks into the page's actual `arrive()` function, and asserts exactly one menu navigation with preserved language. It also checks no repeat notifications during idle and no arrival for collision-held completion. Runtime is ready for the new artifact; Parfit's real-pointer browser retest remains the cutover gate. Only `atlas-motion.js` changed at runtime for this fix; the ready hash below supersedes artifact-v2.

See [asset inventory](publication-assets.md). Preserve explicit compatibility dependencies if their switches remain published, including classic gait and legacy field textures. The source uses no SDF metadata JSON at runtime. Package the new `atlas-production.js` module alongside the modified `atlas-webgpu.js` and `atlas-motion.js`. Tests changed: `scripts/atlas-production.test.cjs`, `scripts/atlas-sdf-steering.test.cjs`, and the arrival-extraction fixture in `scripts/atlas-motion.test.cjs`.

Ready-source SHA-256:

```text
5a1dad49e64a3313d7d0f165a29689a70eea6ca9e723fe39321f732c9d12bf81 atlas-production.js
5ffcb2bd5f957eaa1097ad37a709d4f928db075e3456dde10929e53730310f5c atlas-webgpu.js
2f1e75d4e2bc1af70a9deb8ff72cddd95870702b9a3586eb71e52774b41cac9d atlas-motion.js
01382fc7d0a12b064d896919f164eeaad6bc6e47a15d1605c65a83c72f690d19 atlas-video-sprite.js (unchanged)
```
