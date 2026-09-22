# Licensing and provenance audit

2026-09-22. Bounded inspection of the current source checkout and sibling
`mr-pinpin-official` deployment checkout. No history scan, ownership adjudication,
code edits, licensing changes, or commits. Only this report was written.
Inventory used `git ls-files`, including tracked vendor files that ignore rules
can hide from default searches. Concurrent work by other lanes is not reverted.

## Decision for Parfit

Proceed with MIT for original software contributions that the licensor is
authorized to license, with explicit content and third-party exclusions. Do not
label the entire repository, every JS/JSON/HTML file, or the complete published
site as MIT. Existing deployment permission is not proof of authority to
relicense imported code. The user has authorized the licensing policy; the
findings below identify its boundary, not a request to reapprove that policy.

One concrete unresolved code origin: `docs/storyboard/gpu/SOURCE.md:3` records
adaptation from `GauchoAI/gaucho-atlas` commit
`d80152ea3b62b94a87d82fa37760133ccd083160`. Lines 8-15 identify the upstream
renderer and shaders; lines 17-18 explicitly say no reference license was found
and record user-authorized reuse without inventing a license.
`gpu/dof-bake.wgsl:1` explicitly identifies its adapted origin.
The local reference checkout still has no tracked LICENSE/COPYING/NOTICE file;
GitHub's license endpoint returned 404, which is not proof of rights absence.

**Blocker to a blanket MIT grant over the renderer/shaders:** redistribution and
sublicensing rights for the imported expression are not established by these
records. Conservatively exclude `docs/storyboard/gpu/**` from the new MIT grant
pending a documented rights-holder grant or a narrower file-by-file clearance.
Do not assert an upstream MIT license. This does not prevent licensing independent
original application/publishing code now, nor establish that existing deployment
is unauthorized. Preserve `gpu/SOURCE.md`.

Direct Parfit messaging was requested, but this agent has no callable peer-send
tool and Mission Control was reported unavailable. This section is the concrete
handoff; the same finding was reported in the parent conversation.

## Existing third-party notices

| Component | Evidence and scope | Disposition |
| --- | --- | --- |
| Leaflet | `docs/storyboard/vendor/leaflet/LICENSE`, BSD-2-Clause; Agafonkin and CloudMade notices; JS, CSS and marker/layer images | Preserve upstream notices and terms; exclude the whole vendor subtree from a claim of original project ownership. |
| Three.js | `docs/storyboard/vendor/three/LICENSE`, MIT, Three.js authors; README identifies npm `three@0.180.0`; includes core/module builds, CSS3DRenderer and addons | Preserve MIT copyright/permission text for all these files, including locally adjusted imports. Vendor README lists fewer files than the tracked subtree; directory-level scope avoids missing addons. |
| Lucide | `docs/storyboard/icons.js:2`, v0.468.0 ISC; `icons.LICENSE` names Lucide contributors and Feather/Cole Bemis origins | Existing full notice matches the upstream tagged license. Preserve the complete notice, including Feather attribution; do not replace it with the project MIT notice. |

