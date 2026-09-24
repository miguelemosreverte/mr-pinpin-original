# Fixed Blender room: E materials and translated camera evidence

E is one editable Blender scene copied from the existing room blockout, with procedural materials, soft lighting, rounded edges and modeled details. No image generation or external texture was used for E. The layout, outward door hinge and principal furniture positions remain those of the existing scene. Both round windows now contain eight radial spokes around transparent central panes; the door has one brass knob.

The scene includes warm oak/plaster, a green door, colored book covers/page blocks, continuous modeled rug rings, cream kitchen ceramics, a copper kettle, stove glow, small plants and a simple modeled garden. The visual target is a soft storybook model; it is intentionally simpler than the approved painted illustration. Materials and objects can be changed in the editable .blend or rebuilt from build_storybook.py plus source-room.blend.

All renders ran on the Mac mini using Blender4.5.14/Cycles CPU,32samples with denoising. E panorama is a true2048×1024 equirectangular render from camera(0,0,1.15)m, EulerXYZ(pi/2,0,0), forward+Y/up+Z. Front is image u=.5,v=.5. The browser displays rotational look-around from this fixed station; it does not move the camera through the room.

Two separate1200×900 perspective renders demonstrate genuine camera translation: center(0,0,1.15) and shifted(.5,0,1.15), with identical Euler orientation,36mm sensor width and22mm lens (horizontal FOV approximately78.58°). Non-camera objects do not move. geometry-validation.json records the same transform hash for all390 non-camera objects at both positions,16windowspokes, one knob and no external texture files. scene-manifest.json records numeric camera matrices, dimensions and render hashes; object-transforms.json records the fixed scene transforms.

The E runtime asset room-blender-materials-v1.webp is a lossless conversion of the panorama,2048×1024,1,274,780bytes,SHA256c728020c60d711eb1d4c83311d7a2c076b271be720e02ebb36c9240325154d3f. Color/grayscale masters, editable scene, recipes and validation files are retained in this pack and the external TB4 workpack. The grayscale control uses a neutral material override and therefore does not preserve the colored render's glass transmission.

F is supplied separately by the coordinator: a whole-panorama image-generation edit of E. It is not Blender material shading and cannot inherit E's geometry guarantees merely because the composition is similar. The projection experiment described separately tests this distinction; it does not change E.

## F1 projection experiment (retained separately)

project_illustration.py copies the E scene and maps the coordinator's F1 image onto existing surfaces using world position relative to the locked origin. UVs are u=.5+atan2(x,y)/(2pi), v=.5+asin(z/r)/pi in Blender's bottom-origin coordinates. An emission shader, sRGB image decode and Standard/no-look/exposure0 avoid relighting or double tone mapping. Transparent window glass remains transparent. The world background uses the same angular mapping with Blender's world-normal sign corrected. No object is added or moved.

The center render reconstructs the painted view closely. At +0.5m X, the projected paint stays attached to real geometry and creates parallax, but newly exposed surfaces reveal obvious failures: garden/tree surfaces inherit wall-colored strips and duplicated window/door fragments. Baked highlights and image/mesh silhouette differences also remain. This is a valid demonstration of the limitation of single-view projection, not a finished room texture or evidence that AI recovered unseen surfaces. E's native procedural materials remain stable under the same translation. The unchanged geometry hashes are recorded in projection-manifest.json.

The F1 test is preserved in external projection-f1/. Root is reviewing a further style version before selecting final projected proof assets; no replacement of E or browser panorama controls occurs in this lane.

## Selected G proof: raw F2 projected onto E

The final projected comparison uses room-blender-illustrated-v2.png (the complete raw F2 panorama), packed into room-illustration-projected-f2.blend. It does not use any later rear-only browser repair. Both selected proof images use the same camera positions/orientation/lens as E. The center result closely reconstructs F2; the +0.5m result again shows correct real-object parallax but conspicuous paint leakage/disocclusion at window centers and newly revealed garden/tree surfaces. This failure is retained visibly, not retouched. The projection is useful only as an experiment demonstrating where a single painted view stops being enough.

All four1200×900 proof images were converted losslessly, with hashes/dimensions in camera-runtime-assets.json: room-blender-camera-center-v1.webp, room-blender-camera-shift-v1.webp, room-projected-camera-center-v1.webp and room-projected-camera-shift-v1.webp. E .blend and materials remain unchanged; G has its own packed image, shader recipe, editable scene and manifest. The saved image provenance plus geometry hashes distinguish real translated geometry from a purely rotational panorama.
