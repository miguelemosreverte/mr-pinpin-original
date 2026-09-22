# The Shire: Navigation Review

Local review only. Preserve the existing full-color map, region masks and walkable routes.

## Interaction

- Leaflet owns pinch, zoom and pan over one image layer.
- Gestures never open a book. Stable unambiguous destination focus reveals one book icon.
- The icon opens a localized first-image preview; the image opens the story.
- Story-opening, not map exploration, records reading progress.
- White dashed routes have transparent gaps and no colored underlay.
- PinPin walks on the connected path network at 44 source pixels per second, twice the previous speed.

## Directional Assets

Three independent transparent 4-by-4 sprite sheets use the original walking sprite as identity reference. Rows request headings in 30-degree increments; columns contain four gait phases. Camera elevation remains fixed. Rendering picks a viewpoint rather than rotating the bitmap.

Exact prompts, timestamps, original tool outputs, checksums and image dimensions live beside each PNG in JSON and Markdown. Review actual headings, natural anatomy, alpha, clipping and anchor stability before use. Generated angles are intended directions, not measured 3D geometry.

## Verification

Check desktop and phone sizes, three languages, actual map pinch/pan, preview-only activation, story progress, paused/reduced motion, white route pixels and directional source selection. Keep this iteration local until Miguel reviews it.

### Completed Checks: 2026-09-20

- Nine Chrome/Playwright layout combinations passed: 1440, 390 and 320 CSS pixels, each in English, Spanish and Russian. Initial artwork fills the viewport; the explicit overview action can show the entire map.
- CDP touch pinch changed Leaflet zoom while browser page scale stayed at 1. One-finger pan and desktop wheel zoom did not open a story or change reading progress.
- One focused book opens the localized first-image preview. Only activating its image records progress and opens the reader. Timber retains all 30 scenes. Elder unlocks after Lake is opened; unpublished Home does not fall back to another chapter.
- A high-zoom lake-edge regression verifies the book stays visible even when the region's usual anchor is offscreen.
- All 11 motion tests passed, including 44 source pixels/second, continuous route-constrained retargeting, pause/reduced motion, direction selection and actual PNG rendering. A 400-pixel trail sample contained 225 white pixels, 175 fully transparent pixels and zero colored pixels.
- Directional asset audit passed for three 1254-by-1254 RGBA sheets, 12 approximate headings and 48 distinct frames. Sheet B uses a measured gutter at y=896 instead of the nominal y=940 boundary, preserving every head without editing the source PNG.
- The requested 210-degree row is visually closer to 220-225 degrees. It is distinguishable from the next rear-left row, but equal physical 30-degree spacing is not claimed.
- Animated pose review passed at 1040, 390 and 320 pixels, including all enlarged frames, pause, stepping, reduced motion and overflow checks.
- Physical iOS/Safari devices have not been tested. No extra map-detail levels were generated; high zoom magnifies the existing artwork.

Commands: `node docs/storyboard/verify-atlas.cjs`, `ATLAS_BROWSER_URL=http://127.0.0.1:8767/storyboard/atlas.html node --test scripts/atlas-motion.test.cjs`, and `node scripts/verify-atlas-directions.cjs`, with `PLAYWRIGHT_MODULE` pointing to the installed Playwright module. Focused UI suites also ran with `ATLAS_TEST_SUITE=motion` and `ATLAS_TEST_SUITE=gestures` after their final additions.

## Generation Timing

The three recorded generation windows total 159.193 seconds. Their start timestamps precede each image-tool handoff, so they include a short orchestration interval as well as tool waiting. They are not model-compute time, billing measurements, or total implementation time. All assets used built-in imagegen; exact prompts and original output paths remain in the adjacent records.

Review pages: `../review/shire-navigation.html` (generation journal) and `../review/atlas-directions.html` (animated poses).
