# Directional walking sheet C

Status: review candidate, not approved

- Reading order: 3
- Tool: built-in imagegen
- Started (UTC): 2026-09-20T15:52:48.726Z
- Completed (UTC): 2026-09-20T15:53:48.147Z
- Wall time: 59.421 seconds
- Saved image: docs/storyboard/images/atlas/pinpin-directions-c-v1.png
- Size: 1254 x 1254
- SHA-256: 08c80ee3dc504c7edae7c8ff0edfc707a3c2d3c2cb0c7262e8a9f033a5e2d52f
- Original tool output: /Users/miguel_lemos/.codex/generated_images/01a0a355-7d5b-7ab2-b71b-90cf4df7313d/exec-373c68c9-94c1-407c-971d-c77230824a4e.png

## Source Beat

Mr. PinPin follows the atlas paths in the direction of travel.

## Camera Direction

Row 1: walking mostly away from the viewer and slightly left, nose up-left at 240 degrees. Row 2: walking straight away from the viewer, nose toward the top, symmetric rear view (270 degrees), see spiny back and short walking hind paws. Row 3: walking mostly away from viewer and slightly right, nose up-right at 300 degrees. Row 4: walking diagonally right and slightly away from viewer, nose up-right at 330 degrees, more right-facing profile than row 3.

## Future Character Space

Four rows of headings, four walking phases per row. Intended angular spacing requires visual inspection.

## References

- docs/storyboard/images/atlas/pinpin-walk-v1.png: Character identity and rendering reference

## Exact Tool Prompt

```text
Use case: stylized-concept. Asset: transparent RGBA game sprite sheet for a beautiful children's story atlas. Image 1 is the identity/style reference for Mr. PinPin: the same small natural quadruped hedgehog, cream face, warm brown spines, friendly shiny eyes, four short natural paws. Render a 2048 by 2048 square with exactly FOUR ROWS and FOUR COLUMNS, 16 isolated sprites on genuine transparent background. Each cell has the same virtual scale and centered ground anchor, generous clear margins. Fixed elevated 55-degree camera looking down at the animal on a horizontal ground plane; rotate the actual animal's body direction between rows, not the flat artwork. Within each row show four successive clearly different walking gait phases from left to right, alternating fore and hind paws, all with the SAME heading. Soft warm storybook 3D lighting consistent across all cells, detailed fur and spines, crisp silhouette. Keep compact anatomy low to the ground. No text, numbers, grid lines, floor, backdrop, cast shadow or accessories. Heading convention is the direction the nose travels ON THE IMAGE, clockwise: right=0 degrees, toward bottom=90, left=180, toward top=270. Row 1: walking mostly away from the viewer and slightly left, nose up-left at 240 degrees. Row 2: walking straight away from the viewer, nose toward the top, symmetric rear view (270 degrees), see spiny back and short walking hind paws. Row 3: walking mostly away from viewer and slightly right, nose up-right at 300 degrees. Row 4: walking diagonally right and slightly away from viewer, nose up-right at 330 degrees, more right-facing profile than row 3.
```

## Visual Review

Four distinct heading rows: steep rear-left, centered rear/up, steep rear-right, and shallower rear-right. Approximate requested bins 240/270/300/330; no exact-angle certification. Row 1 is narrower and more rear-facing than sheet B row 4. Sixteen intact walk frames with genuine alpha; red/yellow diagnostic fringe alpha is at most 3/255.

Reviewed (UTC): 2026-09-20T15:57:10.115Z
