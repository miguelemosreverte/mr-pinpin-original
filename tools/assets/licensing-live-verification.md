# Licensing release live verification

Status: PASS, 33/33 standard smoke checks and 10/10 permissions checks, both exit 0.
Independently observed workflow `35705401859` complete successfully, then confirmed
`https://mr-pinpin.github.io/permissions/` returned HTTP 200 before testing.
These are fresh checks against the licensing release, not prior-release results.

Target: https://mr-pinpin.github.io/ .
Expected source: `02d81bc3c274e23f46c7519af6bcb0d4eee971ec`.
Official workflow head: `fb95a330d33e14655334371c1ebe10d5409701ec`.
Selected release supplied by main:
`9c1a4d8e7ed8fcd9dcbd297a248ffc94999369dd2f7801148884f26d12871dea`.
Workflow: https://github.com/mr-pinpin/mr-pinpin.github.io/actions/runs/35705401859 .
Source checkout: `/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-source`.
This lane owns only this report; no commits, code edits, Git metadata writes,
or changes to unrelated dirty worktree files.

## Runs

Executed from the source checkout after both deployment gates passed:

```sh
node scripts/verify-published-site.cjs --base https://mr-pinpin.github.io/ --out /Volumes/TB4/mac-mini-storage/shared/pinpin-licensing-live-02d81bc
```

The unchanged 33-case script checks reader routes, scene counts, first/last image
decoding and painting, library links, horizontal overflow, actual WebGPU canvas
pixels and native panning, Elder unlock/preview/reader navigation, and language
and query preservation on map return. Recorded artifacts: `results.json` and
64 PNG screenshots on the external SSD.

Additional permissions checks, also using installed Chrome through Playwright:

- Mobile 390x844 and desktop 1440x1000: enter through the library's permissions
  link, verify the heading and scope/content/third-party exclusions, inspect top
  and full-page screenshots for text fit and readability, check horizontal
  overflow, and follow the actual return-to-library link.
- Fetch each of the four linked full notices: HTTP 200, canonical origin/path,
  and byte-for-byte equality with the corresponding root file read using
  `git show 02d81bc3c274e23f46c7519af6bcb0d4eee971ec:<path>`.
  Working-tree versions are not the comparison baseline.
- Fetch all three linked vendor notices: HTTP 200 and byte equality with their
  source paths at the same commit. Verify actual link targets from the page.
- Record unexpected JS/console/HTTP/transport errors separately from the known
  origin-root favicon 404 and navigation aborts. Save supplemental JSON and PNGs
  alongside the standard audit artifacts.

## Committed baseline

Read-only preparation confirmed that all four committed copies in
`docs/permissions/` exactly match their committed root originals.

| Served notice | Bytes | SHA-256 of committed baseline |
| --- | --- | --- |
| `/permissions/LICENSE` | 2356 | `5a7339867248f47957e4b111737f4e0d81947e307071687f081154c5696ac5fb` |
| `/permissions/LICENSE-MIT` | 1069 | `fee9ccf25a42212092792a5265363c1f5d348704ce7fbf2deb83516269615b0d` |
| `/permissions/CONTENT-LICENSE.md` | 2501 | `f298e2dd978c88713965144a88ff42a034e9699fa8487f1e218aee1a0ce0f27e` |
| `/permissions/THIRD-PARTY-NOTICES.md` | 3506 | `f642c7f751ba705836c532ab701d6a9acefc7c4cf79b14061b6474ed798385dd` |
| `/storyboard/vendor/three/LICENSE` | 1081 | `bfe119ea4fd413f5f7ca3fcd63adb0c4a073ed39daa2fe7d3e6b769e21272601` |
| `/storyboard/vendor/leaflet/LICENSE` | 1395 | `53e8dc25862014e4324741ca18fbe3611e11d42ef69f59f86ea8c5389647d4cb` |
| `/storyboard/icons.LICENSE` | 880 | `1e7290b35280a048667bbf0ebabac1c7fd52a75300e8b2946ac165715997f2bc` |

## Live results

All artifacts are under
`/Volumes/TB4/mac-mini-storage/shared/pinpin-licensing-live-02d81bc/`.

| Run | UTC interval on 2026-09-22 | Result | Artifacts |
| --- | --- | --- | --- |
| Existing standard script | 08:35:22 to 08:36:17 (56 seconds) | 33/33, exit 0 | `results.json`, 64 PNGs |
| Permissions supplement | 08:37:13 to 08:37:22 (8 seconds) | 10/10, exit 0 | `permissions-results.json`, 6 PNGs |

- Standard readers, library, scene counts, endpoint image decode/paint, no
  horizontal overflow, WebGPU, native panning, and Elder language/query return
  all passed. Both atlas views used `webgpu`; each canvas sample had 6,144 opaque
  pixels, with 430 mobile / 502 desktop quantized colors. No extra 16-language
  rerun was performed, as requested.
- `/permissions/` served HTTP 200 and its complete HTML exactly matched
  `docs/permissions/index.html` at the expected source commit: 3,417 bytes,
  SHA-256 `a3f4fb575353fe5a37f21b427e15bd7f175b3e53e4f5ecea94432ae32e7f84b7`.
- All four full-notice links returned HTTP 200 with no URL change. Their served
  bytes exactly match the committed root originals, including all hashes in
  the baseline table above. All three retained vendor notices also returned
  HTTP 200 and exactly matched their committed source bytes. These were actual
  links extracted from the browser-rendered permissions page.
- At 390x844 and 1440x1000, the actual library footer link opened
  `/permissions/index.html`; the actual Chapter library link returned to
  `/storyboard/library.html`. Both pages loaded their expected content.
  Permissions text and links stayed within the viewport, with no horizontal
  overflow. The served qualifications include controlled rights, personal/family
  printing, creative-content exclusions, unresolved imported GPU exclusions,
  third-party terms, and AI/public-domain limitations.
- Both runs recorded zero unexpected JavaScript exceptions, console errors,
  HTTP >=400 responses, or non-abort transport failures. Standard-run expected
  noise: one origin-root favicon 404 console message and 230 aborted requests.
  Permissions-run expected noise: one such favicon message and 92 aborted
  requests from rapid library navigation. These remain recorded in JSON.

## Screenshot inspection

Visually inspected `mobile-permissions-full.png` and
`desktop-permissions-full.png`: headings, paragraphs, all notice links and the
footer are readable and flow without clipping or overlap. Also inspected
`mobile-permissions-library-entry.png` and
`desktop-permissions-library-entry.png`: the Permissions footer link is visible
and separated from Original book. The entry captures include still-lazy chapter
thumbnails; the permissions check does not claim those thumbnails decoded.
`desktop-atlas.png` shows rendered full-viewport artwork. Top-of-page permissions
captures and the remaining standard screenshots are retained alongside these.

No failing checks or blocking regression found in this runtime scope. No full
archive/502-media hash sweep was repeated; main's anonymous archive verification
is separate evidence. Only this report was edited, with no commits or changes
to code, release metadata, historical reports, or unrelated worktree changes.