The selected immutable official release manifest includes all three notice files:
`storyboard/icons.LICENSE`, `storyboard/vendor/leaflet/LICENSE`, and
`storyboard/vendor/three/LICENSE`. This is a positive packaging check, not a new
download/hash audit. Preserve these files when adding a permissions page; a new
root license does not replace them. The inspected vendor licenses are not a
blocker to the scoped policy. [Lucide's tagged upstream notice](https://raw.githubusercontent.com/lucide-icons/lucide/0.468.0/LICENSE)
corroborates the local notice.

No tracked repository-wide LICENSE/COPYING/NOTICE was present in either checkout
at initial inspection; `package.json` also had no license field. Other lanes may
now be adding those files. Official `scripts/materialize.py` and
`scripts/release_format.py` are byte-identical to the source `tools/publishing/`
copies and use Python's standard library. They are candidates for the same
original-code grant, not evidence that third-party licenses can be reassigned.

## Scope to publish

| Material | Practical licensing boundary |
| --- | --- |
| Original reader/library/atlas application logic, CSS, test logic, build/verification/publishing utilities, original technical documentation | MIT only for original contributions under the licensor's control; imported portions and creative content below remain excluded. |
| `docs/index.html`, `docs/images/**` | Preserved original book, artwork, and exported document styling; exclude the complete export from the software grant. |
| `docs/storyboard/book.json`, `translations.json`, `illustrations.json`, `stories/**` | Story prose, translations, scene descriptions, image alt text and editorial arrangements are content, despite JSON encoding. |
| `locale.js`, `atlas.js`, `atlas-webgpu.js`, reader/library HTML, generation/test fixtures | Mixed files: original functional code can be MIT, but embedded book titles, names, story excerpts, artwork, and creative literals are excluded wherever copied. |
| Images, covers, video/audio, models, textures, character designs, storyboards, production/review journals and generation prompts | Content exclusion regardless of extension, directory, embedded data URL, inline SVG, template string, or generated output. Procedural art code and character-specific geometry/configuration need explicit treatment; do not automatically include all `scripts/blender-pinpin/**` merely because it is Python. |
| Mr. PinPin names, logos, titles and branding | No trademark/branding permission under the software grant. This states scope, not a claim that every name is protected or registered. |
| Vendor code/art/icons/fonts and unresolved imported code | Their existing applicable terms or separately documented permission control; no new project ownership assertion. |

Suggested content-policy substance: to the extent the licensors hold applicable
rights, permit personal and family reading, downloading for that use, and
printing copies for that use. Reserve other rights they actually hold, subject
to statutory rights and existing third-party permissions. Do not grant commercial
redistribution, adaptations, or public rehosting by implication. Do not apply
personal-use restrictions to MIT code or upstream open-source components.
Public access and archive availability do not by themselves grant extra rights.

Use a scope document alongside the unmodified MIT text, plus a content permission
notice and third-party index linked from the website. Include the scope in any
new website release; adding files only to the deployment ledger does not insert
them into the immutable site archive. Do not rewrite historical releases or
manifests to retrofit notices.

## Authorship and origins

- Parsed and decoded `docs/index.html` with the existing HTML parser. The export
  starts with chapter 1; its only meta entry specifies UTF-8. No visible
  author/byline, copyright, ISBN, or illustrator attribution was found in the
  searched decoded text. `book.json` has title/language/preface/chapters/source;
  its source record establishes a hash, 38 chapters and 100 unique images, not
  authorship. Do not infer a named author or owner from the checkout/org name.
- `production/timber-tractor-story-notes.md:3` documents commissioned original
  standalone fiction and translations. It says the old farm story informed the
  rhythm only and that no source passage was supplied or consulted. This is
  provenance evidence, not a named-author assignment or external clearance.
- `scripts/blender-pinpin/README.md:24` lists a Simon Willison repository as an
  inspected implementation reference, while describing locally authored geometry.
  Its license endpoint returned 404. No copied code was established in this
  bounded pass. Treat that as a targeted provenance follow-up, not proven
  incompatibility; exclude any copied expression until its permission is known.
- Generation journals identify image-tool outputs and fal.ai video/model
  workflows. Prompts, request logs and hashes are not proof of exclusive
  copyright or reference-input rights. Do not claim that AI outputs acquire
  copyright automatically; qualify reservations to rights that exist and are
  held. The [U.S. Copyright Office AI materials](https://www.copyright.gov/ai/)
  distinguish questions of AI-output copyrightability; this audit makes no
  jurisdiction-wide ownership conclusion and does not review provider contracts.

## Dependencies and remaining checks

The lockfile lists MIT: acorn, acorn-walk, nanoid, parse-srcset, parse5, postcss,
postcss-value-parser; ISC: picocolors; BSD-2-Clause: entities; BSD-3-Clause:
source-map-js. These are declared development dependencies; preserve their
licenses if redistributing them. No GPL/AGPL or other incompatible code license
was identified in the inspected declarations/notices, which is not an exhaustive
provenance guarantee. `huggingface_hub==1.27.0` is a tooling dependency and the
book extractor uses lxml; do not include either in the project's ownership claim.
Playwright/Chrome, Blender, media utilities and GitHub Actions are tools used by
the project, not automatically project-licensed code or artwork.

The original export has a CSS import from `themes.googleusercontent.com`; font
families include Amatic SC, Roboto, Courier New and Arial. No tracked font binary
was found. Preserve the external-font distinction; do not label provider-served
fonts MIT or copy/self-host font binaries without their own notices. Parsed
tracked HTML contained no remote script/link/img/video/source/iframe resource
attributes; this does not remove the CSS font import or tooling network calls.

Remaining nonblocking items for the scoped original-code grant: name actual
rights holders only when supported; retain artwork/provider provenance; keep
vendor notices in future artifacts; clarify procedural art scope. Unresolved
Gaucho-derived code remains a blocker only to including that code in a blanket
MIT representation. No need for an extensive history scan before publishing the
narrow policy with that exclusion.

## Concrete draft review

Reviewed the concurrently added `LICENSE`, `LICENSE-MIT`, `CONTENT-LICENSE.md`,
`THIRD-PARTY-NOTICES.md`, and `docs/permissions/index.html`. Re-read the current
versions after Parfit's updates rather than reviewing an obsolete intermediate
draft. **No remaining dangerous scope omission found in this bounded review.**

- Root scope now expressly excludes `docs/storyboard/gpu/**` pending clearance,
  the complete original export, and character-specific procedural art. The
  website summary and third-party notice repeat those boundaries. The identified
  Gaucho issue is therefore contained by the draft; it remains unresolved only
  for a future attempt to include that code in MIT.
- Creative exclusions apply inside code/data/documentation and to deployed
  media and archives. Personal/family reading, downloading and printing are
  limited to rights the grantor controls. Third-party grants, statutory rights,
  public-domain status and unprotected AI material are preserved. The text does
  not name Miguel as the original book's author or assert ownership of all art.
- `LICENSE-MIT` contains the standard software grant, with the explicit scope
  in `LICENSE`; retain them together when packaging. Brand/endorsement and
  personality rights are not granted by implication.
- All four root notice files are byte-identical to their copies under
  `docs/permissions/`. All eight local links in the permissions page resolve
  to existing source files, including the three preserved vendor notices.
- Nonblocking detail: the third-party notice warns about system fonts but could
  name the original export's Google-hosted font CSS separately. The existing
  original-export and third-party-font exclusions already prevent an MIT claim
  over it.

Ready for post-release browser verification of `/permissions/`: mobile/desktop
readability and overflow, library entry/back navigation, all four full notices
and three vendor-notice URLs, presence of the exclusions in served text, and
unexpected runtime/network errors. That live verification has not yet run and
is not implied by this source review. No other lane's files were changed.
