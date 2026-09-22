# Publishing implementation

Implemented under tools/publishing only. CLI contract/schema frozen after the
operator started packaging. No new repo edits, remote creation, deployment,
production packaging, or HF upload were performed by this lane.

## Ready contract

- `publish.py package --artifact PATH --source-commit FULL_SHA --out NEW_DIR`
- `publish.py upload --package DIR --cache EXTERNAL_CACHE --receipt NEW_FILE`
- `publish.py template --package DIR --out NEW_DIR`
- `publish.py stage --package DIR --pages-repo CLONE`
- `publish.py select --pages-repo CLONE --release SHA --expected-current SHA`

Files: release_format.py (validation), package_release.py (deterministic tar/gzip),
materialize.py (anonymous download and strict extraction), pages_template.py
(repo scaffold and explicit selector), publish.py (CLI/adapter bridge), tests,
and README with pristine-checkout restoration/build/publish instructions.

Package contents are release.tar.gz, release-manifest.json, storage-manifest.json.
Pages Git contents contain only manifests, selector, workflow, stdlib verifier,
README/AGENTS and ignores. The existing HF adapter receives a single archive-role
entry at its normal SHA-256 object key. Upload success requires both SDK readback
and an actual separate anonymous download/hash before the new receipt is written.

## Evidence

Focused Python tests pass, including an actual subprocess invocation of the
generated template's materializer against a tiny local archive. Coverage includes
deterministic bytes, exact file preservation, manifest/archive/file tampering,
tar traversal/link/special/duplicate/missing-member rejection, output protection,
size bounds, selector stale-write rejection, rollback, immutable record conflicts,
anonymous streamed transport and upload receipt gating. Final run:
`python3 -B -m unittest discover -s tools/publishing -p 'test_*.py' -v`:
11 tests passed, zero failures (0.142 seconds). No production module/schema changes
were made after the operator copied the packager/template modules.

Actual anonymous HTTPS download against the approved public bucket succeeded:
object sha256/9d/9dd92f3386edf344592a0dd152463c7d61ab87f5d1c9c01d725a9692b0cc218c/john-deere-instructional-seat-2.jpg,
8,750 bytes, SHA-256 9dd92f3386edf344592a0dd152463c7d61ab87f5d1c9c01d725a9692b0cc218c.
No HF SDK or token was used for that check. This proves anonymous transport works;
it does not substitute for the full release archive's own verification.

Operator reports production packaging completed on mini: 598 files, 755,844,681
unpacked bytes, source d8e4493e1fc1f6e87b3d11e64dcf193d4213a4df;
release 636d0c1c5c652ee40c72e0754ef2d795feffb485d33e2c26d8e07e47cf06164c;
archive 5d0023f5b51adaf211e8f7ece559b99735c2ecabc80df91db7f718e1e19e19ad.
Latest operator report: full upload succeeded with verified=true and
anonymous_verified=true. Receipt is at
`/Volumes/TB4/mac-mini-storage/shared/pinpin-release-package-20260922/upload-receipt.json`.
The template was generated and copied to the fresh Pages clone; all 598 packaged
files were hash-compared against primary docs with 100% matches. No implementation
blocker found. The operator is proceeding with full anonymous materialization on
mini; the Pages workflow repeats anonymous download and every-file verification
before deployment. These production results are operator-reported, not separate
large transfer runs by this lane.

The documented pristine-checkout restore command now uses the actual preservation
manifest at `tools/assets/production-preservation.json`.

Template README subsequently updated with explicit links to the authoring GitHub
repository, new public Pages site, and public HF bucket. This is documentation
only; the archive format, schema, packaging, upload, and materializer are unchanged.
Primary operator should refresh README.md in the template/Pages clone from the
README constant in pages_template.py. No deployment or clone edits by this lane.

## Deployment gates for operator

1. Wait for upload success and a receipt with verified/anonymous_verified true
   for the exact release above. Retain SDK remote identity/readback evidence.
2. Copy final tools/publishing modules to mini before generating the template.
   Generate into a new directory; do not put release.tar.gz in Pages Git.
3. Run generated scripts/materialize.py with --repo TEMPLATE --out NEW_SSD_DIR,
   without --archive, so the entire selected release is anonymously downloaded
   and every file is verified. Independently compare its files/hashes with the
   original build artifact. This large check remains with the primary operator.
4. Review release.json and releases/<sha>.json source/totals, then initialize
   the fresh Pages clone with the template and deploy through its workflow.
   The workflow repeats all integrity checks before Pages upload/deploy.
5. Smoke-check the new site and current runtime URLs. Keep the old site/live repo
   untouched unless the operator separately chooses a cutover. No production
   asset untracking is part of this implementation/cutover.

## Limits

Immutability is application-enforced, not provider WORM: serialized publication,
content hash keys, conflict refusal, verified readback, and deployment hash checks.
The existing adapter cannot guarantee conditional creation against external races.
Published object deletion/mutation fails subsequent verification. Keep older
objects/manifests for rollback, and never force-push. Source commit provenance is
caller-supplied for the already verified artifact; this tool does not independently
rebuild/attest that source. No browser/deployment verification by this lane.
