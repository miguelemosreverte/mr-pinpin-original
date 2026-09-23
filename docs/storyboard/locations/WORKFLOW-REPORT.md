# Reusable location workflow — implementation evidence

The canonical pack is [pinpin-house/location.json](pinpin-house/location.json). It pins the finalized three-room plan, copied byte-for-byte with SHA-256 `cab510b31c13e85beaa689edb54005223412a988f640724e56b9d95dba20c28c`, and the portable builder in `tools/locations/builder/`. It does not require any historical `.blend` file or session-only source image.

## Delivered contract

- `tools/locations/cli.py` owns build, camera render, whole-cubemap render, prepared imagegen handoff, imported result recording and checksum validation. The modeling lane owns this code and its executable tests.
- `pinpin-house/scene/` contains the unchanged selected plan and its underlay. `location.json` pins the portable builder, plan and underlay; all paths are repository-relative.
- `pinpin-house/cameras.json` and nine `examples/*.json` jobs cover common room, bathroom, bedroom, the shared circulation view with private doors open, front exterior, and three fixed-origin cubemaps.
- `pinpin-house/references.json` pins six inputs: four actual approved book stills, the legacy single-room cubemap, and the current plan diagram. Each image has explicit permitted roles. The legacy cubemap is a style example with different geometry and is excluded from ordinary preparation.
- `pinpin-house/prompts/{still,cubemap}.txt` provide stable parameterized headers. The cubemap prompt requests one 3×2 atlas in one image call, with the exact face order and rotations recorded in `cube-layout.json`.
- `AGENTS.md`, `README.md`, `pinpin-house/README.md`, `index.json` and `location.schema.json` give discovery, executable examples, schema and review rules for another agent without conversational context.

## Checks completed by this documentation/pack lane

Executed `tools/locations/contracts.py` against the actual pack: all five pinned config/input identities loaded, all eight camera jobs passed the runtime contract, all six reference files existed with matching byte counts and SHA-256, and the canonical plan was byte-identical to the selected bathroom plan. Twelve cube edge mappings were calculated from the same face bases as the CLI and checked for complete pair coverage.

The pin set is:

- Plan: `cab510b31c13e85beaa689edb54005223412a988f640724e56b9d95dba20c28c`.
- Portable builder: `34946231d4922c0454064b3c5961dd6ce448bdf2ef5ec9c6326bb41af38f8d1b`.
- Geometry helper: `f80c11e855deec10e7ce07d4114fd2a410af50d9e85713b43efc606fc4619912`.

These checks establish input identity and valid camera jobs, not visual quality. The actual reusable-CLI render/prepare/import evidence and clean-root replay are recorded below; previous bathroom mesh/pose checks remain historical support, not substituted for these new runs.

## Minimal operation

From repository root:

```sh
python3 tools/assets/hf_store.py pull --manifest assets/locations.json --root . --profile all --cache /Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache
python3 tools/locations/cli.py render --job docs/storyboard/locations/pinpin-house/examples/common-room.json --out /Volumes/TB4/mac-mini-storage/shared/pinpin-location-jobs/common-still --host mini
python3 tools/locations/cli.py prepare --job docs/storyboard/locations/pinpin-house/examples/common-room.json --from-manifest /Volumes/TB4/mac-mini-storage/shared/pinpin-location-jobs/common-still/render-manifest.json --out /Volumes/TB4/mac-mini-storage/shared/pinpin-location-jobs/common-still/prepared
```

Then inspect the prepared images, call the built-in image tool with the prepared prompt and input paths, and import the returned master using an explicit tool generation record. Full import and cubemap examples are in the pack README. The CLI does not call an image-generation API. Import status remains `proposal-needs-visual-review` until the actual image is inspected; it does not approve or publish the art.

## Actual pipeline and clean-root replay

The modeling lane produced a real common-room Blender render using the portable builder and saved job. Its camera check passes and its 1400×1000 still has SHA-256 `88b75878ba78d8227c4ec062088d86171ee1ef837b68009022a94d019d3b6038`. Root then used the final prepared prompt in the built-in image tool, imported the returned original through the CLI, and validated the generated manifest. The complete example is retained at `pinpin-house/examples/illustration-demo/{prepared,result,generation-record.json}`.

