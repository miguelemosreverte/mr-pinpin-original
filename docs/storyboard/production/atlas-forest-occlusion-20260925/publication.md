# Selective Atlas Publication

Status: **v3 deployed successfully; final public browser smoke PASS.**
All conditional cutover checks passed: home/default/hash browser checks,
preservation proof, full anonymous upload verification, independent matching
materialization and unchanged old selector. V2 was never selected.
User approved publication of reviewed
freeze `2012b39c412397a0475f0dba7f227b382804e7c0a1493485ddd7999da0c73f99`.
Main reviewed scope and authorized this conditional cutover. Frozen57791
stays running. Mission CLI remains unavailable; bounded built-in lane exception.

## V3 Candidate

Mini URL: `http://127.0.0.1:57793/storyboard/atlas-webgpu.html`.
`artifact-v3/`, `composed-v3/`, `plan-v3/`, and `package-v3/` are immutable
replacement outputs under the same TB4 release root below. V2 stays untouched.
The only v2-to-v3 artifact change is `atlas-motion.js`, +210 bytes, SHA256
`2f1e75d4e2bc1af70a9deb8ff72cddd95870702b9a3586eb71e52774b41cac9d`.
It emits arrival on steering-goal completion, not each short internal journey;
held failures do not dispatch arrival. No animation, asset or threshold change.
Maxwell reports 28/28 focused tests; Parfit owns actual home-navigation acceptance.

- 751 files, 846171303 bytes; 99 overlays and 652 baseline files unchanged.
- Source follow-up: `2b61f81fd0f10ea80bf9d082dd47037cedebe437`, pushed on
  `publish/atlas-forest-20260925`, parent `89b3a9e440e27012e14105bcedd852114cf5b797`.
  Source main and shared HEAD/index are unchanged; concurrent main work is not
  overwritten. Integration of this delivery branch is separate from publication.
- Plan: `feeb3bc2726a6b627768eb0788213683fa16f6fe5d0f47465752440b3032c420`.
- Composition: `28ac47964dc94377a6a1762b6c1ef24205086c0aa8c6efcfcc72a0121908ddf0`.
- Release: `edcc16b44cbb5e350719a3b04b826a446bd09d56da96b1491722fcc38e596b39`.
- Archive: `71e64c666b7be518ee7c24940c80f183361c80521836c377d46f3baa22fdec91`,
  833429433 bytes. `upload-receipt-v3.json` confirms full anonymous readback.

Parfit's v3 browser acceptance passes all six checks: actual home pointer travel
opens the home menu in 3.800 seconds; default desktop/mobile pointer travel,
reader return, reviewed hashes and requests pass, with no page/asset errors or
recorder requests. See [verification evidence](publication-verification.md).
`materialization-receipt-v3.json` records independent extraction with the generated
deployment materializer from the local immutable archive, then byte comparison
against the built artifact: all 751 files / 846171303 bytes match. Anonymous
remote archive verification is a separate upload check, not claimed by this
offline materialization receipt.

The v3 package manifest independently matches all 99 overlay hashes and all
652 unchanged baseline hashes. No paths removed. Media are unchanged from the
84/84 remote-verified preservation receipt. Immediately before selection, the
official checkout was clean and remote main matched the original ledger commit.

## Cutover

Used existing `publish.py stage` and `select --expected-current 8173be...`;
only `release.json` and the new immutable release manifest were staged. Ordinary
commit/push, no force operations or source-main changes.

