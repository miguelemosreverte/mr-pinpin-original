# Title miniatures — four-story review

Prepared 20 September 2026. Review at `../review/title-miniatures.html` (local server: http://127.0.0.1:8782/storyboard/review/title-miniatures.html?lang=ru).

All four currently illustrated editions have a text-free portrait miniature: chapter-01, chapter-02, timber-tractor, home-sweet-home. These are one 1024 × 1536 master per story, shown at multiple CSS widths and shared by all languages. The bedtime image is the user-approved pilot reused byte-for-byte. The other three are new proposals; publication is pending user review. No git commit or push was performed for this proposal.

## Files

`images/covers/<id>/title/title-{ru,en,es}-v1.png` is the full title page. `images/covers/<id>/miniature/miniature-v1.png` is the text-free miniature. Both have adjacent JSON and Markdown. `covers.json` selects paths, versions and independent approval states. Title copies preserve the exact bytes of all twelve existing covers. Flat historical files stay available for existing URLs; no story scenes or prose changed.

The original checkout has other ongoing work, so this proposal is isolated at `/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-cover-standard`. Its local server falls back to the original checkout only for unchanged legacy story assets omitted by sparse checkout.

## Visual review

Root inspected all three new full portraits, all four desktop comparison screenshots at actual 96, 160 and 240 CSS pixels, and the mobile Elder comparison. The large faces and principal story objects remain identifiable at 96px; expressions and details are clearer at 160/240px. These are visual judgments, not a claim that every small detail remains readable.

- Forest: one PinPin, coherent visible forepaws and feet, prominent golden feather, recognizable lake and lily context. Feather is broader than the original prop for readability. No text seen.
- Elder: two hedgehogs, larger bespectacled Elder and smaller PinPin looking toward one another. Faces, burrow and staff remain clear. Fine foliage persists but faces dominate. Hidden limb attachments remain unverified.
- Tractor: foreground PinPin and red tractor both readable. Yellow crane pedestal is immediately behind the cab, before the round-log load. The selected revision adds visible log straps and removes a tiny hood badge. Far-side strap anchors and occluded geometry cannot be certified from this view.
- Home: approved tightly grouped Mama/PinPin/PomPom bath scene. Baby face remains prominent because it sits closer on a low stool; the recorded pilot scale caveat remains. No new generation was needed.

Built-in imagegen produced the artwork. Exact prompts, references, generation timestamps and SHA-256 are in each selected image's JSON/Markdown. The tractor's first candidate and refinement records are retained alongside its selected image.

## Verification

- `node scripts/verify-title-covers.cjs`: passed; 12 approved title PNGs/sidecars, hashes, 48 actual/synthetic-proposal reader/library route-language-mode cases, scene/prose/spread preservation and fallbacks.
- `node scripts/verify-cover-miniatures.cjs`: passed; four miniature PNGs, hashes, metadata, dimensions and independent approval states; all twelve title copies byte-identical. Review mode permits proposals. `--release` requires all miniature approvals.
- Browser report: Chrome via Playwright, 1440px desktop and 390px mobile, Russian/English/Spanish title switching. Four story rows, all images loaded, no page errors, no horizontal overflow, exact 96/160/240px display widths. At narrow width the 240px pair stacks to preserve its actual size.
- Browser evidence: `/tmp/pinpin-miniature-browser-checks.json`; screenshots `/tmp/pinpin-miniature-{forest,elder,tractor,home}-{1440,390}.png`.
- Independent organization review: `/tmp/pinpin-miniature-organization-review.md`. Its two findings (Elder metadata status and miniature-specific approval documentation) were corrected before final verification.

The reader and live library continue to use full title covers. Miniatures are presented by the dedicated review; changing the library to use them can accompany approval/publication of the set.
