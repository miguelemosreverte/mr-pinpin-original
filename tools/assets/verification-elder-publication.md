# Elder collection publication verification

Verified 2026-09-22 against deployed commit
`b40556f91ddec4eae68fe1548585fe382a5754b8`.

GitHub Pages deployment completed successfully:
https://github.com/miguelemosreverte/mr-pinpin-original/actions/runs/35689627192

## Public reader

https://miguelemosreverte.github.io/mr-pinpin-original/storyboard/?story=one-day-in-the-forest&lang=en

- Fetched and decoded all 181 unique published Elder WebP assets in Chrome,
  including all localized title images and miniatures: 86,128,220 bytes,
  zero HTTP or image decoding failures.
- Checked all six routes in English, Spanish, and Russian at 390 x 844:
  collection 166 scenes; individual chapters 16, 21, 23, 36, and 70 scenes.
  No JavaScript errors, broken completed images, or horizontal overflow.
- Inspected mobile and desktop screenshots of the collection navigation and
  cover. Inspected the final narrative image after scrolling to the end and
  allowing asynchronous image decoding to paint. It renders correctly.
- Native lazy loading remains enabled for images below the current viewport;
  the full collection is not downloaded eagerly by ordinary readers.

## Local and deployment checks

- Full Node test suite passed in the primary checkout, including its restored
  archive fixtures.
- `node scripts/verify-elder-edition.cjs` passed: six editions, three languages,
  schema rejection cases, old story/cover regressions, and 181 release assets.
- The production build contains 598 files, 502 managed production assets,
  and 755,844,681 bytes, below the enforced 950,000,000-byte budget.
- Deployment runs focused asset tests and builds the production-only artifact.
  Production images are served from Pages without Hugging Face credentials.

## Broken local preview diagnosis

The chapter-author release worktree had sparse-checkout rules excluding its
image folders. HTML could load while image requests returned 404. Disabling
sparse checkout restored the committed images. The integrated release is now
on main and deployed; the public asset decode audit above verifies it does not
depend on missing local files or browser-cached images.

See `elder-integration-review.md` for the merge review and
`elder-live-navigation-review.md` for the separate live library/atlas audit.
