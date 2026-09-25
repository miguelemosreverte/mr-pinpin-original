# Frozen 57791 Publication Audit

2026-09-25, read-only dependency/preservation audit. Nash owns packaging and release. This lane changed only this report, not runtime, catalog, selector or deployment. User authorized publishing the accepted frozen review; production adaptation still needs a queryless artifact check.

## Blocking Findings

1. **Copying the texture fixes does not publish the accepted default experience.** Frozen `atlas-webgpu.js:22-29` imports video, field and turn gait only through review query flags. `atlas-motion.js:255,344,354,1064` requires `spriteTrial=1&spriteSet=video` and fetches `/__sprite-trial/manifest.json`. Accepted behavior also uses `gait=regen`, `sandbox=1`, default `walk=steer`, ground SDF v4, clearance3/softRange18 and stride pace0.3. Queryless runtime remains original sprites/roads and has no SDF field. Promote these accepted defaults explicitly; static asset copying alone is insufficient.

2. **Do not simply force all sandbox flags into production.** `atlas-webgpu.js:247` suppresses place entry for trial+sandbox. Sandbox also exposes review controls. Separate accepted movement defaults from recorder/debug behavior, preserve public story/library navigation, and document this minimal adaptation rather than claiming byte-identical frozen runtime. Confirm queryless movement, place entry, pause, language and return navigation before selection.

3. **Trial media is outside the production catalog.** Frozen trial paths comprise77 files: one216267-byte manifest and76 WebP sheets totaling34262708 bytes (combined34478975). Five required new field/occlusion PNGs add1648687 bytes. These are absent from `assets/manifest.json` and `tools/assets/production-preservation.json` at audit time. New versions require explicit production selection plus verified preservation; a local TB4 copy is not proof of remote preservation. Do not delete or untrack source evidence.

4. **The freeze is broader than a release allowlist and narrower than the complete site.** It freezes direct storyboard/GPU source files, selected core images and trial media, including unused labs/probes/history. Other dependencies resolve through ordinary docs or catalog-backed public restoration. Preserve the existing official site and overlay only the scoped accepted atlas dependency closure; neither copy the whole dirty checkout nor replace the whole site with175 frozen files.

## Authoritative Inputs

- Ready record: TB4 `shared/atlas-forest-occlusion-20260925/final-57791.json`, PID4707/port57791. Its URL omits gait/sandbox flags; accepted full URL is in this folder's README. Ready JSON alone is not the accepted settings contract.
- Frozen manifest: TB4 `shared/atlas-review-marks/versions/2012b39c412397a0475f0dba7f227b382804e7c0a1493485ddd7999da0c73f99.json`. Dirty=true; base Git commit `e996576a8043794133284cb4395cf5972dab6598`. The64-character freeze ID is a served-file snapshot identity, not a Git commit.
- All175 content-addressed `objects/<sha256>` verified on mini against frozen sizes/hashes; all76 clip sheet references verified against their manifest hashes/bytes. All98 non-trial frozen files matched current docs at audit time. Use frozen objects as authority if current files subsequently change.
- Sprite manifest SHA256 `32b4b9e31f1c0bbf121c2c5717b9ac0888f01c73c657fa28016eb41957f48f9e`. Preserve anchor `[119.5,114]`, referenceWidth109.5, frame rectangles, pace metadata and exact sheet bytes. Original source videos are not playback dependencies.
- Server process maps trial requests to temporary `scratchpad/trial-local/preview-regen-v01`; immutable frozen objects already preserve those exact served bytes on TB4. Other docs resolve through repository files or hash-verified `production-overlay` cache. Never publish this Node server or depend on its temporary paths.
- Official local selector at audit: `8173be499897de44cc916b1ad89d1a250bb2e40ff2497094acd6abce12940a3d`, source commit `023cb2e7c21101c0357764fa53c04a684de97c83`,658 files/806992134 bytes. This is the inspected official checkout selector, not an independent live-deployment verification. Existing release has no video-trial media or new five PNGs.

## Required Runtime Delta

