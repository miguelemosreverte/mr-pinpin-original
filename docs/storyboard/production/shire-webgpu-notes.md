# Fixed World, Moving Camera

Local preview only; no publication or replacement of the prior atlas until review.

Reference: GauchoAI/gaucho-atlas commit d80152ea3b62b94a87d82fa37760133ccd083160. Its custom WebGPU renderer supplies the camera/input and cached disc-bokeh approach. Renderer adaptations document exact source paths separately in gpu/SOURCE.md.

The original atlas remains a fixed world texture. A persistent viewport canvas samples it using camera center and scale. The initial scale is twice cover-fit; panning and pinch zoom change camera parameters, not page geometry. Keep the existing regions, paths, walking sprites, language choices, book covers and story-progress contract.

The depth asset is an artistic monocular estimate derived from the original map. It controls focus blur only, not collision, navigation, measured 3D reconstruction, or new zoom detail. Exact prompt, timing, original output and checksum are recorded beside the PNG.

## Preview and verification

Open `../atlas-webgpu.html?lang=en` through the local HTTP server. The earlier Leaflet atlas remains available separately. The new preview does not load Leaflet.

- Fresh desktop dragging changes both camera axes before any zoom. Canvas and header remain fixed. Opening scale is exactly twice cover-fit.
- Camera tests: 12 passed, including actual Chrome mouse, wheel, pointer capture, touch-sized viewports, inertia and gesture cancellation.
- Motion/focus unit tests: 15 passed; two optional legacy-page browser tests were skipped in that unit run. The new page has a separate integration suite in `scripts/verify-atlas-webgpu.cjs`.
- Actual Chrome WebGPU adapter: Apple Metal-3, not a software fallback. Sharp rendering matches every source RGB value across 1,572,864 pixels. Canvas2D fallback also matches.
- Depth blur changes the image while preserving 124,664 tested in-focus pixels exactly. Half-alpha overlay composition matches expected RGB; routes and characters are composed after blur.
- Desktop, 390px and 320px camera alignment and nonblank GPU/fallback pixels passed. Simulated GPU device loss retained a visible, interactive fallback on the existing canvas.
- Focus sweep exercised cache eviction: at most four blur slices, 25,165,824 bytes. Warm 120-frame scheduling sample: median 16.7ms, p95 16.8ms; this is a short local sample, not a guarantee for phones or a GPU execution-time measurement.
- The lake book reveals the correct first chapter image. Preview alone does not record a chapter as opened.
- Integrated desktop, touch, story, arrival and fallback suites passed. English, Spanish and Russian covers open their matching reader; Elder unlocking and unpublished Home behavior are preserved. The existing combined tractor reader now has 34 scenes (24 opening scenes and 10 Home scenes), which the test checks without changing story content.
- Fresh full-page captures at 320px, 390px and 1440px show no document overflow, no Leaflet runtime and a fixed header. Pausing motion stops the controller's settled animation loop.

At the requested 2x cover zoom, a portrait phone cannot show the home and lake arrival together. An offscreen arrival must not place a book at an unrelated screen position or move the camera automatically. Panning to the location reveals its book.

## Limits

The depth PNG was generated with the built-in image tool. Its adjacent Markdown and JSON preserve the exact prompt, input, generation timestamps (48.839 seconds), output and checksum. Major landmarks align, but foliage boundaries and bright stream details remain approximate. Blur is restrained; the production interface does not expose an extra effect-settings button. This is not new high-resolution map detail or reconstructed geometry.

GPU-unavailable browsers retain map navigation and books through Canvas2D without depth blur. Device loss after GPU initialization uses a bitmap fallback on the same canvas; it is slower than starting directly in Canvas2D. Cached bokeh still consumes GPU time and memory.

## Production Navigation

The reader exposes only Map and the current language flag. On phones these sit in a persistent bottom bar with safe-area spacing; on desktop they occupy the right margin. Language opens three circular flag choices above the controls. Selection retains the current scene and relative reading position. The footer repeats Back to map. Browser printing and the existing print-preview URL still work, without adding printing buttons to the reader.

The atlas exposes only its language toggle and contextual location books. Zoom, fit, pause, effects and library toolbars are not visible or keyboard-accessible. Pointer dragging, wheel zoom and touch pan/pinch remain available. Opening a location book shows a cover: outside tap or a large Back to map button dismisses it, while the cover opens the reader.

Location books display text-free miniatures rather than a book symbol. Each story has a persistent Three.js CSS3D banner with an authored ground anchor and transform in `atlas-banners.json`. Only the segment selected from Mr. PinPin's actual current position is active. The camera center, pointer and walking destination do not select the banner. Panning can direct his walk; selection follows his position without waiting for arrival. Panning and zooming project the same nodes, without screen-edge clamping or replacing their images. An active banner outside the viewport is clipped, never moved to a false screen location.

The upright miniature starts from a 160 x 240 CSS pixel plane with a per-location rotation and scale. Beyond the opening scale, it grows with map zoom. The viewport cap includes its ground ring and connector dots. Miniature and full-preview assets are cached separately; full previews still use localized titles and the shared registry's approval rules. Banners temporarily hide while a full preview is open and reappear on dismissal.

Selection samples a prebuilt nearest-region and confidence texture in memory. Unchanged character positions skip the lookup; changing the selected region toggles existing cached banners rather than fetching or replacing them. Camera movement only updates their projection. Browser checks use touch emulation, not a physical device.

The field uses exact Euclidean distance on the original pixel grid, with direct segment hits preserved. It packs the region ID and confidence into two bytes per pixel (3 MiB total). Each movement query is constant-time. Confidence is the distance advantage over the nearest distinct competing region, reaching 100% at 24 source pixels. A new candidate needs at least 20% confidence continuously for 160ms; boundary noise retains the current banner. This is a geometric margin, not a probability.

`images/atlas/shire-focus-field-v1.json` describes the prebuilt binary and source hashes. `scripts/build-atlas-focus-field.cjs --check` checks the source, manifest and exact rebuilt bytes. Phones load this asset without decoding the mask or calculating distance transforms; a missing or invalid asset falls back to preparing the same field from the mask.

Language rendering does not write shared preferences back to storage. Only deliberate language changes and progress updates save state. This prevents differently localized atlas tabs from overwriting each other continuously. Same-language updates preserve an open flag menu; selecting a language, tapping outside, or Escape still closes it.

Chapter URLs carry an allowlisted `returnTo` page. The WebGPU atlas stores validated world center and relative zoom in tab-scoped session storage, restoring them on return without moving the page or resetting the camera. Returning carries the reader's selected language.

`node scripts/verify-reader-navigation.cjs` passed at 320px, 390px and 1440px: exactly two reader controls, large hit targets, language scene retention, cover dismissal/opening, same-camera return, printed controls hidden, chapter 2 and the 34-scene tractor reader, unobscured footer, and rejection of external return destinations. The existing five WebGPU integration suites also passed after updating them to exercise gestures and internal test controls rather than removed production buttons. No publication was performed.
