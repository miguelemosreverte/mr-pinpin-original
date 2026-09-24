# Bathroom repair-layer boundary

The user reported a broken bathtub side, disconnected metal band and doubled rug in the illustrated house tour. This escaped the earlier cardinal-view review: it is most visible at the oblique floor/tub transition, near yaw 1.9 radians and pitch −0.5 radians.

Layer-isolation checks reproduced the defect. Removing the downward repair restored the continuous tub; removing the front or rear repairs did not. The downward image had been generated to straighten the floor, but it also contained a slightly different tub silhouette. The general square feather blended two incompatible object outlines.

The selected correction restricts the downward repair to the floor side of its image. In normalized downward perspective coordinates, its existing alpha is multiplied by `1 − smoothstep(0.00, 0.08, q.x)`. This tapers over a narrow strip before the bathtub/rug portion, so that portion comes from the original panorama and its existing rear repair. The central/left floor repair and previous door cleanup remain active. The wider tested transition `0.10 → 0.30` was rejected because it still crossed the rug weave.

This is a renderer-mask correction, with no new artwork generation, texture editing or Blender render. The optional mask is enabled only for the bathroom. Other room configurations retain their existing blend. The original textures and their generation records remain intact in [the image-led tour pack](../house-image-tour-20260924/README.md).

The tub, its rim and metal bands are the specific acceptance target. Some original perspective curvature in the rug remains; this change does not claim new measured geometry or a completely reconstructed room.

Diagnostic exports preserve the source stack and cameras under `projection/`. The browser comparison and checks are recorded with the final report. This is a local review update, not an official reader-site deployment.
