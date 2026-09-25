# stop-16 source-lock review

Status: experimental, visually reviewed prototype; no claim of measured geometry or seamless art.

Inspected anchored entry, yaw +/-30 and +/-60 degrees, up/down obliques, all six cardinal directions, rear-up/down, and front-down contacts. Broad trailer and tractor alignment is usable. Road texture and foliage change scale/softness across the source boundary, especially lower left. Rear tree and stream remain readable; repaired pole centers are coherent, with stretched and soft outer overlap bands.

The original source-display.png hash remains 378a60ade1b8188782a42bc89cd84a6ce41d413d73b97eb2c9f14c2e9c1a53be. The selected opening camera, sourceCamera and sourceAnchor.camera are identical to the saved fit-v1 camera. Native source pixels and accepted motion blur remain unchanged. The baked sphere resamples the native source, while runtime retains it separately. No image generation, blur filtering or art edits occurred in this export lane.

Background: panorama-assembled-v1.png, assembled from hash-pinned base/rear/up/down masters at 3072x1536. Source-locked sphere: panorama-source-locked-v1.png at 4096x2048. Cube atlas: source-locked-exports-v1/cube-atlas-v1.png at 3072x2048, with six 1024px faces. All twelve same-ray adjacency checks pass with zero error and six atlas tiles equal their face files. This verifies projection, not artistic continuity.

forward.png shows generated background only; forward-source-locked.png shows the anchored opening. Review contacts: review-final-v1/directions.jpg and review-edges-final-v1/directions.jpg. Browser switching/full 24 review belongs to A and is separate from this deterministic contact review.
