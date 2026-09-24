# Reusable locations

For a user-requested image-led 360° experiment, follow
`../panorama-workflow/README.md` in a separate production pack. The measured
geometry rules below apply to this location system; they do not require a new
Blender render for that explicitly chosen image-led route. Do not change the
canonical location definition to match an inferred image-model viewpoint.

Start with [README.md](README.md), then the selected pack’s `location.json`, `references.json` and `README.md`. Use `tools/locations/cli.py`; its interface is documented in `tools/locations/README.md`. The first pack is `pinpin-house`.

- Geometry authority is the hash-pinned plan and builder. Render a new camera from that scene for every changed viewpoint, including translation. Do not imitate camera motion by reprojecting an old illustration onto geometry.
- Keep camera transforms, lens/FOV, door angles and lighting explicit in a saved job. Copy an example job and change its id/parameters; do not silently alter the location definition for one shot.
- The current house is three rooms. `hall-through-open-doors` is a camera from the common-room circulation area, not a fourth room. Closed leaves remain visible solids. Change door angles in Blender before rendering a different state.
- Read every reference’s role. Current geometry takes precedence over old book staging. The legacy common-room cubemap demonstrates style only; it is not this house’s current layout.
- Use `render` or `cubemap`, then `prepare`. Inspect the guide and supporting images. Use the available built-in image generation tool with the prepared prompt and inputs; read the current imagegen skill when applying it. One whole cubemap atlas is one image call, not six independent face generations. Do not invent a paid API fallback or shell automation for the built-in tool.
- Preserve original tool output, exact final prompt, input hashes, camera job and import record. Use a new version path, never overwrite an approved image. `import` records a candidate; checksum validation is not visual approval.
- Check openings, door hinges/states, object positions, body separation and eyelines in stills. Inspect all six directions and twelve edge joins in cubemaps. If an image drifts, fix the candidate or prompt; do not silently move the canonical house to match the error.
- Proposals for new permanent geometry belong in a new location version with before/after review. The simple ceiling and exterior trees are authored orientation aids, not recovered book canon.
- Keep heavy masters, `.blend` files and render jobs on the mini SSD. Restore known media through `assets/locations.json`; catalog/archive new assets through the repository workflow. Do not change catalog policy or publish without the corresponding assigned task.
- Follow repository content/software licensing boundaries. Prompts, illustrations and creative house configuration are not made MIT merely by using text or JSON.
