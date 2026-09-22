# Repository rename verification

Scope: read-only local Git/worktree checks and the existing 33-check published
browser smoke test after the official URL returned HTTP 200. This lane owns
only this report. No code, historical reports, release manifests, repository
configuration, or Git metadata are modified by this lane.

Main lane reports the approved GitHub renames:
`miguelemosreverte/mr-pinpin-pages` to `miguelemosreverte/mr-pinpin-official`,
and the source repository to `miguelemosreverte/mr-pinpin-source`.
Canonical local source:
`/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-source`.

## Local worktrees

PASS at 2026-09-22 06:54:35 UTC. `git worktree list --porcelain` lists the
canonical main checkout and both linked worktrees without repair/prune warnings.
`git --no-optional-locks status --short --branch` and
`git rev-parse --show-toplevel --path-format=absolute --git-common-dir` exited 0
through all four access paths below. Optional index writes were disabled.

| Access path under `/Users/miguel_lemos/anastasia-pinpin-repos/` | Status observed |
| --- | --- |
| `mr-pinpin-source` | `main...origin/main`, clean before this report was created |
| `mr-pinpin-original` | Retained symlink to `mr-pinpin-source`; same canonical root and clean main status |
| `mr-pinpin-cover-standard` | `draft/book-workshop-backup-20260921`, clean |
| `mr-pinpin-elder-release` | `publish/elder-five-chapters-20260922`, tracking `origin/main` behind 3; existing modification to `scripts/verify-title-covers.cjs` preserved |

All four resolve their common Git directory to
`/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-source/.git`.
These checks establish that local Git commands remain functional after the move;
they do not fetch remote refs or alter worktree registration.

## Official-site smoke test

PASS: 33/33 checks, exit 0, 2026-09-22 06:57:23 to 06:58:18 UTC (55 seconds).
The official root returned HTTP 200 before starting the browser run. Main lane
reported official metadata commit `ae8c383` and the unchanged release identifier
prefix `636d...`; this lane did not independently verify release hashes or the
deployed commit. The existing script ran unchanged from the canonical source.

Run from `/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-source`:

```sh
node scripts/verify-published-site.cjs --base https://miguelemosreverte.github.io/mr-pinpin-official/ --out /Volumes/TB4/mac-mini-storage/shared/pinpin-repository-rename-official
```

Artifacts: `results.json` and 64 PNG screenshots in that external SSD directory.
Results path:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-repository-rename-official/results.json`.
Coverage: six Elder routes in en/es/ru on mobile 390x844;
legacy chapter 1/2, Timber Tractor, Home Sweet Home, library, actual WebGPU canvas
pixels/native pan, and Elder language/query return on mobile and desktop.
Reader checks verify scene counts, first/last image decode and paint, and
horizontal overflow. Unexpected runtime/network errors fail the run.

### Results

- All 18 mobile Elder route/language checks passed. Legacy readers, library,
  atlas, and Elder return flow passed at both 390x844 and 1440x1000.
- Zero page exceptions, unexpected console errors, unexpected HTTP >=400
  responses, or non-abort transport failures. Recorded expected noise: one
  origin-root favicon 404 console message and 230 `net::ERR_ABORTED` callbacks.
- Both atlas views used actual `webgpu` with 6,144 opaque sampled pixels each
  and 429 mobile / 502 desktop quantized colors. Canvas bounds were 390x783 and
  1440x939, starting at y=61. Native touch/mouse pan changed the camera and frames.
- Both viewports completed Lake unlock, Elder preview and collection opening,
  Spanish language switch, and actual map return restoring the Elder selection.
  Reader links stayed under `/mr-pinpin-official/storyboard/index.html` with
  `story=one-day-in-the-forest&lang=en&returnTo=atlas-webgpu.html&returnPlace=elder`.
  Return links stayed under `/mr-pinpin-official/storyboard/atlas-webgpu.html`
  with `lang=es&returnPlace=elder`.

### Screenshot inspection

Visually inspected these screenshots from the official run:

- `mobile-one-day-in-the-forest-es-first.png`: localized cover renders and fits.
- `mobile-one-day-in-the-forest-ru-last.png`: final art and Russian text render;
  reader controls do not overlap the narrative.
- `mobile-library.png` and `desktop-library.png`: artwork, labels, and controls
  render with no unexpected overlap or horizontal overflow.
- `desktop-atlas.png`: full viewport artwork and character render.
- `mobile-elder-preview.png`: title, dismissal control, and artwork fit the
  374x610 modal; the measured desktop preview also fits at approximately 599x944.
- `mobile-elder-return.png`: Spanish atlas and Elder selection restore. The
  partially clipped cover at the right edge matches the previously inspected
  original/pages baselines; it is existing framing, not a rename regression.

No failed checks or blocking rename regressions found in this runtime scope.
No code changes were required. Only this report was modified; historical reports,
release manifests, metadata, and Git state were left untouched. No asset hash
sweep or full release download was performed by this audit.
