# Bathroom repair-layer boundary

The user reported a broken bathtub side, disconnected metal band and doubled rug in the illustrated house tour. This escaped the earlier cardinal-view review: it is most visible at the oblique floor/tub transition, near yaw 1.9 radians and pitch −0.5 radians.

Layer-isolation checks reproduced the defect. Removing the downward repair restored the continuous tub; removing the front or rear repairs did not. The downward image had been generated to straighten the floor, but it also contained a slightly different tub silhouette. The general square feather blended two incompatible object outlines.

The selected correction restricts the downward repair to the floor side of its image. In normalized downward perspective coordinates, its existing alpha is multiplied by `1 − smoothstep(0.00, 0.08, q.x)`. This tapers over a narrow strip before the bathtub/rug portion, so that portion comes from the original panorama and its existing rear repair. The central/left floor repair and previous door cleanup remain active. The wider tested transition `0.10 → 0.30` was rejected because it still crossed the rug weave.

This is a renderer-mask correction, with no new artwork generation, texture editing or Blender render. The optional mask is enabled only for the bathroom. Other room configurations retain their existing blend. The original textures and their generation records remain intact in [the image-led tour pack](../house-image-tour-20260924/README.md).

The tub, its rim and metal bands are the specific acceptance target. Some original perspective curvature in the rug remains; this change does not claim new measured geometry or a completely reconstructed room.

Diagnostic exports preserve the source stack and cameras under `projection/`. The browser comparison and checks are recorded with the final report. This is a local review update, not an official reader-site deployment.

## Follow-up: ghosted rug beside the basket

The user confirmed the tub correction, then identified a translucent duplicate rug edge at a steeper angle (yaw 1.66785, pitch −1.10346, FOV 90). This is a separate remaining defect: the tub-only acceptance views did not establish a clean floor at every angle.

Isolation showed that removing the downward layer clears the ghost but restores the older pinched rug outline. Moving its boundary farther left or limiting the rear layer to the wall did not produce an acceptable combined result. Those mask-only trials were rejected.

For this follow-up, the actual assembled panorama was exported as a square perspective at yaw 3.0, pitch −0.95, FOV 90. The built-in image-generation tool received that export as its sole edit target and one local cleanup instruction. It reconstructed the rug's opaque outer edge and the adjacent floor. The original result is preserved unchanged as `rug-join-v1.png`; exact prompt, input/output hashes and generation record are in `rug-join-prompt.txt` and `rug-join-generation.json`. This follow-up adds one image-generation call, unlike the earlier renderer-only tub correction.

The viewer registers a narrowly masked portion of this corrected perspective as a final detail layer over the assembled image, so it cannot blend the old ghost back into the corrected core. The camera, bounded mask and loaded revision are recorded in the tour configuration and browser review. This remains an image-led local experiment; no Blender geometry was changed and no official reader-site release was made.
