# Estimated Shire depth

Status: review candidate, not approved

- Reading order: 1
- Tool: built-in imagegen
- Started (UTC): 2026-09-20T16:35:25.816Z
- Completed (UTC): 2026-09-20T16:36:14.655Z
- Wall time: 48.839 seconds
- Saved image: docs/storyboard/images/atlas/shire-depth-v1.png
- Size: 1536 x 1024
- SHA-256: bf30f8bebe002348d6e911a3a0fe5ef8a8b02d14a17d9dccb8ab4f59aee0e2ec
- Original tool output: /Users/miguel_lemos/.codex/generated_images/01a0a355-7d5b-7ab2-b71b-90cf4df7313d/exec-80d8257c-1221-4ee6-b764-040072ff9250.png

## Source Beat

Depth supplies relative focus distances for the existing map.

## Camera Direction

Same elevated atlas camera and exact 1536-by-1024 framing. Black nearer, white farther.

## Future Character Space

No characters are added to the depth pass. Paths and sprites are composited separately in world coordinates.

## References

- docs/storyboard/images/atlas/shire-v1.png: Exact original atlas geometry and composition

## Exact Tool Prompt

```text
Use case: precise-object-edit. Create a DEPTH PASS of the supplied illustrated Shire map, not a new scene. Image 1 is the exact registered source image. Output a 1536 by 1024 grayscale RGB image, same framing, same projection, every object boundary and location aligned exactly with the original. Preserve the full image extent. Represent estimated camera distance only: nearest foreground at the bottom is dark charcoal, farthest background at the top is light gray; nearer raised tree canopies are darker than the ground immediately behind them. Smooth continuous grayscale changes across terrain and water, coherent flat-ish surfaces, crisp depth discontinuities at building, canopy, bridge and rock edges. The lake water is one continuous smooth depth surface, the bridge sits above the stream, roofs are closer than their surrounding ground. Remove all color, sunlight, shadows, reflections, wood grain, flowers' color texture and decorative surface shading; those do not encode depth. Use the available gray range roughly 20 to 235, retain subtle depth gradations. This is a clean camera-distance buffer suitable for depth-of-field rendering, not a pencil sketch, not a grayscale photograph, not a height contour map. No text, labels, outlines, legends or border. Keep the exact same scene geometry and composition.
```

## Visual Review

The full map framing and major lake, tree, cottage, Elder house, bridge and tractor locations are retained. Foreground is darker and background lighter; raised canopies separate from nearby ground. This is an artistic depth estimate: fine foliage boundaries are not guaranteed pixel-exact, and bright stream/waterfall structures appear to retain some source-lighting bias. Suitable for a restrained focus-effect preview, not geometry, navigation, occlusion or measured distance.

Reviewed (UTC): 2026-09-20T16:36:52.394Z
