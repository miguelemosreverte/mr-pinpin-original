# Publication Verification

Status: **LIVE PASS after deployment 36104423722.** Public default desktop/mobile
movement, actual home entry, reader return and eight served hashes verified.
Artifact-v2 failure and initial live probe limitations retained below. No
deployment authorization or source edits originate from this verification lane.

## Default Runtime Promotion

Public home `https://mr-pinpin.github.io/` serves the illustrated room and links
its door to `storyboard/atlas-webgpu.html?lang=ru`, without trial flags. The live
atlas entry module is the older production runtime (no video/field imports).
Reviewed workspace runtime still imports video only with `spriteTrial=1`, and
field only with both `spriteTrial=1` and `sandbox=1`. Motion defaults to original
sprites and disables the field outside sandbox. Its video manifest is currently
`/__sprite-trial/manifest.json`, a local endpoint that needs a static public
equivalent. Therefore copying reviewed shader/masks alone does not promote the
reviewed character/navigation behavior to the default public URL.

Release owner must resolve default video/field activation and public manifest
asset URLs without suppressing normal story/house entry (sandbox intentionally
suppresses destination entry). Do not publish trial flags as the sole working
route. Public recorder capture must remain inactive without a local collector.

## Acceptance Target

Reviewed frozen 57791 version:
`2012b39c412397a0475f0dba7f227b382804e7c0a1493485ddd7999da0c73f99`.

Exact deployed shader SHA256:
`d908a784d5898031434e68a8aa5ae9591b513b4c04813f5d3f7e94e8fbc7873c`.
Exact instance-v2 PNG SHA256:
`6d4723e1b843c3f1f9694ec6cff8c68b08591e878fd8ca33f93d54d9afe0acc9`.
Ground-v2 SHA256:
`c3e1a45275537805494a6cb0b961769052d8e13c0c7c34dcd979a85c4d1f12eb`.

Focused release checks: default atlas actual WebGPU/video/semantic readiness,
pointer navigation progress, correct served hashes and actual asset requests;
desktop/mobile nonblank character evidence; home/reader/library availability,
chapter imagery and reader return links; errors and failed requests. No broad
navigation replay, user-tab control, source interception, or new UI. Existing
mini browser helper keeps owned profiles/cache/artifacts on TB4 and closes them.
Mission CLI remains unavailable; bounded verification exception per handoff.

## Public Baseline, 2026-09-25 06:21 UTC

Evidence on mini/TB4:
`atlas-forest-occlusion-20260925/publication-baseline-2026-09-25T06-21-12-664Z/`.
`result.json` contains routes, asset requests, transfer counts, image readiness,
links and errors; `atlas-corrected.json` contains the older atlas API probe.

All seven routes return HTTP 200: home; default atlas desktop/mobile; reader
chapter 1 English, chapter 2 Russian and standalone timber-tractor English;
English library. Zero page errors or failed asset requests on these routes.
Home and reader chapter 1 images manually reviewed. No horizontal overflow on
home/library/readers, and no broken eager images; deferred chapter images were
not forced to download. Reader map links preserve language and target the plain
atlas URL. Library exposes nine cover images. No PDF downloads were requested.

Desktop 1440x900 and mobile 390x844 default atlas both use WebGPU, renderer error
null, paused=false, 87 resource entries each. Saved normal screenshots are
`atlas-corrected-1440.jpg` and `atlas-corrected-390.jpg`. Both were visually
reviewed as nonblank map renders, not proof that the new video character exists.
The baseline uses the older motion API and original character system.

Initial atlas readiness waited for nonexistent `motion.getState()` and timed
out at 30 s on both widths. These failed harness records are retained; corrected
probe waits for actual renderer backend and records available motion keys.
This is a test/API mismatch, not a baseline rendering failure.

Baseline shader SHA256
`1b4457c63d7e3a1747737a6ebc8b7042aa4313c4d684f833f44dadd9f4302bcf`.
Instance-v2 URL is 404, and `https://mr-pinpin.github.io/__sprite-trial/manifest.json`
is 404. Those are explicit new-release probes, not failures of baseline asset
requests. Home transferred about 3.02 MB; inspected reader first views each
6.56-6.84 MB; library 8.73 MB (browser resource timing, cache-dependent).

Main assigned Maxwell minimal public defaults: video/SDF/regen activation,
static `images/atlas/walk/manifest.json`, explicit sandbox kept separate from
normal POI entry. Post-cutover verification will use the default public URL,
not substitute a passing `spriteTrial` URL. Release owner supplies handoff
before that check. Both baseline browser jobs finished and owned profiles were
cleaned; no tunnel, server change, or user-browser control was required.

## Candidate Gate Prepared

