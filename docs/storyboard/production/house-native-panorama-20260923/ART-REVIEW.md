# Native panorama: independent art review

Status: **useful one-shot style study; not a production panorama**. The actual book's appearance transfers more strongly, but essential room and fixture identities drift. Matched viewer inspection confirms serious wrap and pole defects. One generated image was inspected; no repair call is part of this experiment.

## Appearance and permitted inference

The candidate has richer rounded timber, domestic textiles, glazed pottery, vegetation, warm light and crafted surfaces. It reads closer to the approved book still than the sparse earlier panorama. Plants, baskets, small shelves, lamps and textile decoration are within this prompt's explicitly broader inference scope; their mere presence is not an error.

The inferred vaulted timber ceiling, chandelier and new decorative volumes are painted proposals absent from the Blender mesh. A richer illustration is not evidence that the editable house has acquired that geometry. Nor does this one view show that the inferred decorations would stay consistent from another camera station.

## Layout and identity defects

- The gray cylindrical **stove becomes a wooden barrel supporting flowers**. That changes the identity/function of an existing major fixture, rather than finishing its surface.
- The **bathroom glimpse becomes a second bedroom-like view**, with a bed and round window replacing the visible tub fragment and plain wall. It loses the required neighboring-room identity; the bathroom leaf is reinterpreted as a substantial wooden leaf rather than faithfully retaining the guide silhouette.
- The right private opening retains a bedroom-like glimpse and an open green leaf. Its broad function is recognizable, but exact leaf/arch silhouette fidelity is not established.
- The two common-room round windows and closed green front door remain broadly located. Table, bookcase and counter stay in their broad respective areas, with substantial crafted-form and decoration changes. This is not exact spatial registration.

These differences prevent acceptance as a faithful tour even though the image is attractive. The book reference's familiar bedroom/window staging appears to have overridden the literal bath visibility in the guide.

## Sphere review

The actual viewer was inspected at all twelve edge directions in paired gray/art captures, plus direct entry, doors, stove and pole views. The doorway-outline comparison confirms visible aperture/frame/leaf drift, especially the enlarged/recomposed bedroom arch; broad placement is not exact registration.

- **Rear wrap:** a hard vertical break beside the entry joins incompatible architecture and foreground foliage. It is clear in `1600-entry-after.png` and `edge-back-down-after.png`, not merely a small texture shade change.
- **Floor pole:** rug fibers and large foliage collapse into a severe radial pinch in `1600-down-after.png`. This is unsuitable for a viewable full sphere.
- **Ceiling pole:** curved beams stretch and pinch into an implausible loop/convergence around the zenith (`1600-up-after.png`).
- Several ordinary side views are attractive and continuous within their local region. That does not compensate for the full-sphere failures or lost bathroom/stove identity.

Evidence is under `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-native-panorama-20260923/browser-check/`; `inputs.json` pins the viewed assets. Edge directions inspected: front-right, front-left, back-right, back-left, front-up, down-front, back-up, back-down, right-up, down-right, left-up and down-left. Contact sheets are derived only from existing browser screenshots, without modifying generated art.

The derived cube can pass identical-ray and projection checks while these source-art failures remain. Deterministic conversion does not repair mismatched source borders or pole content.

## Evidence

The original generated image is 1774×887, not the requested 2048×1024, SHA-256 `5299c3fe2c6791bf556e9cdcdd7caec379a747b4bc0113ab972d04c8632b1f00`. Exact prompt and ordered native-guide/book inputs are in [generation-job.json](generation-job.json); the one call and unchanged original are recorded in [generation-result.json](generation-result.json). Review compares the actual [native guide](native-guide.png), [generated panorama](panorama-v1.png) and approved `papa-arrival-20260922-arrival-05.webp` book reference.

The native render removes cube-panel borders from the input, but this experiment also relaxed the earlier restrictions on decorative inference and changed the input history. It is not a controlled demonstration that native rendering alone improved style. No canonical Blender geometry or selected tour artwork was changed.

## Workflow lesson

The concise guide-plus-book approach succeeds at broad style completion and allowed decorative inference in one call. It does not yet preserve semantic fixture/room identity or spherical continuity reliably. Keep appearance quality, scene identity and full-sphere validity as separate judgments. A reusable guide should convey what its ambiguous forms and adjoining rooms are, while the output must be judged inside the sphere rather than from the attractive flat panorama alone. This lesson does not require a new per-object repair list or further generation in this experiment.

Final disposition: retain as a useful, visually richer one-shot study with documented failures; do not select as the production panorama.
