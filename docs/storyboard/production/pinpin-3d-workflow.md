# PinPin 3D Study Workflow

## Status

The neutral full-body reference is a **built-in imagegen-generated candidate**, not a user-approved reference. The actual [3D model](../models/pinpin-v1/model.glb) has been **received; review is underway, with no acceptance yet**. No production replacement, quadruped rig, separate eye geometry, or walking animation is claimed complete.

The received GLB is 9,015,168 bytes, SHA-256 `e6fe566a1b8daf0d7f4a8a5a57d648c3c0df8376f567fa2a1a3c33917eb0960e`. Local inspection confirms one mesh named `geometry_0`, one primitive, zero skins, and zero animations. This is an unrigged static candidate, not a rig-ready asset.

[model.json](../models/pinpin-v1/model.json) records paid request `01a0c60d-9992-7b53-97ab-3cdda97d4690`: started 2026-09-21 22:19:29.667 UTC, submitted 22:19:35.139, completion observed at 22:22:59.106, and local finalization ended 22:23:46.391. The observation timestamp is not the provider's exact completion time. Its `complete` status describes generation/collection, not visual acceptance.

Execution handoff: the mini's initial upload failed on DNS before queue submission; that failed attempt was archived. The Air submitted the single paid request and verified the downloaded 9 MB artifact, then encountered an SMB hardlink failure. Mini collection safely finalized the existing local download without network access or another paid request. Preserve this recovery history alongside the raw artifact.

This note records the bounded workflow and existing configuration. Writing it makes no paid API call and changes no runtime behavior.

## Reference to Static Mesh

1. Preserve the built-in-generated neutral reference and its exact prompt/provenance. Inspect identity, full-body framing, visible limbs, neutral expression, and separation of feet from the body. Do not label the candidate approved without user review.
2. The recorded [pinpin-3d-v1.json](pinpin-3d-v1.json) configuration produced the bounded static reconstruction trial above. Do not submit it again as a setup step; any further execution and spend authorization belong to the generation lane, not this document.
3. Persist the request ID, source SHA-256, exact submitted parameters, timestamps, provider response, downloaded model/textures, and output hashes. An uncertain request outcome must be investigated before resubmission.
4. Inspect the actual downloaded GLB before deciding whether it can proceed to Blender. A completed request or attractive preview is not acceptance.

| Recorded setting | Value |
|---|---|
| Model | `fal-ai/trellis-2` |
| Resolution | `1536` |
| Texture size | `2048` |
| Decimation target | `200000` |
| Remesh | `true` |
| Seed | `210926` |
| Published estimate | USD 0.35 for one generation |

The price is the configuration's published estimate, recorded as checked on 2026-09-21 against the [Trellis 2 model page](https://fal.ai/models/fal-ai/trellis-2), **not a verified billed charge**. Reference-image generation cost is excluded. Settings are requests, not measured output properties; in particular, 200,000 is a target, not an observed triangle count.

Working study directory: `/Volumes/TB4/mac-mini-storage/shared/pinpin-3d-study-v1/`. The configuration points there; the received model, candidate reference, and provenance are also preserved under [models/pinpin-v1](../models/pinpin-v1/). File receipt and verified bytes do not establish review acceptance.

## Inspection Gate

- Check source identity and proportions from front, both sides, rear, and underside. Look for fused/missing/extra limbs, malformed muzzle, quill artifacts, and invented support surfaces.
- Render fixed textured, neutral clay, and topology views. Inspect geometry without relying on texture to conceal defects.
- Validate glTF, actual geometry counts, connected components, UVs, texture bindings, normals, scale, and orientation. Review real browser rendering and retain the evidence.
- Record a specific accept-for-next-stage or reject verdict. Static reconstruction acceptance does not establish animation readiness or correct gait.

## Caucasus Precedent

The relevant repository is [miguelemosreverte/caucasus-1942-visual-research](https://github.com/miguelemosreverte/caucasus-1942-visual-research), locally at `/Volumes/TB4/mac-mini-storage/shared/caucasus/caucasus-1942-visual-research`.

- [Checked-in report, line 5393](/Volumes/TB4/mac-mini-storage/shared/caucasus/caucasus-1942-visual-research/report/index.html:5393): prior Trellis 2 shrub study records 47,323 triangles, a 3.47 MB GLB, and zero validator errors, with textured/clay/topology views. [Line 5412](/Volumes/TB4/mac-mini-storage/shared/caucasus/caucasus-1942-visual-research/report/index.html:5412) promotes it as a static triangle candidate while explicitly withholding animation/collision/LOD readiness. These are historical report findings, not a fresh artifact audit or a PinPin result.
- [Audited runner, line 214](/Volumes/TB4/mac-mini-storage/shared/caucasus/caucasus-1942-visual-research/tools/igen-fal-run.mjs:214) establishes the spec, input lineage, request, hashed-download, and ledger workflow. The historical runner submits paid work and is not a dry-run command.
- [Character comparison, line 1768](/Volumes/TB4/mac-mini-storage/shared/caucasus/caucasus-1942-visual-research/report/index.html:1768) records Meshy humanoid rigging; it does not establish quadruped support. [Line 1961](/Volumes/TB4/mac-mini-storage/shared/caucasus/caucasus-1942-visual-research/report/index.html:1961) concerns older `trellis/multi`, not Trellis 2.

Some underlying portfolio specs/reviews are unhydrated LFS pointers, and `vendor/igen` was empty at discovery. Do not perform a blanket LFS pull or assume the historical runner is ready to execute unchanged. The [discovery handoff](/tmp/pinpin-3d-research.md) records exact paths and limitations.

## Future Blender Stage

**Not done:** prepare suitable deformation topology, a quadruped skeleton with independently inspectable four-leg motion, and separate eye geometry for gaze/blinks. Preserve quill/body identity and evaluate neutral pose, contact, lift, swing, return, foot sliding, and occlusion. Do not treat humanoid auto-rigging precedent or frame count as evidence of a correct quadruped walk.

Keep body gait, head motion, and eye/expression controls independent. Archive Blender sources, derived meshes, textures, rig settings, and rendered evidence separately from the untouched provider output.

## Credentials and Rollback

- Load `FAL_KEY` into process memory from the existing environment/dotenv mechanism; never place its value in specs, prompts, command arguments, screenshots, or reports. [Existing video loader](/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original/scripts/generate-atlas-video.cjs:75) supplies a pattern, not a GLB-compatible CLI.
- Keep the study isolated on the SSD. Retain versioned reference, raw provider output, manifest, and review together; preserve rejected candidates with the reason rather than overwriting them.
- Before any later integration, archive the exact current sprite assets/manifests and record the runtime selection needed to restore them. Do not replace the existing production path merely because generation completed.
- Rollback means selecting the prior sprite path and removing the experimental selection, while retaining the study archive and provenance. No integration or rollback operation has been performed by this documentation task.
