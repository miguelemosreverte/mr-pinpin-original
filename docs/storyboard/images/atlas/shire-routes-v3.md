# Interconnected walking routes

Status: rejected by Miguel on 2026-09-21. Retained as exploration history only.
The plan added outward spurs and incidental loops instead of clear alternative
roads between the existing story places. Future routes must terminate at a story
place or rejoin a useful through-route; map-edge exits require explicit approval.

- Generated: 2026-09-21, approximately 05:10-05:11 UTC.
- Tool: built-in imagegen, one edit of `shire-v1.png`.
- Output: `shire-routes-v3.png`, 1536x1024.
- SHA-256: `b17eca712b1e28203613260777f42a2dde54d31ec103d1df2a7bb2d1f2eb8716`.
- Original output: `/Users/miguel_lemos/.codex/generated_images/01a0a355-7d5b-7ab2-b71b-90cf4df7313d/exec-e7e1607f-310b-4f58-bab5-ab06184bc2dc.png`.

## Prompt

Use case: precise-object-edit. Asset type: atlas route-planning reference, not replacement scenery.
Edit the supplied map into an accurately registered walking-route planning plate. Preserve the exact framing, geometry, houses, lake, bridge, dock, trees and paths of the supplied map. Convert the map underneath to grayscale. Draw narrow solid colored route centerlines over walkable land, inspired by OpenStreetMap, with no labels, text, circles, arrows or extra scenery. Keep original landmarks clearly legible. The goal is a richly interconnected network of gentle walking paths, with junctions and loops rather than just one corridor.
Follow existing visible dirt paths wherever possible. Include: the cottage front door to the south lake shore; a garden detour from the cottage left side past the garden and back into the south-shore path; a south meadow loop below the cottage connecting back to its eastern main path; the south lake path to the existing wooden bridge, across its deck and north to the elder tree door; the east-shore fork onto the little wooden dock; an upper meadow loop along land north of the lake to the elder path; the bridge's east bank to the picnic and through the open clearing to the red tractor, returning by the visible dirt track east of the picnic; a short southern forest spur following the tractor road. Make lines meet precisely at junctions and remain on ground, not through building interiors, rocks, tree trunks or open lake/stream. The existing wooden bridge is the only river crossing; do not invent bridges. Draw loops around vegetation rather than through trees. Use clearly distinguishable flat route colors. The centerlines should be about 5 pixels wide at 1536x1024. Preserve original 3:2 framing and do not move anything.

## Review And Runtime Use

This is an imaginative planning reference, not an automatically trusted navigation mesh. It introduces useful meadow, garden, dock, northern meadow and tractor-clearing connections. It also violates parts of the prompt: circular junction markers were added, the yellow line crosses the cottage roof, some green lines cross tree roots, and blue strokes have gaps. Those details are not accepted as runtime geometry.

Runtime polylines are checked against the original colour map and adjusted onto plausible ground. The original three story routes and their return endpoints remain the baseline. Junctions use shared coordinates; water crossing remains on the existing wooden bridge. No artwork, approved video, depth pass or clickable story region is replaced. The planning bitmap is documentation only and is not fetched by the production map.
