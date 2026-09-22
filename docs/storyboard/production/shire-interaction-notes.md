# The Shire: terrain interaction prototype

The original map remains the visible artwork. Separate generated images supply
touch regions, route directions and character animation. There are no visible
destination badges, circles or text labels. The grayscale route image is an
inspectable production asset; the reader still sees the color landscape.

## Assets and Corrections

- `shire-regions-v2.png`: four irregular flat-color destination areas. The
  first mask excluded doorway/window holes; a generated edit filled them.
- `shire-routes-v2.png`: grayscale atlas with separate colored walking paths.
  The first route image crossed the stream outside the bridge. The second
  routes the main journey across the wooden bridge and branches to the picnic.
- `pinpin-walk-v1.png`: four genuine-alpha poses in a 2x2 sheet, actual size
  1254 x 1254. Runtime crops and measured foot anchors keep the ground contact
  consistent without rewriting the image. This is one high three-quarter view;
  mirroring is not a replacement for future directional sprite artwork.

All five generated attempts have adjacent PNG, JSON and Markdown records with
exact prompts, references, timestamps, hashes and visual reviews. Summed tool
wall time was 296.576 seconds, excluding implementation, review and publishing.
The two superseded attempts remain available in the chronological study:
`../review/shire-interaction.html`.

## Touch and Progression

Taps sample a cached semantic mask at the pointer's map coordinates. The mask's
generated colors are classified with tolerance rather than exact RGB equality.
Black pixels do not act as rectangular destination targets. Drag, cancellation
and multiple pointers suppress activation without preventing native gestures.
Invisible named links provide keyboard access and a silhouette focus highlight.

Opening Crystal Lake unlocks the Elder. PinPin follows the corresponding route
and stops at its destination; animation alone never marks a story opened.
The timber adventure remains independently available. Home is still the
unpublished main-book Chapter 3, not a shortcut to a different chapter.
Progress retains the existing browser-local `pinpin.atlas.v1` storage contract.

An animated dashed active trail and restrained destination pulses replace map
badges. Pause freezes both, reduced-motion starts paused, and background tabs
stop animation scheduling. Raster layers are cached instead of reread per frame.

## Verification and Limits

`scripts/verify-atlas-assets.cjs` validates actual region centers/bounds,
palette coverage, sprite transparency/crops and 631 route samples against the
generated route colors. The source route was manually traced and checked;
it was not automatically inferred or proven to be a precise terrain model.

`docs/storyboard/verify-atlas.cjs` covers three viewport sizes and three
languages, semantic taps, history, unlocking, motion, pause, reduced motion,
hidden tabs, storage and missing assets. Independent Chrome mobile-emulation
checks confirmed pan and pinch without accidental story activation. No physical
iOS/Safari device test has been performed.

At actual map size the sprite has no visible opaque background or strong edge
halo. Some gait/body variation remains. The overview necessarily shrinks the
character; default phone framing keeps the map large and pannable. Further
angles and stronger narrative animation should follow visual feedback on this
first working pass.
