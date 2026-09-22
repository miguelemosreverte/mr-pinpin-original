# Floral Margins and Story Return

Local preview only. The reader retains Map and language as its only persistent controls; the atlas retains language and contextual story books.

## Camera Extent

The original map is 1536 x 1024 world units. Interpret the requested 1.5x limit as a centered 2304 x 1536 navigable rectangle: x=-384 to 1920, y=-256 to 1280. This adds 25% of the original width/height on each side. The viewport remains fixed; camera coordinates and scale change. All masks, paths, characters and depth still use the original map coordinates. Flowers are decoration, not additional navigable story terrain.

## Illustration Record

The built-in image tool produced one square crayon-floral texture using the existing Chapter 3 crayon study as a style reference only. The original output is preserved unchanged at `images/atlas/shire-floral-tile-v1.png`; adjacent JSON and Markdown record the exact prompt, input, timestamps, dimensions and checksum. Generation-call wall time was 32.810 seconds. No price is exposed by the tool.

The output has clear blue, red, pink and white flowers, curling green foliage, and textured pale paper, with no characters or lettering. The raw opposite edges differ. WebGPU therefore uses mirrored repetition, and Canvas2D uses a reflected 2x2 pattern from the same unmodified image. Each tile occupies 512 world units; the full mirrored period is 1024. Inspection found deliberate botanical symmetry, not abrupt joins.

## Return Contract

A reader opened from the map carries its location as `returnPlace`, restricted to lake, elder, bridge or home. Returning places Mr. PinPin at that location's road endpoint, without restarting the initial walk or changing the saved camera. The home endpoint is the start of home-to-lake; lake, elder and bridge use their corresponding route ends. A later interaction can begin a new walk from there.

## Covers

The user is standardizing title artwork at `images/covers/<chapter-or-story-id>/title-<language>-v1.png`, with a shared `covers.json` source for reader first pages and library thumbnails. Atlas previews delegate to the actual `titleCovers.load()` and `titleCovers.resolve()` helper from that work, then decode the selected image. Missing or invalid covers retain existing artwork. Approved covers appear normally; proposed chapter covers require `coverPreview=1`. No fifth-scene assumption and no newly generated title artwork in this task. The user's release worktree remains untouched; its broader reader/library cover integration is separate from this atlas change.

The Home, Sweet Home source draft was found at `/Users/miguel_lemos/.codex/tmp/pinpin-bedtime-chapter-03/chapter-draft.json`; its hash and released artwork match the existing release manifest. It supplies 20 genuine translated story scenes plus a localized cover, exposed as `story=home-sweet-home` at the home location. No prose was invented. The continuous Timber Tractor edition retains all 34 scenes.

## Verification

- `scripts/verify-atlas-margins.cjs`: real cover-to-reader-to-map flows passed for lake, elder, bridge and home at 390px and 1440px. Every sprite matched its exact road endpoint, stayed there until interaction, and preserved the camera. Pointer dragging went outside the original map; negative camera positions persisted on reload; the expanded hard limits held. GPU and forced Canvas2D screenshots were opaque and nonblank.
- `scripts/verify-reader-navigation.cjs`: 320px, 390px and 1440px checks passed after the changes, including only two persistent controls, anchored language switching, safe return URLs, printed controls hidden, footer spacing and chapter/standalone reader routes.
- Camera tests: 19 passed including hardware Chrome pointer/pinch paths, with no skips. Renderer checks preserved every original sharp map pixel, excluded overlays from the exterior, measured mirrored seam differences at most 1/255, and exercised missing-texture and device-loss fallbacks.
- Motion tests cover paused/playing returns, queued-target cancellation, browser Back, BFCache/reload, storage validation, and continuous movement from the returned point. Legacy Leaflet camera checks allow subpixel rounding; exact endpoint checks do not.

The existing local server is reused. No commit, push or publication is part of this iteration.
