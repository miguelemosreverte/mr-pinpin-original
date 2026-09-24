# Browser process report verification

Review route: `/house-process.html?room=common`, with `bath` and `bedroom` alternatives. This page documents the work already executed; it generates no new artwork and changes no model or tour runtime.

The report reads `process-report.json`: three rooms, 21 recorded steps and nine actual generation calls. Each room shows the six directions as explicitly labelled CSS crops of its real Blender atlas, then the assembled atlas. The first illustration visibly shows all actual ordered geometry/style inputs before its generated output. Revisions retain their rejected/superseded status. Later steps show the paired gray/illustrated spherical conversions, continuous repair and the final runtime cube. Exact prompts, input ordering and source records expand inline. The final PNG/WebP pair is one image with two format links, clearly labelled as identical decoded pixels.

AI generation and deterministic conversion have distinct visible labels. The report identifies model facets as present in the gray guide, not caused by the browser. The final illustrations retain their review-proposal status and links to the complete art review. The earlier visual-benchmark link opens the existing fully repaired panorama viewer, not the inferior unified-atlas experiment.

## Checks

- All three rooms passed at 1440×1000 and 390×844, with every displayed image loaded and no horizontal overflow or JavaScript errors.
- All nine prompt texts match their exact files and recorded SHA-256 values; no prompt text was edited for presentation.
- All 84 unique original-image, prompt, source-record and navigation links returned successful HTTP responses through the local server.
- Room selection updates the URL; browser Back restores the selected room. Direct step fragments survive initial load and history navigation.
- Final desktop and mobile captures were visually inspected after image decoding, including the six-view grid and the visible ordered input-to-output comparison.

Evidence is external on TB4: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/process-check/` (`results.json`, verification scripts and screenshots). Representative captures: `final-1440-blender.png`, `final-1440-inputs-result.png`, `final-390-top.png`.

Files owned by this UI task: `docs/house-process.html`, `docs/house-process.css`, `docs/house-process.js` and this report. Process data/media/provenance are maintained by their separate owners. No Git, release selection or publication was performed.
