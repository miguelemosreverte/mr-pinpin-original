# White-background comparison review

Status: COMPLETE, 2026-09-23. Presentation verified; gait is not certified.

Opened report, retained unchanged:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923/review-v1/index.html`.

## Exact inputs and findings

The page has two sections: input/native-output comparison, then exact inputs and
provenance. The white image edit received only the prior book-only RGBA image.
The two original book illustrations are labeled as earlier identity lineage,
not direct inputs to the edit. Previous video uses RGBA; new video uses the
opaque edit, each supplied as identical first/end images in its provider record.
Submitted source hashes and native-video hashes match the copied artifacts.
The image-edit prompt and both video prompts appear verbatim in the body, with
actual settings, endpoint, cost estimates, recorded timestamps, and input hashes.

Hash-bound opacity records show the previous 1672x941 RGBA input had 1,063,906
fully transparent pixels, 509,439 partially transparent pixels, and seven opaque
pixels. The new 1672x941 RGB24 image has 1,573,352 opaque pixels, no transparent
pixels, and outer 16px border RGB values 253-255. This is near-white, not uniformly
pure white. The UI summarizes these facts and links the original audits.

The main operator's 25-frame contact-sheet review found the white background
retained and the earlier neon red/yellow streaks not visible. Four short limbs
move, but the head turns toward the camera and back and the character blinks:
locked heading, four-paw gait, and seamless closure remain uncertified. The
review screenshots independently show the new white-background output. The AI
edit can change fine details and generation is stochastic; this does not prove
that input alpha was the sole cause of the previous artifacts.

## Verification

`node --test scripts/build-white-background-review.test.cjs`: **5 passed**.
Tests cover exact prompt extraction, pending states, source/video hash checks,
opacity-record hash/count consistency, no overwrite, unsafe paths/symlinks,
escaped HTML, and exclusion of remote transport URLs from the report.

Chrome/Playwright passed at **1440x1000 and 390x844**. Both native 1280x720,
1.041667-second videos played and visibly wrapped through a loop. Controls,
muted playback, and no autoplay were confirmed; offscreen playback pauses.
All four images decoded, image-edit/video prompts matched records exactly,
and there were no JavaScript errors, failed requests, or horizontal overflow.
Desktop and mobile screenshots were inspected for visible media and readable
text. The page has no animation-frame loop and no production UI integration.

Evidence:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-white-review-infrastructure-20260923/browser-v1/`
contains `results.json`, `previous-{1440,390}.png`, and `current-{1440,390}.png`.
The external `verify-browser.cjs` beside that directory preserves the checks.

## Rebuild and scope

Source handoff: `scripts/build-white-background-review.cjs`, its `.test.cjs`,
and `scripts/white-background-review-manifest.example.json`. The example matches
the actual trial-relative manifest; `previous-inputs/` contains byte-identical
copies of the earlier input, native clip, provider record, and book references.
No old report or old experiment asset was modified.

From source, with restored artifacts and the example placed as a trial-root
`review-manifest-v1.json`, choose a NEW external output directory:

```sh
node scripts/build-white-background-review.cjs \
  --trial /Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923 \
  --manifest review-manifest-v1.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923/NEW-review
```

The actual trial already contains `review-manifest-v1.json`. Heavy copies and
outputs stayed on the SSD; no image/video generation, paid call, archival upload,
runtime modification, unrelated house/asset edit, or commit occurred in this lane.
All required build/test/browser processes finished successfully. No version
change was made to the opened review after verification.