Read `publication-runtime.md`: runtime owner reports 31 focused tests passed,
one hardware-browser skip, plus two return/house tests passed. Five previously
reported broader video integration expectations remain failing (cache bound,
180-degree retarget, old route timeout, sharp final leg, missing-turn waiting).
These are not relabeled green and are not grounds for animation retuning here.

Candidate smoke will run on the built artifact's plain atlas URL with no
`spriteTrial`, `spriteSet`, `sandbox` or `gait` query overrides. No response
rewrites or pose-restoration hooks. Public `placeAt` is intentionally disabled.

1. Fresh desktop default: actual WebGPU/video ready, SDF/semantic textures ready,
   static manifest and sheet requests successful; record initial position and
   sprite clip/frame, camera, hashes and no recorder requests. Use a visible,
   clearance-valid nearby road target through actual pointer input. Observe
   position/clip progression until arrival or a bounded timeout; record requested
   goal, planner endpoint, endpoint distance, holds and stop reason separately.
2. Reader round trip: open available contextual book/preview, enter the reader,
   verify chapter art and language, click its map return. Verify safe recovered
   return position and no stale movement intent after readiness and a short hold.
3. Home goal: actual movement into the authored doorway goal must navigate to
   the home menu after projected endpoint arrival; an ordinary nearby legal
   road goal must not enter home. No fabricated arrival callback.
4. Mobile: plain URL, WebGPU/video/semantic readiness, visible character image
   and bounded pointer-motion evidence; inspect overflow/errors/asset requests.
5. Hash gate: reviewed shader/instance/ground exact equality; activation modules
   match release handoff hashes and unchanged video module. Explicit reviewed
   query mode is only a separate compatibility control, never the public pass.

Any timeout is reported with observed progress and endpoint state, not simply
called stuck. Baseline image/API differences and deferred reader images remain
explicit limits. Awaiting candidate URL before opening a new test browser.

## Artifact-v2, Mini 57792

Candidate evidence:
`publication-candidate-2026-09-25T06-34-12-014Z/` beneath the forest TB4 root.
Static artifact base `http://127.0.0.1:57792`, plain
`/storyboard/atlas-webgpu.html` on 1440x900 and 390x844. No query flags, response
interception, source hooks, forced storage or character placement. Camera-only
focus frames a clearance-checked nearby pointer target [360,750].

Both defaults load actual video (`loop000`, ready, no fallback), SDF-v4 and
semantic instance-v2/ground-v2, and actual static manifest/sheet URLs. All tested
source hashes match `publication-runtime.md` and reviewed renderer/shader/masks.
Static manifest SHA256
`9453afef9e848de580dc681a049d63987ccdc088309481a20cbaa0a3eba6d400`.
Zero page errors, failed asset requests or `/__review` requests on both views.

Real pointer travel ARRIVED: desktop 57.778 px observed travel in 3.595 s,
remaining 3.739 px; mobile 57.210 px in 3.605 s, remaining 3.203 px. Both report
planner `arrived`, unchanged requested endpoint [360,750], held=false and no
stop error. Nearby road arrival does not enter the house. Saved initial and
arrival screenshots preserve both runs. Both arrival images manually viewed:
actual character is visible against the road, not just a nonblank map.

Resource entries 108 each; transfer counts 24.92 MB desktop and 3.64 MB mobile
within the shared browser cache. This is not a cold-mobile download benchmark.
No PDF downloads or broad asset stress. Reader/home evidence follows in
`navigation.json`; no publication pass is inferred from these local results.

### Blocking Home Entry

Lake and home reader returns both load their actual chapter/art, click the map
return and park safely with zero observed drift over 1.5 s. Lake contextual
cover opens its preview, its Open action reaches chapter 1, and the second map
return succeeds. No errors or failed requests. Nearby pointer goal [360,750]
arrives and correctly does not enter the house.

Then actual pointer input requests authored doorway
[309.0002034505,712.0005086263]. Planner projects to [311,719], and the character
ends at [314.2352102831,721.0343258576], within 4 px of that endpoint. Diagnostic
reason is `projected-arrival`, arrived=true, held=false, clearance=7.533 px,
video idle. Nevertheless, after a 25.094 s observation the URL is still
`/storyboard/atlas-webgpu.html?lang=en&returnPlace=home`, not the home menu.
This is successful travel but failed destination entry, not collision/stuck.
Full trace: `navigation.json`, final image: `home-goal-final.jpg`.

Read-only suspected mechanism: `tick()` calls `steer(delta)` before capturing
`wasArrived`; if steering ends the journey, the subsequent arrival-edge check
may never emit the event consumed by `arrive()`. Runtime owner must confirm;
this lane makes no source changes and does not loosen the arrival threshold.
All test browsers are closed. No tunnel or user/server operation was needed.

