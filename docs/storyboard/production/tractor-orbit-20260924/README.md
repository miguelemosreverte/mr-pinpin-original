# Tractor orbit video experiment

The user proposed moving around a focal object by scrubbing a generated camera-orbit video. This is distinct from rotating the view inside a cubemap: the video depicts an inferred change of camera position around the tractor, while the cubemap has one fixed viewing position. A slider controls progress around one proposed path; it does not control camera radius or enable arbitrary 3D movement.

## Inputs and generation

The selected tractor clearing panorama and the published machinery illustration supply the scene and vehicle identity. One built-in image-generation call produces a conventional 16:9 starting still: the complete stationary empty tractor/trailer, the crane immediately behind the cab, and enough surrounding ground to frame an orbit. It is an artistic reframing, not a geometric reprojection. The original still, exact prompt, reference hashes and returned dimensions are retained in `start-generation.json`.

The pilot uses the existing sprite-generation runner and PixVerse V6 Transition, with the same still as first and last image. Requested settings: 12 seconds, 720p, 16:9, silent, one continuous clip, prompt optimization disabled. The prompt requests a complete clockwise orbit at constant radius and height, with the vehicle and machinery motionless. Matching endpoints constrain only the endpoints; they do not prove that a full orbit occurred between them.

Official schema: https://fal.ai/models/fal-ai/pixverse/v6/transition/api

Official pricing checked 2026-09-24: https://fal.ai/models/fal-ai/pixverse/v6/transition — 720p silent at $0.045 per second, so the single 12-second request is estimated at $0.54. This is an estimate, not verified billing. No automatic paid retry or upscale is part of the pilot.

## Viewing and validation

The isolated [orbit demo](../../../tractor-orbit.html) starts paused and lets the reader drag or use a slider to choose a point in the clip. Its slider denotes orbit progress, not measured camera azimuth. The raw generated video is retained separately from a decode-friendly derivative with frequent independent frames for responsive seeking.

Review must establish whether the camera actually passes the near side, trailer rear and far side before returning, rather than rocking or reversing. Also check that tractor/trailer proportions, wheel count, crane position, background parallax and lighting remain coherent. A successful 360-degree orbit still does not establish metric geometry or constant angular speed. See `VISUAL-REVIEW.md` and `BROWSER-REVIEW.md` for observed results once the pilot is available.

Heavy originals, clip derivatives and review frames live on TB4 in `pinpin-tractor-orbit-20260924`; prompts, configs, hashes and review records live in source. The official reader and the completed three-world cubemap studies remain unchanged.

## Observed pilot result

The single video request returned 1280×720, 24 fps, 289 frames and 12.041667 seconds without audio. Timed-frame review confirms a complete circuit: the trailer rear is visible near 7 seconds, the opposite side near 8.5 seconds, and the view then returns toward the starting composition. The broad machine identity and crane/trailer arrangement persist. Motion is not uniformly paced; some middle frames blur and fine details vary. The final and first frames also differ visibly, so an interaction that wraps around is not a claim of a pixel-seamless film loop.

The user approved the viewing experience and requested unlimited pointer/finger dragging. The UI therefore wraps drag progress in either direction; the slider remains a direct position control. This changes navigation behavior and preserves the raw video.

## Connection to environment panoramas

A panorama supplies directions from one position. This orbit clip supplies views toward one focal object along one path. It cannot show the reverse direction at every point around that path. The proposed next interaction is to enter object inspection from the environment and return to the previously preserved panorama direction. That integration is a design proposal, not implemented as part of this pilot. A later approach could connect several full panoramas at positions around the vehicle; that would require new views and continuity checks rather than treating this rectangular video as spherical footage.
