# Tractor preview media caching

The previous review server sent `Cache-Control: no-cache` without an ETag or
Last-Modified validator. Once a panorama left the GPU cache, warming it again
could download its entire unchanged PNG. Two neighbors cost roughly 24–25 MB
per distant selection.

The replacement [server helper](preview-server-cache.cjs) adds strong SHA-256
ETags and Last-Modified only for PNG/JPG/WebP/MP4 files beneath the existing
`tractor-stops-20260924` and `tractor-orbit-20260924` production directories.
`max-age=0, must-revalidate` lets the browser reuse the body after a 304 while
checking for changed assets immediately. HTML, JS, metadata, and other scenes
retain their previous `no-cache` behavior.

Validators are cached by file size, nanosecond modification/metadata-change
timestamps, and inode, with at most 128 entries. The 24 selected panoramas and
orbit clip are hashed by two workers before the long-lived server accepts
traffic. This moves one-time hashing out of the first-view request. Assets are
not resized, rewritten, re-encoded, or deleted.

[Request evidence](SERVER-CACHE-VERIFICATION.json) from the mini shows:

- Unchanged stop-06 PNG: old repeat 200 / **12,761,928 body bytes**; new repeat
  304 / **0 body bytes**, 1.27 ms on localhost.
- First views still transfer the unchanged full-resolution PNG. Timings vary
  with process/server state; the isolated unprimed server initially took
  55.7 ms including its first content hash. Startup warming removes that hash
  from subsequent server requests; it does not eliminate first-download cost.
- Actual orbit MP4 range: 206, exactly 1,024 requested bytes, correct
  Content-Range, 1.04 ms on the running server.
- [Focused tests](verify-preview-cache.cjs) verify first 200, repeat 304,
  same-size media replacement invalidation, immediate JS edits, byte/suffix
  ranges, changed If-Range fallback, and unsatisfiable-range 416.

Run the focused test with `node verify-preview-cache.cjs` in this directory.
The unchanged prior helper is retained as [preview-server-before.cjs](preview-server-before.cjs).

The active mini review server on port 18792 now runs the new helper from
`/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-orbit-20260924/preview-server-cache.cjs`
against the existing `pinpin-review-mirror-20260924/docs` root. Its source
SHA-256 is `0d47cd4b80af3a38819d4dc0364d3d477affdbd85e4d0e6bf76548dbcd24baf2`.
Cutover completed before the controls worker's browser QA; temporary sidecar
port 18793 was stopped. No runtime tour/gesture/HTML files were changed by
this server lane. This is a local preview improvement, not a public deployment.

Actual Chrome reuse also passes in a **fresh persistent profile with the default
cache budget**, without custom cache flags, request routing, manual validators,
or access to the user's browser profile. [Browser proof](BROWSER-CACHE-VERIFICATION.json)
records a 12,524,482-byte PNG fetched twice: the second request includes
browser-generated If-None-Match/If-Modified-Since headers, receives network 304,
and transfers 364 wire bytes while `fetch()` correctly returns the cached body.

The real tour then visited `00 → 06 → 12 → 06 → 00 → 12`, allowing 1.8 seconds
of idle neighbor warmup at each stop. All six neighbor requests during the three
repeat visits returned 304: **2,184 total wire bytes and zero PNG body bytes**,
instead of downloading roughly 24–25 MB per revisit. The panorama GPU cache
remained bounded at five entries. Cold first visits still download full images,
and bringing an evicted panorama back to the GPU still requires decoding/upload.

The original ephemeral Playwright context returned 200/200 for this large PNG
and did not reuse its body. The persistent default-profile result establishes
normal disk-cache reuse; it does not claim identical cache admission in private
or memory-only browser modes. No application Blob cache or derivative media was
added to work around the ephemeral test context.

Reproduce on the mini with `node verify-browser-cache.cjs persistent-default`
and `node verify-browser-cache.cjs persistent-tour`. Test profiles and raw logs
remain on TB4, outside Git. The first-pass archived evidence and its receipt
remain unchanged. The separate controls worker completed the UI checks.

The orbit source already uses an all-intra H.264 derivative: the existing
[pipeline](../tractor-orbit-20260924/PIPELINE.md) records GOP 1 and all 289
frames as keyframes. A fresh `ffprobe` metadata read of the served file confirms
1280×720, 24 fps, 12.041667 seconds, and 289 frames. There is no additional
all-IDR conversion to apply. Browser seek/frame-delivery scheduling and the
tour's state transitions still determine when an exact source frame can be
shown; caching does not bypass the RVFC accuracy barrier. No video encoding
or frame content was changed in this pass.