The first imported image (`095a49319153e88c6a2eb9acbfad2776974c1923c541cd16bc36968df68408b4`) invented a visible right-edge counter absent from the gray camera view. It remains retained as a rejected/superseded workflow attempt. Root then saved `illustration-demo/visibility-revision.json`, reran prepare with the same frozen shared template and current geometry, invoked the built-in image tool, imported the new original and validated it. The selected workflow illustration is `illustration-demo/revision-result/generated-original.png`, SHA-256 `a5244c491621249ad21ef39c3bfa9f8c42c660c0d961b9bdb1f513e6b8ecb5d9`. The unwanted counter is removed. `revision-review.json` marks it `selected-workflow-example`, with `approvedForChapter:false`; the original import record remains an unapproved candidate, as intended. These two runs demonstrate the actual render→prepare→built-in-tool→import/check→feedback revision chain. They do not certify exact AI geometry or authorize chapter publication.

A fresh-root replay was performed at `/Volumes/TB4/mac-mini-storage/shared/pinpin-location-portability-20260923/fresh-root`:

1. Copied only new workflow code/configuration/docs, existing asset adapter, scoped asset manifest and license notices. No media, historical production pack or saved `.blend` was copied into that root.
2. Ran the documented scoped `hf_store.py pull` command on the mini. All six input media objects materialized from the verified local content-addressed cache and passed SHA-256 checks. This replay is a restoration check; root owns the separate fresh remote-verification receipt.
3. Checked all nine jobs and six reference identities from the relocated root.
4. Copied the actual common still and its untouched render manifest to a separate evidence folder. `validate` passed against the relocated source root.
5. Ran `prepare` from the relocated source and validated its three recorded artifacts. Every prepared image path points inside this fresh workroot. No original checkout, dated production pack or session-only image path is required to operate the prepared job.

[portability-check.json](portability-check.json) records the exact staged runtime hashes, prepared input paths and validation results. Full restore evidence remains at the external workroot’s `restore-receipt.json`; the real relocated render is under `relocated-render/`, and the fresh prepared job under `fresh-prepared/`. A second Blender render was unnecessary because the original actual render and every pinned runtime input were verified unchanged. Absolute paths retained inside historical generation provenance identify where that run happened; new runs regenerate their own paths through `prepare`.

The central-room cubemap job opens both private doors to75°, with front door0°, as requested; its closed-door still baseline remains unchanged. The paired hall jobs use an identical camera with private doors open or closed. All three room cubemaps are now rendered and selected as gray geometry evidence. Each has six true 90° views at its own one fixed origin, and every atlas tile matches the corresponding source PNG pixels exactly. The two hall stills use an identical camera; all examples share the same base-scene SHA `b1f0108066e974dadbc07a36dcadf50a30d91ee9650bbd5ca0eb838b27176e03`, with the recorded door-state overrides. See `pinpin-house/examples/render-evidence.json` and the browser review.

The workshop’s reused viewer modules (`home-unified-gl.js`, `home-panorama-controls.js`, `home-panorama-math.js`) are already tracked and unchanged. One optional link to untracked `bathroom-proposal.html` was identified and removed by the UI owner; that historical report is not a build dependency.

## Packaged review media

The six lightweight lossless WebPs are in `pinpin-house/examples/{common-still,door-open,door-closed,bath-cubemap,bedroom-cubemap,common-cubemap}/`. Stills are1400×1000; atlases3072×2048. Each directory has a `review-manifest.json` recording its actual local relative WebP path, bytes, hash, camera, door states, original PNG identity and lossless decoded-RGB verification. All six local artifacts and their current input hashes were checked after copying.

The untouched original CLI execution manifests are retained as `source-render-manifest.json` or `source-cubemap-manifest.json`. Their original PNG masters/faces remain in the external `pinpin-location-workflow-20260923` workroot; these historical manifests are not claimed to pass CLI validation inside a WebP-only review folder. Run a saved job to create a complete new CLI output directory with its real PNG artifacts. The derivative manifests make that boundary explicit instead of disguising converted WebPs as original renderer output.

## Preservation and limits

The root operator maintains `assets/locations.json` and its verified remote receipt. Its entries use the archive transfer role for restoration even when the same path is production in the global catalog; this scoped manifest does not change global asset roles. No copy of a `.blend` master is required to build the scene from this pack.

The ceiling slab, ground, three exterior tree markers, fill lights and camera presets are deliberate scene additions. They are not claimed as exact old-book canon. Geometry outside the image-derived plan must remain identified as an authored choice. Current internal door widths do not prove full adult walking-route clearance. Generated stills/cubemaps can drift from geometry and require visual review.

No Git commit, deployment, global catalog or approved chapter-image modification was performed by this lane. Review UI and generated illustration demo belong to the other assigned lanes.
