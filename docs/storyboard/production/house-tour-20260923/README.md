# Connected three-room house tour

The selected local tour uses three illustrated panoramas derived from the same Blender house with both internal doors open. The continuous-panorama revisions substantially improve the earlier cube-panel discontinuities. They remain reviewed proposals with visible limits: a narrow bedroom ceiling/wrap line, softened detail, approximate fixture silhouettes and some cross-room trim differences. See [the art review](art-review/ART-REVIEW.md) before treating them as final designs.

- `geometry/`: direct Blender atlases, camera transforms, jobs and portal visibility evidence.
- `references.json`: prior refined panorama, repair views and actual book references, with hashes and separate geometry/style roles.
- `ART-DIRECTION.md`: finishes, fixed fixtures, camera and continuity decisions.
- `prompts/` and `generation-jobs/`: exact prompt text and ordered reference identities; historical attempts remain recorded.
- `illustrated/<room>/`: selected runtime cubemap, generation and deterministic projection records. Original PNGs stay on the mini SSD.
- `art-review/`: failed checks, versioned input/screenshot hashes and observations at all twelve edges and six face centers per room.

## Current workflow

Render a true six-face gray cubemap from each fixed camera. Reproject that atlas and the illustrated draft into matching 2:1 equirectangular panoramas. Give the entire gray sphere and entire illustrated sphere to **one built-in imagegen call per room**. Gray supplies geometry; artwork supplies appearance. Preserve the returned original, then mathematically convert it to the runtime cubemap without creative retouching. Finally compare gray and art in the actual viewer at all cube edges, face centers and the floor/ceiling poles.

The three camera origins are common `[-1.3,-1.3,1.15]`, bath `[-2.4,2,1.15]` and bedroom `[1.45,1.2,1.15]`, meters in the same world frame. Internal doors are open75° and the front door is closed0° in all views. Station changes show connected views; they do not provide free camera translation through an AI-textured model.

The initial whole 3×2 atlas calls returned1536×1024 despite a3072×2048 request and visibly disagreed between panels. Those attempts remain preserved. The selected continuous calls returned1774×887 despite a2048×1024 request; conversion to512-pixel cube faces does not restore lost detail. `bedroom-v2.txt` is an unused prepared atlas revision, not a generated result.

Mathematical direction/edge agreement certifies the projection code, not the painted scene. The final bounded art inspection covered36 edge views and18 face centers, with remaining defects explicitly recorded. Nothing here implies approved chapter art or exact geometry fidelity.

## Prior style benchmark

The reference benchmark is `home-panorama-gl.js` rendering `PANORAMA` from `home-panorama-config.js`: `room-panorama-v3.webp` plus front/rear/up/down repairs at110°, including the narrow front mask. The base alone omits those corrections. This earlier refined illustration itself used an older Blender spherical guide; it should not be described as having no geometry input. Its old one-room layout supplies a style example, never authority over this three-room plan.

The reusable canonical location and CLI remain at `docs/storyboard/locations/pinpin-house/` and `tools/locations/`; this experiment does not rewrite them. Raw masters, reprojections and captures live under `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/`, with source records retaining hashes. Root license/content notices apply. Reference hashes are provenance, not new rights grants. Approved chapter art and the public book were not changed by this local study.
