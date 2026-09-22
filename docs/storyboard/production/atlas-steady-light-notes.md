# Seedance: steady lighting

September 21, 2026: Miguel selected Seedance 1.0 Pro Fast as the model to continue
with and requested no added cloud shadows. This selects a generation model, not
automatic approval or deployment of this particular output.

The [request config](atlas-video-seedance1-steady-light-v1.json) retains all prior
settings and the pebble exclusion, appending exactly:

> Do not add shadows from clouds. Keep the lighting, shadows, and exposure
> constant throughout the shot.

Approved source: `images/atlas/shire-v1.png`. Camera lock enabled, 5 seconds,
1080p requested, auto aspect, no end-frame constraint. The model may still vary
framing or lighting; the wording is not a guarantee. Random seed is unspecified,
as before, so differences cannot be attributed only to the added sentence.

One new request, estimated $0.245388 using prior delivered dimensions and frame
count at $1 per million video tokens. Actual billing is unverified. No other
models or upscalers submitted. No production atlas files replaced.

The output `../videos/shire-seedance1-steady-light-v1.mp4` has same-basename JSON
and Markdown recording exact input, source hash, request ID, UTC events and
measured metadata. [Review](../review/atlas-steady-light.html) compares this
unmodified result with the previous no-pebbles version.

Review cloud-like shadow sweeps, brightness/exposure stability, meaningful
water and foliage motion, invented objects or rings, camera drift and the loop
boundary before any promotion. An imperfect loop remains acceptable for this
motion experiment. Final lighting approval remains with Miguel.

## Collected result

Request `01a0c219-1bda-7562-b88f-afef067706ea` completed. Delivered 1664 x 1248,
121 frames at 24 fps, 5.041667 seconds, H.264, no audio, 27,458,361 bytes.
Submission to collection took 77.389 seconds including queue, polling and
download, not isolated inference. Output-token estimate remains $0.245388.

Two-frame-per-second contact-sheet inspection did not reveal a pronounced cloud
shadow sweeping across the map or the earlier concentric lake disturbance.
This is not proof of constant illumination at every pixel or absence of brief
artifacts. The output still uses a 4:3 canvas from a 3:2 reference, so future
atlas integration must resolve alignment with the existing depth and regions.

Opened the comparison using macOS `open`. Both videos played without media
errors in desktop and mobile-size Chrome checks; no horizontal overflow.
