# Continuous 360° looking — Pointer Lock and touch

Desktop looking can continue beyond the screen edge using real browser Pointer
Lock. Click the scene, press Enter while it is focused, or activate the accessible
Capture mouse button. The browser requires that initial trusted activation.
Escape releases capture. The interface displays the actual capture state; no
untrusted/synthetic `.click()` or automatic recapture is used.

The existing mapping is unchanged: one-finger/pointer motion looks around,
two-finger scroll/translation orbits, and pinch zooms. This extends the frozen
`INVERTED-CONTROLS.md` checkpoint rather than changing those earlier results.

## Implementation

- Capture is requested only for fine-pointer desktop interaction and only from
  a trusted scene click, Enter key or capture-button activation. A completed
  drag does not unexpectedly capture the mouse when its release produces a
  click. Coarse-pointer devices hide the capture UI and never request capture.
- `document.pointerLockElement === stage` is the authority for lock state.
  While locked, one document `mousemove` handler consumes relative
  `movementX/movementY`, bypassing absolute-coordinate edge/warp thresholds.
  Normal pointer-move/down processing is suppressed under lock to prevent
  counting the same movement through both mouse and pointer events.
- Wheel input routes once through the document only while this stage is locked;
  otherwise the existing stage-only route applies. Two-finger scrolling still
  orbits, and the next relative mouse movement looks again without recapturing.
  Ctrl-wheel pinch remains zoom. Outside-page scrolling stays untouched when
  capture is released.
- Pointer-lock change/unlock clears tracked pointers, delayed touch sampling,
  hover anchors, queued transition motion and deferred look intent. Escape
  explicitly calls the browser exit API when captured; otherwise it retains
  the prior return-to-orbit behavior. No capture retry loop runs.
- Unsupported or denied capture shows an honest fallback message and leaves
  ordinary pointer movement and repeated drags working. The browser may deny
  capture; the UI never claims capture merely because a request was made.
- Mobile looking needs no pointer lock. Repeated one-finger drags after lifting
  accumulate camera yaw through its existing ±π wrapping. Two-finger orbit and
  dropping back to one-finger look remain continuous.

Only gestures, tour integration, HTML instructions and small capture-UI CSS
changed. No artwork, resolution, rendering math, source-frame barrier, media,
cache or server behavior was changed.

## Real browser verification

All seven scoped checks pass, using two complementary final receipts whose
seven source-file SHA-256 hashes match each other and the local/served runtime:

**Air, headed Chrome, fresh isolated persistent profile** — three actual-capture
checks in `looping-desktop-results.json`:

1. A trusted click grants actual Pointer Lock on the scene. A 5400-pixel relative
   movement sequence travels over three viewport widths and turns the camera
   by about 8.42 radians (>480°). The measured wrapped-yaw sum matches the
   relative movement formula, demonstrating no mouse/pointer double counting.
2. Escape invokes the app's browser exit path, actual lock state becomes null,
   tracked/queued input clears, and no automatic recapture follows.
3. A trusted toolbar-button activation captures the scene too. Wheel orbit is
   handled once, then relative movement enters look again without recapture;
   Ctrl-wheel pinch zooms while capture remains active.

The Air's headed/Retina path delivered one DOM WheelEvent with deltaX 240 for
Playwright's requested 120; verification compares against the actual delivered
DOM delta and stage client width. This was a test-expectation correction, not a
runtime sensitivity or duplicate-handler fix. App Escape behavior was tested
using `exitPointerLock` and actual pointerlockchange; the test does not pretend
CDP simulates a native browser chrome accelerator.

**Mini, headless Chrome** — four fallback/mobile checks in
`looping-mobile-fallback-results.json`:

4. An unsupported API leaves normal dragging usable and makes zero requests.
5. A denied API leaves normal dragging usable after one explicit request,
   without automatic retries or page errors.
6. Twelve mobile lift-and-drag strokes accumulate −8.6279 radians (>494°),
   with the final yaw wrapped to −2.4201 radians and zero capture attempts.
7. Two-finger touch orbit followed by remaining-one-finger look works during
   return without lifting all fingers.

Recorded first look paints in the relevant tests still match the selected
camera within 1e-8, manifest timestamp within 1e-5 seconds and decoded RVFC
source timestamp within 1e-5 seconds. Neither final run has page errors.

The mini's actual pointer-lock requests failed with WrongDocumentError in
headless and headed automation, also reproduced by an independent standalone
probe. No fake lock flag was substituted: real desktop integration was moved
to the Air, where it passed. Consequently the mini receipt deliberately has
`actualCaptureVerified: false` and top-level `pass: false`, alongside
`fallbackAndMobilePass: true`; the separate Air receipt supplies the actual
capture proof. Temporary Air Chrome profiles were created under a unique
`/tmp/tractor-looping-check-*` directory and removed after browser shutdown.

## Reproduction and evidence

Harness: `verify-looping-controls.cjs`. Mini fallback/mobile invocation uses
`SKIP_REAL_LOCK=1`. Air actual integration uses `HEADED=1`,
`PERSISTENT_PROFILE=1`, `ONLY_REAL_LOCK=1`,
`TRACTOR_BASE=http://127.0.0.1:18791/` and the existing Air Playwright module
`/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright` via
`PLAYWRIGHT_MODULE`. The default mini Playwright path is retained in the script.
Use a new output-directory argument to preserve existing evidence.

Final raw JSON is frozen under the canonical mini/TB4 pack:

- `browser-check/looping-controls-air-v4/results.json`
- `browser-check/looping-controls-fallback-v1/results.json`

Earlier `looping-controls-v1` and `looping-controls-air-v1/v2/v3` attempts are
not final passing proof. They record the mini lock limitation and the Air
wheel-unit test correction. No new images/screenshots were required and the
previous all-24 artwork/performance audit was not rerun for this input change.
