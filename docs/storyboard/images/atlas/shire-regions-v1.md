# Destination segmentation

Status: review candidate, not approved

- Reading order: 1
- Tool: built-in imagegen
- Started (UTC): 2026-09-20T15:07:15.632Z
- Completed (UTC): 2026-09-20T15:07:55.043Z
- Wall time: 39.411 seconds
- Saved image: docs/storyboard/images/atlas/shire-regions-v1.png
- Size: 1536 x 1024
- SHA-256: 7a827776c069f31da3ce0d71bd686e621f6b00c0e81c0778b5200cd6199b9b27
- Original tool output: /Users/miguel_lemos/.codex/generated_images/01a0a355-7d5b-7ab2-b71b-90cf4df7313d/exec-fea65f32-7d70-4fa3-9b37-9e97a5bb22d3.png

## Source Beat

Natural silhouettes become touch targets instead of badges.

## Camera Direction

Preserve the source atlas exactly,1536x1024.

## Future Character Space

Black noninteractive ground, red lake, purple Elder tree home, green family cottage, cyan bridge and picnic destination.

## References

- docs/storyboard/images/atlas/shire-v1.png: Exact edit target, same terrain coordinates and frame.

## Exact Tool Prompt

```text
Use case: precise-object-edit. Edit the supplied 1536x1024 atlas into an EXACTLY REGISTERED FLAT COLOR SEMANTIC SEGMENTATION MASK, not a new landscape. Preserve the image framing, scale and the boundaries/locations of the existing features. Output 1536x1024. Paint every nonselected pixel pure solid BLACK #000000. Use only FOUR solid flat colors for FOUR disjoint organically shaped regions following the depicted objects, with NO texture, shading, gradients, outlines or text. Region1: pure RED #ff0000 fills the full Crystal Lake water silhouette in the central upper-left, following its actual irregular shores, excluding the large tree and the land inside the lake. Region2: pure PURPLE #8000ff fills the Elder's massive oak trunk/root mass, burrow entrance and immediate front doorstep in the TOP RIGHT, a natural silhouette at that exact location. Region3: pure GREEN #00ff00 fills the family cottage moss roof, facade, chimney, garden and immediate stepping-stone doorstep in the LOWER LEFT; follow the cottage/garden silhouette rather than a rectangle. Region4: pure CYAN #00ffff fills the wooden footbridge and its immediately adjacent picnic clearing on the right bank, around center-right, one contiguous natural target area reaching the checked picnic cloth but NOT reaching the tractor further down. All areas should be broad readable touch regions. Keep these four regions separated by black ground. The output is a machine-readable flat-color label image: black background plus solid red, purple, green, cyan shapes exactly placed over their source features. No pins, no circles, no lettering, no characters. Do not move, resize, rearrange or redraw the scene geometry.
```

## Visual Review

Good approximate alignment of all four landmark silhouettes. Color areas include tiny antialiased variations requiring tolerant classification. Unwanted black holes remain at the Elder doorway, cottage windows and picnic furniture, and red includes disconnected upstream water. Superseded for interaction by a targeted hole-filling edit; preserve this attempt as evidence.

Reviewed (UTC): 2026-09-20T15:08:43.203Z
