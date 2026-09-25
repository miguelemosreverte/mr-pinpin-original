# Inverted tractor controls — 25 September 2026

The requested mapping is now **one finger looks around; two fingers orbit the
tractor**. This supersedes the mapping in the frozen `CONTROL-FLOW.md` checkpoint
633c53d. That prior report and its evidence remain unchanged.

| Input over the image | Action |
| --- | --- |
| Unpressed pointer movement, including trackpad pointer motion | Look around horizontally and vertically |
| One touchscreen finger moving | Look around |
| Left or right mouse drag | Look around |
| Two-finger trackpad scrolling / plain wheel | Orbit; dominant horizontal delta or vertical fallback |
| Two touchscreen fingers moving together | Orbit; horizontal or vertical translation |
| Two-finger pinch / trackpad Ctrl-wheel pinch signal | Zoom the panorama |

Browsers expose trackpad pointer motion and wheel events, not its raw finger
count. This mapping uses those ordinary signals. Scrolling outside the image
and events targeting buttons/inputs inside it remain untouched.

## Continuous behavior

The existing exact-frame settle barrier, canonical first paint, bounded
transition-input queue, cancellation and deferred return-to-look path are
reused. Pointer/one-touch movement continues through entry without another
click or touch. Two-finger orbit input continues through return. Dropping back
to one finger rebases that finger and starts looking again when it moves,
including during an unfinished return.

Second touchscreen contact alone does not exit look mode. After a small motion
threshold, the gesture chooses centroid translation (orbit) or changing finger
separation (pinch). The two pointer updates are sampled together on RAF so a
half-delivered pinch cannot look like an orbit move. Once pinch is chosen,
centroid jitter is ignored for that two-contact gesture. Lifting a finger
allows the next gesture to choose again. Existing pointer jitter/warp guards
remain, with look intent now considering both axes.

No server, cache, renderer, artwork, resolution, shader, source projection or
video-settlement changes are part of this inversion. HTML help, accessibility
text, live status text and module versions use the new mapping.

## Focused browser verification

`verify-inverted-controls.cjs` ran on mini Chrome with normal desktop pointer
and wheel events plus CDP-emulated touchscreen events. All nine checks pass,
with no page errors:

1. Unpressed pointer looks on both axes; jitter/warp alone do not enter look.
2. Plain wheel orbits through return, including vertical-scroll fallback.
3. Left drag looks through the transition without another engagement.
4. Right drag remains an optional look fallback.
5. Trackpad pinch zoom stays in look; UI/outside scrolling is unaffected.
6. Orbit cancellation clears queued one-finger look input.
7. One touch looks; second contact waits; pinch zoom does not orbit or yaw.
8. One→two orbit→one look handoff works during return without lifting all.
9. Two-touch vertical translation orbits, and cancelling one-touch look
   discards buffered movement.

The first recorded panorama draw on tested entries matches the selected camera
within 1e-8, its manifest timestamp within 1e-5 seconds, and the decoded RVFC
frame timestamp within 1e-5 seconds. This verifies the canonical source-facing
first frame before queued movement. Previous full artwork/performance audits
were not rerun for this bounded input-mapping change.

Final evidence: `inverted-control-results.json`, including SHA-256 hashes of
all six served runtime/HTML dependencies. The local files were checked against
those tested hashes after the run. Mini evidence is frozen at:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924/browser-check/inverted-controls-v1/results.json`.
Run the harness with a new directory argument for a later check. Physical
trackpad drivers may emit different event sequences from headless Chrome;
no unsupported finger-count detection is assumed.