## Artifact-v3, Mini 57793

Evidence: `publication-v3-2026-09-25T06-43-05-196Z/` under the same TB4 root.
Actual served motion hash matches the one-shot completion fix:
`2f1e75d4e2bc1af70a9deb8ff72cddd95870702b9a3586eb71e52774b41cac9d`.
Actual served video, shader, instance-v2 and ground-v2 hashes still match the
reviewed values exactly. Node crypto performed these passing hash assertions;
a redundant shell `shasum` probe failed from the mini Perl locale configuration,
not from a hash mismatch or HTTP asset failure.

Home reader loads, its real map link returns safely and remains parked during
a 1 s hold. Actual pointer travel to [360,750] arrives without entering home.
Actual pointer travel back to the authored doorway now navigates to
`http://127.0.0.1:57793/?lang=en` in 3.800 s. The home menu and door link render;
`home-entered.jpg` was manually reviewed. This clears the v2 release blocker
without changing the geometric/arrival criteria or synthesizing an event.

Desktop 1440x900 and mobile 390x844 both use production video/SDF/semantic
defaults without trial flags, and both pointer road checks ARRIVE. Mobile
`road-390.jpg` manually reviewed: actual character visible, nonblank map.
`result.json` retains sampled progress, planner endpoints, clip/frame state,
hashes and requests. Zero page errors, failed HTTP assets or recorder requests.
All six combined checks PASS. This is local built-artifact acceptance, not a
live deployment receipt. Both owned browser pages/context closed normally;
no tunnel, source changes or existing server/user-tab operations were needed.

Next gate remains post-deploy checks against the actual public host, including
the same actual doorway action and default video/movement readiness. No further
local matrix expansion is required by this verification result.

## Live Publication Receipt

GitHub run `36104423722` completed SUCCESS at 2026-09-25 06:48:26 UTC; API
head commit `0faec11166941d95063f1585aa61e16f77cf7ae3`. Main identifies selected
release `edcc16b44cbb5e350719a3b04b826a446bd09d56da96b1491722fcc38e596b39`.
Browser verification used `https://mr-pinpin.github.io`, not a local proxy.
Evidence: `publication-live-2026-09-25T06-49-53-447Z/` on TB4. Completed at
06:51:27 UTC. `result.json` preserves the first run; `followup.json` preserves
the bounded follow-up without rewriting the first run's false check flags.

All eight served hashes match the approved v3 artifact: motion, production
configuration, atlas entry, video module, shader, instance-v2, ground-v2 and
static walk manifest. Default public atlas loads real WebGPU/video/SDF/semantic
textures without trial flags. Actual static walk sheets are requested; no
fallback, recorder requests, page errors or failed HTTP assets were observed.

Desktop pointer road travel arrived in 2.007 s, remaining 3.911 px; mobile
390x844 arrived in 4.014 s, remaining 3.194 px. Both planner reasons `arrived`,
with actual goal [360,750]. Normal mobile `road-390.jpg` was manually reviewed:
character is visible, map nonblank. Camera-only focus was used for readable
input/screenshots; no character placement or source hooks. Public home-reader
map return stays safely parked during the hold. Library loads nine covers,
chapter 2 Russian loads its cover and first scene, and the timber-tractor
reader loads. No horizontal overflow on these checked reader/library routes.

First live home telemetry sampling encountered an execution-context-destroyed
exception during navigation, before capturing the final URL. The initial run
also sampled chapter 2 scene-01 while still downloading. Neither is hidden:
initial `result.json` remains `pass:false`. Targeted follow-up replaces neither
runtime nor thresholds: actual pointer outward to [360,750] stays on atlas;
actual pointer back to the authored doorway reaches the real home menu
`https://mr-pinpin.github.io/?lang=en` in 4.805 s including navigation/image wait.
Home room image decodes and door points back to the plain public atlas URL.
`home-entered-confirmed.jpg` manually reviewed. Chapter 2 eager images then
complete successfully (1024 px cover, 1536 px scene-01), zero HTTP errors.
These resolve the two initial probe limitations; combined live verdict PASS.

Live final images: `road-1440.jpg`, `road-390.jpg`,
`home-entered-confirmed.jpg`, `chapter2-decoded.jpg`, `library.jpg`, `tractor.jpg`.
Scope excludes forcing every deferred chapter image/PDF or rerunning the whole
navigation matrix. Existing broader integration expectation failures remain
documented in the runtime report; this receipt does not claim they were fixed.

All owned live browser jobs/context closed and scratch cleaned. No tunnels
were needed; user browser, local preview servers and deployment remained under
their respective owners. Only this report was edited by this verification lane.
