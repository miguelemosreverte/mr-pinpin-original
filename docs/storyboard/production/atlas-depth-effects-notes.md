# Depth occlusion and adjustable bokeh

Local implementation and Chrome verification, 2026-09-20. Original artwork and
depth assets remain unchanged. No publication or approval changes.

## Foreground occlusion

The WebGPU compositor compares scenery depth against a separate depth for each
overlay. White route fragments use a calibrated ground-depth curve at their
world Y; all character pixels use the depth at his feet. This permits a canopy
to cover the character's head while exposed feet remain visible. Comparing an
overlay with the scenery's own depth at the same pixel would not work.

`gpu/occlusion.js` defines the conservative model. Its authored clear-path samples,
provenance and limitations are recorded in `gpu/occlusion-calibration.json`; tests
keep both records consistent. A 0.12 depth bias and 0.05 feather ignore small
shading differences. A nine-sample neighborhood mean suppresses isolated dark
and bright flecks that could make holes in the character. Extra samples execute only where a
trail or character fragment is present.

This is approximate occlusion, not recovered 3D geometry. The artistic depth pass
has imperfect foliage contours and some lighting bias. Terrain at the same Y
can have different depth; thin branches and weak discontinuities may not hide
overlays. Canvas2D fallback keeps the character and paths visible but reports
occlusion unavailable. Navigation and story selection are unchanged.

The character uses a 128x128 canvas/texture, plus a 1x1024 ground-depth strip:
68 KiB of extra GPU textures. Sprite uploads happen only when the pose changes;
position updates only alter uniforms. No per-frame canvas readback or full-map
CPU masking was added. Banners remain readable interface elements above the map.

## Desktop tuning

Tab from the map/background opens the small top-right debug panel; Escape closes
it. Normal Tab navigation inside controls, text editing, language menus and story
dialogs remains intact. Phones and coarse-pointer tablets never show the panel.

The bokeh slider spans 0-400%: 0 is sharp, 100% retains the original look, and
400% increases the maximum blur radius from 12 to 48 source pixels and allows
full blurred-image blending. Strong settings reveal grain from the 64-tap bake
and contours in the estimated depth map; they are useful exploration settings,
not a claim of physically exact lens simulation.

Input is coalesced for 120 ms, with immediate commit on release. Desktop tuning
is remembered in sessionStorage; mobile starts at the unchanged default. No new
production buttons were introduced. The cache stays within four slices/24 MiB,
including textures waiting for GPU completion, and zero strength does not bake.

## Verification

- Synthetic GPU scene: foreground hides head and route dashes, exposed feet stay
  visible, and minor shading does not erase open-ground trails.
- Real tree crossing: desktop and phone-size on/off comparisons visibly hide the
  previously floating character and dashes behind the same foreground tree.
- Integrated bokeh/Tab/mobile/session checks at strengths 0, 1 and 4 passed.
  Screenshot edge-energy measurements decreased from 35.66 to 20.95 to 9.67.
- Performance budgets passed at desktop and phone sizes: about 60 fps walking,
  15 fps resting, no paused draws/uploads, no steady background requests. Body
  transfers remain about 12.55 MB. These are local Chrome measurements, not phone
  battery or physical-device GPU measurements.

With the existing server on port 8767 and Playwright available:

```sh
node --test scripts/atlas-occlusion.test.cjs scripts/atlas-dof-strength.test.cjs
node scripts/verify-atlas-occlusion.cjs
node scripts/verify-atlas-debug.cjs
node scripts/verify-atlas-depth-effects.cjs
ATLAS_PERF_CHECK=1 node scripts/measure-atlas-performance.cjs /tmp/atlas-depth-performance.json
```

`PLAYWRIGHT_MODULE` can point to an installed Playwright package. Captures from
the integrated check are written to `/tmp/pinpin-depth-effects/`; occlusion
comparison captures are `/tmp/pinpin-occlusion-tree-<width>-on.png` and `-off.png`.
