# Orbit browser review

Status: desktop and mobile browser checks passed. The user-requested continuous drag behavior is selected in revision `orbit-wrap-v2`.

The isolated `tractor-orbit.html` page uses the actual 12.041667-second, 1280×720 scrub derivative. It starts paused. Horizontal pointer dragging selects clip progress and wraps modulo one in either direction; a continuous long drag can cover multiple cycles and successive drags resume the current selection. Arrow keys also wrap. The native range slider selects directly from 0–100%; Home/End retain endpoint semantics. Optional playback loops. No frames are synthesized or crossfaded to conceal the real last-to-first jump.

Seeks are coalesced: only the latest queued target is applied after the current seek completes. The UI displays a genuine pending state and disables controls when media is unavailable. Actual input image, prompt, request settings, raw video and derivative metadata are linked below the viewer.

## Focused checks

Chrome checks ran on the mini at widths 1400 and 390, with browser profiles and captures directly on TB4. Both sizes passed actual video decoding, paused initial state, native slider endpoints, pointer/touch dragging, keyboard selection, rapid-request coalescing, optional playback/pause and responsive bounds, without page errors.

Wrap checks passed 98% → forward 10% → 8%, 2% → back 10% → 92%, a subsequent forward drag back to 2%, keyboard wrapping in both directions, and a desktop drag covering 2.3 cycles. Playback crossed the end and resumed near the beginning. The slider and Home/End still select endpoints directly.

The final cache-versioned entry was loaded from the isolated mini mirror: `http://127.0.0.1:18791/tractor-orbit.html?rev=orbit-wrap-v2`. This avoids the stalled Air SMB mount and is not an official deployment.

Evidence: external `pinpin-tractor-orbit-20260924/browser-check/` contains `results.json`, `wrap-results.json`, both verification scripts, and desktop/mobile captures.

## Visible limitations

The observed clip completes a circuit but has uneven speed, motion blur and fine-detail drift. Its final frame is not identical to its first. The visible page note distinguishes continuously looping controls from seamless artwork. Progress is not a measured azimuth, and the clip is not a freely navigable or metric 3D model. See [VISUAL-REVIEW.md](VISUAL-REVIEW.md) for the separate dense-frame art review.

Owned files: `docs/tractor-orbit.html`, `.css`, `.js`, and this report. Existing scenes remain unchanged. No generation, commit or publication was performed by this lane.
