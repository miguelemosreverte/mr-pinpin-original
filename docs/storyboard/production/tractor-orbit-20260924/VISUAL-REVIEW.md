# Tractor orbit visual review

## Starting still

Inspected `start-v1.png` (1672×941), SHA-256 `64f5b51808587f6af13676361df0a44ed1a783b81060437fa911de1005285d1d`, copied directly from mini for review. The whole empty tractor and stake trailer fit the frame, with ground around the tires and clearance above the crane. The yellow crane is behind the red cab and before the trailer; two near-side trailer wheels show a tandem arrangement. The front has a grille/weight, no bucket. No driver or other characters are present. A small footbridge sits in the background.

This is an inferred conventional perspective image, not a measured camera sample of the panorama. Its fine mechanical rendering and contrast are more realistic than the softer outdoor panorama; that is a visual difference, not evidence of better geometry.

## Orbit result

Reviewed timed frames from the unchanged provider clip `orbit-v1.mp4`, SHA-256 `172af688f536364ca766a517d94fd9b849585a128bbc192e2713b67ce6e4a83d`. The review contact sheet is `contact-sheet-v1.png`, SHA-256 `49791f48b01d36c902d1987ead77cd5b5abab9b26a5a36f4d7afba11a5c424cc`; `keyframes-v1.json` records extraction timestamps and frame hashes. These are mini/TB4 artifacts, not regenerated illustration samples.

The sampled sequence supports a complete orbit: initial front three-quarter, near-side profile at 4 seconds, trailer rear quarter at 6 seconds, opposite side at 8 seconds, front at 10 seconds, then a return close to the initial composition at 11.9 seconds. It does not look like a simple forward/reverse sweep. Background trees and the stream change with the viewpoint. The crane stays attached behind the cab; two near-side trailer wheels remain apparent on the successive sides. No large new attachment, lost trailer or duplicated vehicle is visible in these samples.

The trajectory is not uniform: the early part changes slowly, with much larger view changes through the middle and later section. Several moving views are softer or motion-blurred. A second review of `contact-sheet-half-seconds.jpg` confirms the progression through a rear-facing trailer view around 7 seconds and the opposite profile around 8.5 seconds. The changing scene and vehicle occlusions read as a camera circling the parked machine, rather than a vehicle visibly driving along a route or a simple turntable against an unchanged background. No gross change in crane mounting or trailer axle count is visible. Fine hose, tire and body details soften/change through the inferred hidden views; these samples do not certify frame-by-frame rigidity or perfectly motionless wheel tread.

The loop is **not endpoint-identical**. The decoded check in `endpoint-check.json` measures mean absolute RGB difference of 10.746/255 from last frame to first, compared with 0.845 for the last ordinary frame transition and 7.136 for the first. This flags a real closing discontinuity; its perceptual strength depends on playback. The framing returns close to its start, but the clip should not be labeled a seamless loop. No interpolation, retiming or extra generation was requested for this review.

This is a useful generated orbit candidate, not recovered 3D geometry. The slider represents clip progress, not measured azimuth, constant angular speed, adjustable radius or arbitrary camera travel.

## Verdict

Suitable as an interactive **orbit-video prototype**: the observed sequence covers a full circuit and preserves the broad tractor/crane/trailer identity. Retain the stated limits: inferred hidden surfaces, variable movement rate and framing, motion blur/detail drift, and a non-identical loop boundary. This review uses the unchanged starting image, the seven-time contact sheet with two full-size side views, the 0.5-second contact sheet, and decoded endpoint measurements; it is not an exhaustive audit of all 289 frames. Browser seeking/playback behavior is covered separately by `BROWSER-REVIEW.md`.
