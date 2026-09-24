# Earlier illustrated panorama benchmarks

Status: reviewed from fresh actual-renderer captures, including exact poles; historical comparison only.

Two earlier illustrated results are relevant. Neither is the pure gray Blender control, and neither uses the current three-room house layout.

| Version | Actual displayed art | Repair treatment |
|---|---|---|
| A — legacy refined panorama | `room-panorama-v3.webp` | Four 110° perspective repairs: front, rear, up, down; front uses its narrow calibrated mask |
| F — illustrated Blender study | `room-blender-illustrated-v2.webp` | One 110° rear-wall repair, `room-blender-rear-repair-v1.webp` |

The existing implementation is `home-panorama-gl.js`, with `PANORAMA` from `home-panorama-config.js` and `BLENDER_ILLUSTRATED` from `home-blender-config.js`. A must be shown with all four repairs enabled; its flat base alone is not the completed result. F must include its rear repair. Pure Blender/material/gray versions do not establish that the illustrated versions were successful.

Both earlier designs show an older single-room arrangement with an open exterior entry between round windows. Current native/wrap art is a different three-room proposal with closed exterior entry and private doorways. This comparison evaluates visible spherical continuity and appearance, not whether old geometry can replace the current house.

Original comparison controls were limited to ±65° pitch. The new historical review extends inspection toward and at the actual poles; it must not claim the old interface had already proven them.

## Fresh visual verdict

**Both completed historical versions are stronger full-sphere illustrations than the current native panorama after its bounded rear-wrap repair, especially at the poles.** This is a visual judgment from the actual patched renderer, not a claim of exact geometry or flawless seams. A is the richer decorative benchmark; F is the simpler, more restrained benchmark.

- **A:** the entry, round windows and rear table read coherently. At exact zenith the crossed timber beams remain recognizable; at exact nadir the braided rug remains a flat, readable textile surrounded by floorboards. The rear-floor view still shows a thin bright horizontal join across the boards before the rug. This is a residual repair boundary, so “completely seamless” would overstate the result.
- **F:** entry and rear table are coherent, with simpler furnishing and lighting. Exact zenith has a softened, somewhat flattened ceiling-panel convergence; exact nadir has mild radial compression in the woven rug. A faint transition around the rear rug/floor remains. Neither resembles the severe beam loops and rug/foliage collapse in the current native artwork.
- **Current native plus wrap repair:** the repaired rear wall is substantially more continuous, but its unmodified pole caps still contain the conspicuous ceiling and floor distortions documented in the native review. That repair did not attempt to match the historical pole quality. Its newer three-room connections also carry different semantic issues; the earlier single-room art cannot demonstrate that those connections are solved.

The useful precedent is a finished illustrated panorama with its actual repair stack retained and inspected. A itself is Blender-guide-derived; describing it as proof that an entirely image-only process guarantees continuity would be inaccurate. Neither historical picture is a drop-in replacement for the current measured three-room house.

## Inspection evidence

Fresh captures are retained on TB4 at:

`/Volumes/TB4/mac-mini-storage/shared/pinpin-house-wrap-repair-20260924/history-check/`

Reviewed paired `entry`, `rear`, `rearFloor`, and `exact-up`/`exact-down` captures for A and F. The exact pole captures use shader pitch **+90° and −90°**; ordinary up/down report presets use ±89°. All historical overlays were enabled. This extends beyond the original interface's ±65° limit, rather than inferring pole quality from its restricted view.

The report's historical section exposes both completed illustrated configurations. This review approves their use as comparative evidence only; it does not approve a new chapter asset or change the canonical house plan.
