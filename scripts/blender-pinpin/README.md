# PinPin Authored Prototype

Deterministic Blender 4.5 Python geometry, no imported model or image-to-3D API.
`config.py` owns proportions and seed. `anatomy.py` fuses skin volumes and
preserves boundary normals when splitting semantic regions. `face.py` owns
independent eyes; `groom.py` authors swept dorsal quills and short cream fur.

Run on the mini, writing only to TB4:

```sh
TMPDIR=/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/tmp LC_ALL=C LANG=C \
/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/MacOS/Blender \
--background --python build.py -- --output /Volumes/TB4/mac-mini-storage/shared/pinpin-blender-v3/pass-01
```

The first pass renders three-quarter and face close-up only, saves the editable
`.blend`, exports the character-only GLB and writes structural evidence. Later
views can be rendered from the saved blend with `--python render.py -- --output ...`.
Anatomical front is -Y in Blender, +Z after GLB export; L is +X. The root scale
sets authored nose-to-rump length to 25 cm. Quill tips are outside this measurement.
No rig, animation, skeleton-ready topology, or final visual approval is claimed.

Implementation references inspected:
- https://docs.blender.org/api/5.3/bpy.types.RemeshModifier.html
- https://docs.blender.org/api/current/bpy.types.Mesh.html
- https://docs.blender.org/api/current/bpy.ops.export_scene.html
- https://github.com/simonw/gpt-6-astra-blender-pelican-bicycle/blob/main/work/pelican_scene.py

These informed the headless bpy workflow, not imported geometry. API availability
is checked against the installed Blender when executing; current documentation
may describe a newer release.