| Dependency | Publication Requirement |
| --- | --- |
| Video manifest +76 WebP sheets | Move to explicit same-origin static production paths; rewrite only manifest sheet URLs and runtime manifest URL. Verify all sheet hashes unchanged. Keep original frozen manifest plus a documented old/new URL mapping and new manifest hash. Avoid `images/` JSON unless builder policy is deliberately adapted: current builder excludes JSON there except focus-field metadata. |
| atlas-webgpu.js / atlas-motion.js | Frozen behavior plus narrowly recorded production defaults/URLs and removal or gating of local review hooks. Not a whole working-tree snapshot. |
| atlas-video-sprite.js | Frozen `01382fc7d0a12b064d896919f164eeaad6bc6e47a15d1605c65a83c72f690d19`. |
| atlas-field.js / atlas-ground-planner.js | SDF loader, sweep/planning and spawn recovery dependencies; field dynamically imports planner. |
| sprite-turn-profile.mjs / sprite-turn-gait-regen.mjs | Accepted turn integration/regen gait. Preserve other gait modules only if retained public code still references them. |
| gpu/renderer.js / world.wgsl / object-occlusion.js | Matching B0 support-profile/B1 per-pixel canopy contract, not textures with an old shader. Renderer frozen SHA `dab7fe8bb8659543b7c7ecae703191466ec03361c63f3e3e874fec8c201f494f`. |
| gpu/tractor-ground.js | Frozen version differs from official; include in scoped renderer dependency review rather than silently using official older bytes. |
| Existing art/depth/border/normal binary and GPU imports | Retain current official matching files: shire-v1.webp, shire-depth-v1.webp, shire-floral-tile-v1.webp, shire-normal-v2.rgb.bin, surface/occlusion/lens/DOF modules and shaders, plus existing page dependencies. |

Five newly required PNGs and exact hashes:

| File | SHA256 |
| --- | --- |
| shire-field-v1.png | `db824559d60de6fabeebc3e4d69e7b8b93b65176886fc920a8232fef649a8b60` |
| shire-tone-v1.png | `ed2ace45b7661584143fcbe3a0edd3b3ddcacce953e6f3a5b0e6b444289ef99c` |
| shire-ground-sdf-v4.png | `88d37064cf43be7a03923905d64ee51051e10b8f1252a64d7fcd960e6a94ba02` |
| shire-object-instances-v2.png | `6d4723e1b843c3f1f9694ec6cff8c68b08591e878fd8ca33f93d54d9afe0acc9` |
| shire-object-ground-v2.png | `c3e1a45275537805494a6cb0b961769052d8e13c0c7c34dcd979a85c4d1f12eb` |

## Exclusions And Preservation

Do not ship `/__review`, `/__review/marks`, `/__marks`, local server/backend modules, user screenshots/marks/tails, snapshot stores, temporary filesystem paths, lab pages, `field_probe.json`, review recording JS/CSS or newly exposed debug/trial controls. Recorder is loopback-gated today, but that is not an artifact exclusion: `build-pages.cjs:16-21,45-65` copies eligible static JS/CSS from docs unless explicitly excluded. Remove/gate imports consistently rather than leaving missing dynamic imports. Audit `atlasGpuDebug`, Tab handling and trial selector UI at the packaging boundary. Existing public controls need not be removed merely because they share a debug module; do not broaden the UI change.

Keep provenance JSON, original masks, old object versions, compiler recipes/tests and rejected proposals preserved outside the runtime artifact. `shire-object-occlusion-v3.json`, SDF metadata and normal metadata are provenance, not fetched by this accepted runtime. Their external paths are not public URLs. Legacy walk/body textures are unnecessary to the accepted SDF path unless a public legacy switch remains supported; settle that branch deliberately rather than copying every historical core image.

Do not sweep in unrelated house authoring/registries or new room assets. Preserve official site files outside the scoped atlas delta by hash; this lane did not audit or approve house changes. The frozen snapshot itself does not certify nested house content.

Before release selection: verify full production dependency closure under a static server with no overlay; queryless video/SDF/B1 state; zero `/__sprite-trial` or `/__review` network dependency; all sheets readable; accepted forest/house/vehicle controls; public navigation; matching media hashes and release provenance recording both freeze identity and production adaptation. Package/upload/anonymous readback/select remain Nash/main responsibilities. No release approval or live deployment success is asserted here.

Mission Control CLI send was attempted and again failed at localhost:4780 (connection refused). Continued only this bounded built-in read-only audit under the prior recorded exception; no direct fleet internals, private conversations or fleet changes. No running jobs remain.
