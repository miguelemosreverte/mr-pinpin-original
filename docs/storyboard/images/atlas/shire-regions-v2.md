# Filled destination touch regions

Status: review candidate, not approved

- Reading order: 2
- Tool: built-in imagegen
- Started (UTC): 2026-09-20T15:08:56.786Z
- Completed (UTC): 2026-09-20T15:09:19.969Z
- Wall time: 23.183 seconds
- Saved image: docs/storyboard/images/atlas/shire-regions-v2.png
- Size: 1536 x 1024
- SHA-256: 89520ed7acf156bf925d62f79dc807892b3b828e1f19a499007634e303c9e810
- Original tool output: /Users/miguel_lemos/.codex/generated_images/01a0a355-7d5b-7ab2-b71b-90cf4df7313d/exec-b99a197f-bbf5-4e07-945f-5b4c34fea92a.png

## Source Beat

Fill holes so doorways and picnic props are included in touch regions.

## Camera Direction

Exactly preserve segmentation mask coordinates and dimensions.

## Future Character Space

Same four palette colors on black; solid internally filled destinations.

## References

- docs/storyboard/images/atlas/shire-regions-v1.png: Edit target. Keep outlines, size and position unchanged except remove the disconnected red upper-left water patches.

## Exact Tool Prompt

```text
Use case: precise-object-edit. Edit ONLY this segmentation mask, same 1536x1024 frame. Keep existing external boundaries and locations of the four large colored shapes. Make each main region solid and internally filled: fill the black oval doorway hole inside the PURPLE oak roots with exactly the surrounding PURPLE #8000ff; fill the black gaps within the root/home mass as a broad contiguous tap target. Fill the black circular windows and black outlined doorway/stone outlines INSIDE the GREEN cottage with GREEN #00ff00. Fill the black picnic furniture, cloth hole and internal bridge holes INSIDE the CYAN bridge/picnic region with CYAN #00ffff. Keep black background outside the external silhouettes. Keep the big central RED lake #ff0000. Remove ONLY the detached small red patches in the upper-left near the top edge and far left above the big lake, making those disconnected patches BLACK. Pure flat solid colors, black background, absolutely no lettering, no texture, no shading, no gradients. Do not move or rescale any of the four main regions. This is a pixel-aligned click-mask, so a dark doorway must be INCLUDED in its region, not cut out.
```

## Visual Review

The Elder doorway, cottage windows and picnic furniture are now included in their regions. Detached upstream lake patches are removed. Four main destination silhouettes remain approximately registered to source artwork, with minor boundary approximation. Use tolerant palette classification rather than strict exact RGB equality. Suitable first interaction mask pending pixel tests.

Reviewed (UTC): 2026-09-20T15:10:04.330Z
