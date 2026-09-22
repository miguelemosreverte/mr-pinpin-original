# PinPin v3 Provenance

## Selected Review Iteration

Pass-08 is selected for local review, not reference-perfect or final book-art
approval. Code-authored Blender 4.5.14 LTS, seed 210926.
One connected skin before semantic partition; one head, four named limbs and
four named paws. Independent shallow almond eye surfaces, cupped ears, shaped
muzzle, inset nostrils, eight fine whiskers, geometric fur and swept quills.
No paid API, image generation, imported reconstruction, skeleton or animation.
Eye patches are not rotatable eyeballs and are not gaze-ready.

Visual references: ../pinpin-v1/reference.png and
../pinpin-v2/reference-front.png. Earlier reference records/hashes remain in
model.json. Images guide appearance only; they are not geometry or textures.

## Artifacts And Execution

Base: /Volumes/TB4/mac-mini-storage/shared/pinpin-blender-v3/pass-08/
- pinpin.blend: editable authored scene.
- model.glb: 42,055,892 bytes.
- SHA-256: 3e97008d6fe125631f346b4635352ee0939cc607f965e1ba5122f0785b93b8a6
- renders/: front, three-quarter, side, rear, underside, face-closeup.
- source/: exact frozen Python modules used by this pass.
- structure.json: parameters, source hashes, argv, export and structural evidence.
- build.log: full Blender execution output.

All heavy work ran on mini, with source copied through the TB4 mount.
All six renders are 1200 square, 64 Cycles samples, Metal, denoised.
Front ortho scale 2.60 and target height 1.05; feet/crown tips remain in frame.

```sh
ssh mini 'env LC_ALL=C LANG=C TMPDIR=/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/tmp /Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/MacOS/Blender --background --python /Volumes/TB4/mac-mini-storage/shared/pinpin-blender-v3/pass-08/source/build.py -- --output /Volumes/TB4/mac-mini-storage/shared/pinpin-blender-v3/pass-08 --views face-closeup,three-quarter,front,side,rear,underside --size 1200 --samples 64 > /Volumes/TB4/mac-mini-storage/shared/pinpin-blender-v3/pass-08/build.log 2>&1'
```

This is the completed command. Reproduction must use a new output directory;
the builder rejects reuse of existing blend/GLB outputs.
Started 2026-09-22T02:24:03.352806+00:00; export completed 2026-09-22T02:24:47.481712+00:00.
Measured 44.13s through export, excluding final blend save.

## Verification And Review

Actual GLB independently parsed: one head, four limb nodes, four paw nodes, six
distinct sclera/iris/pupil meshes, 56 meshes total, 1,395,084 triangles,
zero skins and zero animation clips. Export hash and all seven frozen source
hashes match structure.json. Iris vertex color is exported as COLOR_0.
Final integrated groom SHA-256:
7e961b3ccd9b091192c512a65cc5f060e0e97ade976340f3129dbe2ee964dc36.

Inspected all six pass-08 images. The two quills visible below the chin in
pass-07 are absent; the neck boundary is softer. Tighter front framing retains
feet and crown. Earlier passes 01-07 are preserved. Passes 04-08 each freeze
their own source snapshot; model.json retains chronological artifact hashes.

Remaining differences: smooth regular ears, broad symmetric cheeks, glossy
eyes, stylized uniform coat flow and a still-visible coat transition. Dense
fur/quill meshes and open semantic skin partitions are not rigging-ready.
Nominal nose-to-rump length is 25cm, excluding quill tips.

### Browser Validation

PASS for the actual published pass-08 on 2026-09-22 UTC, using rev=pass08.
Both canonical symlinks were verified as pass-08 before and after QA.
Existing scripts/verify-pinpin-model.cjs passed in local Chrome at 1440x900
desktop and 390x844 emulated mobile: nonblank framed canvas pixels, automatic
rotation, mouse/touch orbit changing pixels, wheel/two-finger pinch changing
camera distance without page zoom, and no page/console/request/HTTP errors.

Both browser-served GLBs matched the local file and model.json exactly:
42,055,892 bytes; SHA-256
3e97008d6fe125631f346b4635352ee0939cc607f965e1ba5122f0785b93b8a6.
Loaded geometry: 56 meshes, 1,395,084 triangles. All six 1200x1200 render images
also matched the published manifest's byte counts and SHA-256 in both review
viewports. Reference/current-front comparison is side by side on desktop,
stacked on mobile, without overflow or overlap. Reference quills and paws are
uncut; estimated subject heights are about 90% reference and 82-84% current.

Visual limitations remain: Cycles eyes have horizontal gray reflection bands;
the browser softboxes produce conspicuous rectangular gray bars in the pupils.
Browser fur shows fine stippling/aliasing and stronger shading than the Cycles
renders. This is functional QA of a large local prototype, not art approval,
reference fidelity, a real mobile-device benchmark, or a performance claim.

Evidence root:
/Volumes/TB4/mac-mini-storage/shared/pinpin-blender-v3/browser-refinement/pass-08/
- viewer/results.json and viewer/{desktop,mobile}-{front,side,rear}.png
- viewer/desktop-eye-inspection.png (closer reflection inspection)
- review-results.json (served render hashes and layout checks)
- review-1440.png and review-390.png (complete review pages)
- comparison-1440.png and comparison-390.png (front comparison)

Reports: /tmp/pinpin-blender-pass08-verification.md and
/tmp/pinpin-blender-viewer-refinement.md. Earlier pass-03 QA evidence is retained
separately and was not reused as pass-08 acceptance.

Final framing follow-up: replaced the v3 bounding-sphere fit with a one-time
mesh profile and an orbit envelope. No geometry scan runs per animation frame.
Eight horizontal orbit angles pass without model clipping or header overlap;
the mobile opening view occupies about 78% of viewport width, and the front
preset about 69%. Orbit distance remains fixed while rotating. Fresh isolated
desktop/mobile verification and v1 regression pass. The model hash is unchanged.
Disabling fine-fur shadows was tested and rejected; original shadow flags remain.
Remaining strand stippling is not represented as solved.

Final evidence in the same root: viewer-framing/results.json,
framing/framing-results.json, framing/mobile-initial-final.png and
framing/mobile-front-final.png. Report:
/tmp/pinpin-blender-pass08-framing-verification.md.

Local publication updates only TB4 symlinks and small provenance files.
No web deployment, git commit or staging. The mount is required for local use.