- Pages commit: `0faec11166941d95063f1585aa61e16f77cf7ae3`.
- [Deployment run 36104423722](https://github.com/mr-pinpin/mr-pinpin.github.io/actions/runs/36104423722)
  succeeded in 1m34s, including independent anonymous release download/hash
  verification on GitHub's runner. Final public browser smoke passed.
- Published URL: <https://mr-pinpin.github.io/storyboard/atlas-webgpu.html>.
- `public-hashes-v3.json` records direct public HTTP equality for motion,
  production config, shader, instance-v2, ground-v2 and the public walk manifest
  at 2026-09-25 06:49 UTC. These byte checks complement, not replace, browser smoke.
- Prior release retained: `8173be499897de44cc916b1ad89d1a250bb2e40ff2497094acd6abce12940a3d`.
  Rollback uses normal guarded selection/commit/push against current `edcc16...`.
- Source delivery branch: `publish/atlas-forest-20260925`; do not overwrite or
  confuse it with concurrently advanced source main.

Parfit's [live receipt](publication-verification.md#live-publication-receipt)
confirms default desktop/mobile movement, static dependencies and exact hashes,
safe reader return, library/readers, and actual doorway navigation to the home
menu in 4.805 seconds including navigation/image wait. Zero HTTP asset errors.
An initial telemetry context-destruction exception and an image still downloading
are retained in the first failing probe record; targeted follow-up resolved both.
This does not claim exhaustive deferred-image/PDF checks or fixes for the five
pre-existing broad video-test expectations. Reviewed canopy coverage limitations
remain documented in [the architecture index](README.md).

Publication and verification Markdown are preserved in a documentation-only
follow-up on the delivery branch. That follow-up does not change the selected
package's source identity `2b61f81fd0f10ea80bf9d082dd47037cedebe437` or its bytes.

## Reproduction

The deployment-only official repository contains the selected immutable manifest
and the same stdlib materializer used by CI. On mini/TB4, from that repository:

```sh
python3 scripts/materialize.py --repo . --out /Volumes/TB4/mac-mini-storage/shared/atlas-release-reproduction
```

The output must be a new directory. It downloads anonymously, checks the archive
and every declared file, rejects unexpected members, and reproduces the selected
751-file site without building unrelated authoring work. Selective construction
is recorded by the source branch's `tools/publishing/atlas-release-20260925.json`,
review-freeze manifest, `atlas_overlay_plan.py`, and `compose_atlas.py`, with exact
activation snapshots retained in TB4 `plan-v3/activation/`. Media restoration
identities are in `assets/atlas-reviewed-20260925.json`; media binaries remain
public HF objects, not new Git binaries.

Owned candidate servers 57792 and 57793 were stopped after local acceptance;
their SSH sessions are closed. No existing user-review server, including 57791,
was stopped or restarted. Build, upload, verification and deployment-watch jobs
have completed. Retained package/evidence directories are not temporary caches
to be deleted during closeout.

## Superseded V2

Mini static server: `http://127.0.0.1:57792/storyboard/atlas-webgpu.html`, no query
flags or special overlay. Root on TB4:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-atlas-publication-20260925/`.
`artifact-v2/` is the production builder output; `composed-v2/` records its source
composition; `plan-v2/` preserves the exact activation snapshot and overlay list.
Main approved the99-path scope, pending browser gate. Parfit owns
[publication verification](publication-verification.md).

Parfit verified default desktop/mobile movement, static dependencies, reader
returns, contextual cover and exact hashes. Home travel reaches the safe
projected doorway endpoint but fails to enter the home menu. Main explicitly
held cutover; runtime owner is fixing destination dispatch without retuning
animation. V2 remains immutable for comparison, not a publication candidate.

- 751 final files,846171093 bytes,103828907 bytes below the strict950000000 cap.
- 99 overlays:6 existing atlas files replaced,93 additions. All652 other baseline
files are byte-identical, including home/house, chapters, languages, notices and
library. No existing site files removed. The package manifest independently
records every built file hash.
- 76 unchanged sheets plus remapped manifest; eight new PNGs include five required
field/occlusion inputs and three legacy-field compatibility textures because the
explicit rollback branch remains in the published code. No sidecar-JSON runtime
exceptions: only `images/atlas/walk/manifest.json` was added to the builder's
bounded JSON allowlist, alongside existing focus data.
- Walk manifest derivation changes sheet URLs only in playback fields, and removes
six `generated.native` / `regenerated.native` authoring paths. Original frozen
manifest stays intact. Anchors, frames, sheet hashes and pacing remain unchanged.
- `gpu/tractor-ground.js` is not imported by the reviewed renderer/entry graph;
the old public copy remains unchanged. No recorder backend/data, user screenshots,
review JS/CSS, lab, probe, or unrelated authoring file added to the artifact.

| Identity | SHA256 / Commit |
| --- | --- |
| Source commit | `89b3a9e440e27012e14105bcedd852114cf5b797` |
| Plan JSON | `3d980f7fdfd9123cf2fe9b0f9339cf30728447846e670d0efc2a826694db734e` |
| Composition JSON | `16f5ca75cf3da4f15a6a7101210f699975ad7ea7b82f547e1f7e9cd8559216c2` |
| Public walk manifest | `9453afef9e848de580dc681a049d63987ccdc088309481a20cbaa0a3eba6d400` |
| Release manifest | `f328496230a8f9962d9993101f6a31e55d09681b56368c1d0400eac6e44067bc` |
| Archive | `838efda8c3ee696b792fa04414a61fd6d3b89b76d4138d05a9e72a92b1d6484d` |

Archive size833429195 bytes. Source commit is on pushed branch
`publish/atlas-forest-20260925`, parent `e996576a8043794133284cb4395cf5972dab6598`.
A separate external Git index preserved shared HEAD/index and unrelated edits.
Commit contains56 scoped source/recipe/test/provenance files; no new media binaries.
Policy/catalog/preservation additions were based on committed parent data, not
the dirty working catalogs. The current working versions were not overwritten.

Media preservation: `atlas-preservation-receipt.json` records84/84 verified and
remote_verified objects (38860605 bytes). A preliminary production-profile check
only verified local files, so it is NOT remote proof; the archive-profile receipt
supersedes it. `upload-receipt-v2.json` records successful full release upload and
anonymous verification for release `f328496230a8f9962d9993101f6a31e55d09681b56368c1d0400eac6e44067bc`.

Builder tests14/14; composition/publishing tests17/17 on mini. Initial isolated
publishing test failures were missing copied LICENSE/permissions fixtures; after
copying those unchanged inputs the complete suite passes. Maxwell's production
activation hashes match [his handoff](publication-runtime.md) exactly. His broad
video differential remains14 pass/5 pre-existing failures on both reviewed and
activated versions; no new failure or animation retuning is hidden by the counts.

## Initial Findings

- Read source/official AGENTS, PUBLISHING, assets/publishing guides, WORKSPACE,
  licensing and upstream notices. Preserve all book/media bytes and notices.
- Official local selector matches public main:
  `8173be499897de44cc916b1ad89d1a250bb2e40ff2497094acd6abce12940a3d`.
  Ledger commit `ef5292baa4c03b5c140acc8c94250c35ab0e6c1d`; main confirmed
  successful Pages run35803601258. Official checkout is clean.
- Baseline artifact:806992134 bytes; archive794648501 bytes, SHA256
  `6afbf7a85dd9905937c48662b1a9bfa9b7d6d685b2e2ca0ddecf2b5b79b7e8b5`;
  recorded source `023cb2e7c21101c0357764fa53c04a684de97c83`.
- Accepted freeze has175 files,48068582 bytes. It includes unrelated reader
  files as well as atlas data, so it is an identity authority, NOT a blanket
  release allowlist. Objects are stored by SHA256 under TB4 atlas-review-marks.
- The shared authoring worktree is extensively dirty with unrelated house/story
  work. No blanket staging/build/sync is appropriate. Source remote HEAD has
  also advanced beyond the freeze; do not confuse current Git with reviewed bytes.

## Proposed Scope

Start from a hash-verified materialization of the currently selected immutable
public artifact. Overlay only an explicit atlas dependency allowlist, sourcing
reviewed files from the freeze's content-addressed objects. Keep chapters, home,
house, original book, languages, covers, library, existing notices and all other
non-allowlisted files byte-identical. Verify that invariant across every file.

Include reviewed SDF/planner, hybrid GPU occlusion, animation controller and all
selected walk sheets/manifest. Preserve original media bytes and reviewed gait
parameters. The provisional public walk path is
`storyboard/images/atlas/walk/manifest.json` with versioned immutable package
provenance; remap sheet URLs as a documented packaging derivative, not regeneration.
Archive/package and cache operations run on mini/TB4 through existing immutable
publishing tools and public HF readback.

Maxwell owns minimal production activation and tests: ordinary atlas must run
the accepted walk/field implementation without sandbox query parameters or local
`/__sprite-trial` service, while retaining POIs and book/house navigation. Those
explicit activation deltas must be reviewed and hash-recorded separately from
the immutable freeze. This lane does not edit atlas runtime concurrently.
Archimedes audits required assets read-only, relayed via main.

Create a real selective source commit with source/recipe/manifest provenance;
preserve the shared index and unrelated working files. Build/check the composed
artifact with a production allowlist, package deterministically, upload without
overwriting prior objects, and independently materialize for comparison.

## Cutover Gate

Before selecting/pushing Pages, report exact overlay path list and hashes,
activation deviations, source commit, package manifest/archive identities,
total size, public upload receipt, unchanged-content proof, and browser results
on the ordinary atlas URL. Main reviews this proposed cutover. Only then select
the new release using `--expected-current` against the baseline selector, retain
the prior record as rollback, commit/push normally, wait for successful deployment
and verify the public atlas plus books/languages/navigation. No force operations.

All pre-cutover checks and final public browser verification passed. V2 was never
selected. Original review services remain running; owned test jobs are closed.
