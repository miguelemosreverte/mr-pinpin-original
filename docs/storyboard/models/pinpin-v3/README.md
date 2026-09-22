# PinPin: Code-Authored Blender Prototype

Selected review iteration: **pass-08**, 2026-09-22 UTC. Built from scratch with
Blender; no paid API, image generation, or imported reconstruction geometry.

[Browser preview](../../review/pinpin-3d.html?model=v3&rev=pass08) |
[Reference comparison](../../review/pinpin-blender.html?rev=pass08) |
[Three-quarter](renders/three-quarter.png) | [Face](renders/face-closeup.png) |
[Front](renders/front.png) | [Side](renders/side.png) |
[Rear](renders/rear.png) | [Underside](renders/underside.png)

Smaller inset eyes, dark brown irises, subtle mouth, slit nostrils, fine whiskers,
warm fur, brown paws and a softer neck coat transition. All six inspection
renders are 1200px square at 64 samples. One head and four limbs/paws verified.

This is a selected review iteration, not reference-perfect or book-art approval.
Eyes are separate shallow surfaces, not rotatable eyeballs or a gaze rig.
No skeleton, animation, or rig-ready deformation topology. Smooth ears, broad
symmetrical cheeks, glossy eyes and uniform coat flow remain stylized.

Heavy artifacts remain on TB4. Local model.glb and renders/ are symlinks requiring
the mount, not a portable deployment bundle. Prior passes remain intact.
[Provenance](model.md), [manifest](model.json), [structural proof](structure.json).
Pass-08 browser QA PASS (2026-09-22 UTC): desktop 1440x900 and emulated mobile
390x844 in local Chrome, actual canvas pixels, orbit, wheel/pinch and framing.
Both served GLB hashes and all six served render hashes match model.json.
Reference comparison passes at 1440px/390px with quills and paws uncut.
Final viewer framing uses a one-time mesh profile, with no per-frame geometry
scan. Eight orbit angles pass without clipping or header overlap; mobile opening
view fills about 78% of the width and the front preset about 69%. The tighter
viewer passed a fresh desktop/mobile run; v1 regression also passed.
Eye reflection bands remain visible; browser fur is visibly rougher than Cycles.
This 42,055,892-byte, 1,395,084-triangle local prototype has no performance or
art-fidelity approval. [Validation details and evidence](model.md#browser-validation).
