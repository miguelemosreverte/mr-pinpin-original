# Continuous tractor controls — second pass

The controls no longer require a second click or a restarted gesture after
entry. This is a later change than the first performance checkpoint f32f683.
`REPORT.md`, `baseline.json`, `optimized.json`, and the earlier archived image
comparisons remain frozen evidence for that checkpoint, not this runtime.

## Cause and resulting behavior

The earlier gesture layer ignored unpressed pointer motion, captured the
`accepted` flag only at gesture start, and retained that false value after
entry. Its wheel quiet deadline also advanced with every incoming event,
which could reject a continuous scroll stream indefinitely.

- Moving the pointer horizontally over the image now orbits without pressing
  a button. Physical trackpads expose this as mouse motion; the browser does
  not expose the finger count of that pointer motion. Two-finger trackpad
  scrolling arrives as wheel events and enters look mode.
- Right drag and two-finger touchscreen movement keep their gesture state
  across snap/entry. Wheel, pan and pinch deltas received during entry are
  buffered instead of discarded, with no inactivity/restart gate.
- Entry still settles at the exact selected source-video timestamp and draws
  the canonical camera first. Two RAF boundaries allow that image to paint
  before buffered movement applies over three frames. Buffered yaw/pitch/zoom
  are capped at 0.6 radians, 0.4 radians and 120 zoom units to avoid a long
  stalled transition producing an excessive jump. Ongoing input then applies
  normally. Source projection and renderer math are unchanged.
- Lifting only the second touchscreen finger rebases the remaining finger to
  orbit without a jump. Adding that second finger again during return queues
  look intent and continues after return, without lifting both fingers.
- Return, touch cancellation, Face tractor and context loss discard relevant
  queued motion/intent. Regular pointer-up keeps the completed gesture's
  intended movement. Explicitly returning to orbit cannot later resume a
  stale look-input flush.
- UI elements within the stage ignore hover/wheel routing. Page scrolling
  outside the image is unaffected. Stage re-entry establishes a new pointer
  reference; tiny jitter and large cursor warps do not trigger a mode change.
  Orbit hover requires 5 pixels of predominantly horizontal intent. A pause
  over 240 ms or a jump over 120 pixels (less on narrow stages) rebases input.

## Latency fixes kept within this control change

Already-orbit movement now uses the existing latest-target seek path, instead
of resetting mode/epoch and starting a new prefetch coroutine for every mouse
move. Nearby warmup waits for a quiet seek and runs from one debounced timer.
The explicit Orbit button still pauses playback.

A truly zero-distance snap bypasses the old minimum 220 ms tween but still
runs the unchanged exact-frame settle barrier. Actual camera travel keeps its
existing animation duration. Input-driven panorama paints remain RAF-coalesced.

## Verification

`verify-control-flow.cjs` ran on mini Chrome, normal desktop and emulated mobile,
with the final served source hashes recorded in `control-flow-results.json`.
All ten checks pass with zero page errors:

1. Buttons=0 hover orbits; jitter and cursor warp do not.
2. Stage controls and outside-page wheel events remain unconsumed.
3. One continuous wheel stream spans entry and changes the camera.
4. A single held right drag spans entry and changes the camera.
5. Same-stop entry has snap duration zero and keeps the exact first frame.
6. Return cancels buffered entry movement.
7. Face tractor cancels pending movement/flush.
8. Held two-touch entry, two→one→two during return, and pinch work without a
   second engagement or lifting every finger.
9. Touch cancellation discards buffered entry motion.
10. Cancelling deferred two-finger intent during return leaves the tour in orbit.

The recorded first WebGL look draw is checked against the selected camera
within 1e-8 and the manifest's selected timestamp plus decoded RVFC timestamp
within 1e-5 seconds. This directly checks canonical first draw even when a
continuous gesture has already buffered motion. No new image assets or
screenshots were needed. The earlier all-24 image/geometry audit was not rerun;
this focused change leaves the renderer/source-frame barrier untouched.

Evidence is frozen at
`/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924/browser-check/control-flow-v5/results.json`.
Run the harness with a new directory argument for future checks. Earlier
control-flow-v1/v2 exposed a CDP test-fixture finger-end mistake, corrected in
v3; v4's separate HTTP-cache probe was handed to the server/cache lane. They
are not final control results.

Headless pointer/wheel and emulated touchscreen tests cannot reproduce every
physical trackpad driver's event sequence. A live Mac trackpad check remains
useful, but no browser finger-count API is assumed. HTTP validator/cache work
has a separate owner and report; it is not represented as passing by these
control results.
