# Tractor explorer browser review

Status: passed focused desktop/mobile browser checks. Final runtime revision: `explore-single-v1`.

The separate explorer reuses the approved looping orbit clip and exactly one existing repaired tractor panorama. Its approximate anchor is video time 0; the default tractor-facing view is yaw −105°, pitch −5°, vertical FOV 75°. No new panorama is integrated, and the original orbit and story-world pages are unchanged.

## Interaction and transition

Ordinary wheel input on the stage, right-button drag or two-touch centroid movement requests look mode. The clip follows the shortest cyclic path to the available anchor before head movement begins. Input is accumulated during the transition, bounded to ±π yaw, ±π/2 pitch and finite zoom. It is applied only after video arrival and panorama readiness. Reduced-motion preference removes the animated snap.

Left drag, one-finger movement and the manual slider return to looping orbit and cancel pending transitions. The state token prevents a canceled image load or snap from later re-entering look mode. The touch handler permits a short first-finger intent interval, restores the original orbit position when a second touch promotes the gesture, and suppresses a remaining single finger until both lift. Ctrl-wheel and touch pinch zoom the panorama. Ordinary page scrolling remains available outside the stage.

## Actual browser checks

Chrome ran directly on the mini with profiles/screenshots on TB4. The desktop test used width 1400; the touch test used width 390.

- Ordinary wheel entered look mode, selected the positive short wrap from 90% to the zero-second anchor, retained queued head input until arrival, then changed the real panorama camera.
- Native right-button drag changed head direction. Ctrl-wheel zoom stayed in look mode.
- Left drag canceled an in-progress snap; waiting beyond the old animation did not resurrect it. Large queued wheel input stayed bounded.
- Two native touches promoted the first-finger orbit gesture into look mode and restored its recorded origin. Releasing one finger left look mode active; moving that remaining finger did not switch to orbit. A new one-finger gesture after both lifted returned to orbit.
- Outside-stage wheel scrolled the document. Both layouts had no horizontal overflow; desktop produced no page errors.
- Reduced-motion mode used a zero-duration snap.

The meaningful regression script is [verify-browser.cjs](verify-browser.cjs), with [BROWSER-RESULTS.json](BROWSER-RESULTS.json). Set `PINPIN_BASE_URL`, external `PINPIN_BROWSER_OUTPUT`, and a `NODE_PATH` containing Playwright when running it.

Final local review URL: `http://127.0.0.1:18791/tractor-explore.html?rev=explore-single-v1`. The temporary mini mirror avoids the stalled Air SMB mount; it is not a public deployment.

## Framing and limits

The settled desktop and mobile captures explicitly waited for computed canvas opacity 1. The final anchor is opaque and clean; an earlier screenshot caught the deliberate 180 ms CSS transition and is not the settled result. Root visually confirmed the final tractor framing.

The panorama and orbit video have different inferred camera positions, scale and local details. The transition is intentionally labeled approximate, and there is no look-around panorama at arbitrary video positions. Head look rotates the view within the one actual 360° image; it does not crop or pan the orbit frame. The approved video's last-to-first jump remains visible when orbiting.

Evidence stays under `pinpin-tractor-explore-20260924/browser-check/` on TB4: `anchor-orbit.png`, settled `anchor-look.png`, settled `mobile-look.png`, and `results.json`. The old tours, shared renderers and public home were not modified. No commit or publication was performed by this lane.
