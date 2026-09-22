# Directional walking sheet A

Status: review candidate, not approved

- Reading order: 1
- Tool: built-in imagegen
- Started (UTC): 2026-09-20T15:50:42.145Z
- Completed (UTC): 2026-09-20T15:51:38.247Z
- Wall time: 56.102 seconds
- Saved image: docs/storyboard/images/atlas/pinpin-directions-a-v1.png
- Size: 1254 x 1254
- SHA-256: 8be56abd29348419d471151cf5092b41567ed73fe2a97a15b665c320357159c0
- Original tool output: /Users/miguel_lemos/.codex/generated_images/01a0a355-7d5b-7ab2-b71b-90cf4df7313d/exec-dc14d1c8-fb94-4160-b4fb-67cc4ae79c9a.png

## Source Beat

Mr. PinPin follows the atlas paths in the direction of travel.

## Camera Direction

Row 1: walking exactly right, right-facing profile (0 degrees). Row 2: walking diagonally right and slightly toward the viewer, nose down-right at 30 degrees. Row 3: walking mostly toward the viewer and slightly right, nose down-right at 60 degrees, more frontal than row 2. Row 4: walking straight toward the viewer, nose toward the image bottom, symmetric front view (90 degrees).

## Future Character Space

Four rows of headings, four walking phases per row. Intended angular spacing requires visual inspection.

## References

- docs/storyboard/images/atlas/pinpin-walk-v1.png: Character identity and rendering reference

## Exact Tool Prompt

```text
Use case: stylized-concept. Asset: transparent RGBA game sprite sheet for a beautiful children's story atlas. Image 1 is the identity/style reference for Mr. PinPin: the same small natural quadruped hedgehog, cream face, warm brown spines, friendly shiny eyes, four short natural paws. Render a 2048 by 2048 square with exactly FOUR ROWS and FOUR COLUMNS, 16 isolated sprites on genuine transparent background. Each cell has the same virtual scale and centered ground anchor, generous clear margins. Fixed elevated 55-degree camera looking down at the animal on a horizontal ground plane; rotate the actual animal's body direction between rows, not the flat artwork. Within each row show four successive clearly different walking gait phases from left to right, alternating fore and hind paws, all with the SAME heading. Soft warm storybook 3D lighting consistent across all cells, detailed fur and spines, crisp silhouette. Keep compact anatomy low to the ground. No text, numbers, grid lines, floor, backdrop, cast shadow or accessories. Heading convention is the direction the nose travels ON THE IMAGE, clockwise: right=0 degrees, toward bottom=90, left=180, toward top=270. Row 1: walking exactly right, right-facing profile (0 degrees). Row 2: walking diagonally right and slightly toward the viewer, nose down-right at 30 degrees. Row 3: walking mostly toward the viewer and slightly right, nose down-right at 60 degrees, more frontal than row 2. Row 4: walking straight toward the viewer, nose toward the image bottom, symmetric front view (90 degrees).
```

## Visual Review

Four visually distinct heading rows: right profile, shallow front-right oblique, steeper front-right oblique, and centered front/down. Approximate requested azimuth bins 0/30/60/90; exact 30-degree spacing is not measured. Sixteen intact walk frames with true alpha. Red/yellow diagnostic fringe has alpha at most 3/255 and is not visible in the 56-map-pixel atlas composite.

Reviewed (UTC): 2026-09-20T15:57:10.020Z
