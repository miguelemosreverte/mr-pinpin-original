# Illustrated house tour from historical A

Status: **three-room prototype assembled, reviewed and ready for feedback**. This study tests whether historical A’s detailed illustrated room can support a visually coherent, connected three-room tour without making a new Blender model.

The user explicitly chose an image-based bootstrap for this experiment. The normal [canonical location workflow](../../locations/AGENTS.md) is deliberately not executed here: no new measured plan, Blender geometry or translated camera render is claimed. The canonical location pack and its geometry authority remain unchanged. Historical A itself **did** use a Blender guide; “no new Blender” describes this new work, not its ancestry. See [A’s timeline and inputs](../house-wrap-repair-20260924/BENCHMARK-A-TIMELINE.md).

## Implemented construction

1. Preserved historical A’s spherical common-room base and its front, ceiling and floor repairs. Generated a new registered rear view containing two open internal doorways, one to the bathroom and one to the bedroom. Keep the surrounding illustrated architecture and material language recognizable.
2. Generated one complete equirectangular bathroom panorama and one complete bedroom panorama, using the relevant published book images for room identity and a common-room image for shared style/context. These are whole-room images, not six independent face generations.
3. Registered and reviewed the three fixed viewing nodes. Door targets connect common↔bathroom and common↔bedroom; there is no invented direct bathroom↔bedroom link. Entering a room changes the selected panorama and arrival direction.
4. Inspected the actual perspective viewer, especially the common-room rear patch boundaries, the new door frames and what each doorway appears to reveal, each room’s wrap, ceiling and floor. Keep imperfections and changes visible in the review.

The renderer provides rotation and zoom from a fixed point in each room. Clicking a doorway is a node-to-node transition, **not continuous movement through a measured 3D house**. The illustrations suggest connections; they do not prove matching physical dimensions, occlusion or room positions across viewpoints. Compare visible neighboring-room cues without treating them as geometry validation.

Root owns exact prompts, generation records and selected media. Projection work retains source images and records deterministic conversions separately from artwork changes. UI work owns `house-image-tour.*`. This review lane owns only this README and [REVIEW.md](REVIEW.md). All new candidates use this separate pack; approved chapter images, historical A assets and the canonical house remain untouched.

## Evidence to retain

Record each generation’s exact prompt, tool result, input paths/hashes with explicit reference roles, native dimensions, output hash and candidate status. Record the common-room base/repair selection and each new image’s viewer projection, door targets and arrival directions. A derived cube, if used, is a sampling representation of the generated panorama and does not create measured geometry. Prefer live source-resolution repairs where appropriate; do not claim that a checksum or mathematically matching sampling ray proves painted continuity.

Open [the local tour](../../../house-image-tour.html) and [the observed review](REVIEW.md). This iteration used nine image-generation calls: one common rear replacement, two complete private-room panoramas, five initial targeted corrections (bath front/rear/down; bedroom rear/down), and one final bathroom floor cleanup. Two deterministic coverage derivatives preserved the existing repair in the spherical base and overlapping downward view; a fragment outside their source coverage required the final image edit. The selected bathroom uses `panorama-door-v2.png` and `down-v3.png`. The private ceilings were retained without extra repair images. No publishing or final visual approval is implied by this pack.
