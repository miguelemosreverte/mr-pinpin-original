# Scoped licensing implementation

2026-09-22. Implemented the user-authorized policy; no commits, staging, pushes,
uploads, binary edits, remote changes, or immutable release changes by this lane.

## Policy

`LICENSE` defines scope; `LICENSE-MIT` contains standard MIT text naming Miguel
Lemos, 2026, for his owned contributions. The grant covers only independently
owned/authorized functional software and technical documentation. Creative
material is excluded regardless of extension or embedding in JS/JSON/HTML/CSS.
`CONTENT-LICENSE.md` permits personal/noncommercial family reading, download, and
printing only for rights controlled by the project. It preserves third-party
terms, valid prior grants, legal exceptions, and public-domain status, and makes
no invented copyright claim in unprotectable AI-generated material.

Read Pauli's completed `tools/assets/licensing-audit.md` before finalizing. All
three concrete exclusions were incorporated into source, official, and website
scope copies: `docs/storyboard/gpu/**` pending clearance; the complete original
export including styling (`docs/index.html`, `docs/images/**`); and creative
procedural character geometry/configuration including `scripts/blender-pinpin/**`.
The third-party notice records GauchoAI/gaucho-atlas commit
`d80152ea3b62b94a87d82fa37760133ccd083160` and the unresolved sublicensing boundary.
Existing `gpu/SOURCE.md`, vendor credits, and historical provenance are untouched.
The policy is not an asset-by-asset rights-clearance certificate.

## Exact owned changes

Source checkout:

- Added `LICENSE`, `LICENSE-MIT`, `CONTENT-LICENSE.md`, `THIRD-PARTY-NOTICES.md`.
- Added identical copies of those four files in `docs/permissions/`, plus its
  flat, accessible English `index.html` with local notice links.
- `README.md`: only the new `## Permissions` section is this lane's change.
- `AGENTS.md`: only the opening licensing bullet is this lane's change.
- `assets/bucket-README.md`: added only the `## Permissions` section.
- `docs/storyboard/library.html`: added one Permissions footer link.
- `docs/storyboard/library.css`: added footer flex-wrap/gap rule only.
- `tools/publishing/pages_template.py`: copy the four root notices to new
  templates and document scope in generated README/AGENTS. Archive format unchanged.
- `tools/publishing/test_publishing.py`: one new test checks copied notice bytes,
  website parity, scope exclusions, and unchanged release identity.
- `tools/assets/licensing-implementation.md`: this report.

Official checkout:

- Added the same four root notices, byte-identical to source.
- `README.md`: new Permissions section only.
- `AGENTS.md`: new opening licensing paragraph only.

Mixed/unowned work: source README/AGENTS also contain another lane's workspace
and CI edits. Those hunks are not mine. The storyboard README rewrite,
`WORKSPACE.md`, `PUBLISHING.md`, workflow deletion/addition, licensing audit, and
licensing publication report are other lanes' work. Preserve them; do not infer
ownership from a whole-file diff or include them blindly in a licensing-only
commit. Build checks below include the current working tree, not just my changes.

## Verification

- Publisher unittest suite: 12/12 passed, including the new template/notices test.
- `node tools/assets/build-pages.cjs --check`: passed, 603 files, 502 managed
  production assets, 755,862,291 bytes, below the 950,000,000-byte cap. No build
  directory materialized. Local links and preserved upstream notices pass.
- Both repositories: `git diff --check` passed. All four notices match between
  source, official, and website copies.
- Playwright with installed Chrome: permissions page checked at 1280x800 and
  375x812, no horizontal overflow; screenshots captured. Mobile footer has only
  Original book and Permissions. This file-URL footer check does not test fetched
  chapter content; the production/browser lane owns the HTTP runtime check.
- Screenshots: `/tmp/pinpin-permissions-1280.png`,
  `/tmp/pinpin-permissions-375.png`, `/tmp/pinpin-permissions-footer-375.png`.

Public notices require a newly built/selected release. Root official notices do
not inject files into existing immutable archives. Bucket README is ready for
operator upload. Source-commit/build fidelity, packaging, deployment, and live
verification remain the main operator's responsibility.

Reference checks: [standard MIT text](https://opensource.org/license/mit) and
[US Copyright Office AI report](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf).
These inform wording, not a universal ownership ruling or third-party clearance.
