# PinPin first walking sprite

Status: review candidate, not approved

- Reading order: 5
- Tool: built-in imagegen
- Started (UTC): 2026-09-20T15:18:01.220Z
- Completed (UTC): 2026-09-20T15:19:02.001Z
- Wall time: 60.781 seconds
- Saved image: docs/storyboard/images/atlas/pinpin-walk-v1.png
- Size: 1254 x 1254
- SHA-256: 4cb83d0e03d451de656275212b08a8d64bd789e2160bd0bead290dbd6999a857
- Original tool output: /Users/miguel_lemos/.codex/generated_images/01a0a355-7d5b-7ab2-b71b-90cf4df7313d/exec-dab99e95-034a-4ffd-8336-3625e33d2ded.png

## Source Beat

A four-frame quadruped walk cycle for a small traveler on the atlas.

## Camera Direction

Fixed high three-quarter camera looking down at one small hedgehog facing right; all frames same direction.

## Future Character Space

2x2 equal-cell sprite sheet, four frames in reading order, true transparent background.

## References

- docs/storyboard/images/chapter-01-direct/01a.png: PinPin's quills, cream face and compact body identity only; remove all scenery.
- docs/storyboard/images/atlas/shire-v1.png: Map camera and miniature rendering style only, not background.

## Exact Tool Prompt

```text
Use case: illustration-story. Asset type: game animation sprite sheet on GENUINELY TRANSPARENT background. Create a1024x1024 PNG with alpha transparency, EXACTLY TWO COLUMNS and TWO ROWS of equal512x512 cells. Four frames total read top-left, top-right, bottom-left, bottom-right. Each cell contains ONE Mr.PinPin, the little natural hedgehog fromreference1, rendered for the bird-eye woodland atlas inreference2. Camera is a fixed high three-quarter view looking down about55degrees, seeing his brown rounded quill-covered back and cream pointed face. In ALL FOUR frames he faces and walks to the RIGHT, slightly toward the upper-right, body low and horizontal, normal compact four-legged hedgehog gait. Four short paws attached to the appropriate front and hind corners; only anatomically visible paws need show. Same appealing bright eye, tiny dark nose, small rounded ears, finely detailed brown quills and soft cream muzzle in allframes. No clothes, no boots, no head ornament. Preserve same size, location within everycell, camera, bodyshape, face and lighting; each hedgehogfitsinside300x300pixels centered inits512x512cell, leaving100pixels of clear transparent padding around. Feet land on the same baseline in eachcell. Frame1:nearfrontpawforward/nearhindpawback;Frame2:paws passing beneath the body;Frame3:nearfrontpawback/nearhindpawforward;Frame4:opposite passing phase. Gentle natural four-beatwalk, minimal body bob, no human arm gestures. Four distinct successive gaitposes, not differentcharacters or viewpoints. Soft neutral daylight consistent withmap. GENUINE ALPHA TRANSPARENCY everywhere exceptthecharacter, no white or colored backdrop, no drawn checkerboard, no groundplane, no separate castshadow, no borders, no cell lines, no labels, no lettering. This will be sliced into four animation frames and played small on the map.
```

## Visual Review

Four distinct right-facing high three-quarter gait poses. Actual PNG1254x1254 with genuine alpha: each627x627 cell is76-77% fully transparent. Measured body crops and foot anchors in atlas-geometry.js align playback without modifying the PNG. Saturated red/yellow fringe is confined to alpha1-2/255 (below0.8% opacity), with none above alpha2; inspect final size rather than assuming enlarged preview artifacts are opaque. Single camera-angle prototype: horizontal mirroring is not a new view. Anatomy and body shape vary slightly by gait frame; awaiting user review of the animated result.

Reviewed (UTC): 2026-09-20T15:26:32.886Z
