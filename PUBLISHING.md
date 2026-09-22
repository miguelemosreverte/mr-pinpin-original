# Publishing Mr. PinPin

Public site: https://miguelemosreverte.github.io/mr-pinpin-pages/

Books: https://miguelemosreverte.github.io/mr-pinpin-pages/storyboard/library.html

Atlas: https://miguelemosreverte.github.io/mr-pinpin-pages/storyboard/atlas-webgpu.html

## Repository responsibilities

- `miguelemosreverte/mr-pinpin-original`: authoring source, story text,
  translations, artwork provenance, asset policies, and preserved Git history.
- `miguelemosreverte/mr-pinpin-pages`: deployment code and small, versioned
  release records only. Do not commit artwork, videos, release archives, or
  authoring history to this repository.
- Public Hugging Face bucket `miguelemosreverte/mr-pinpin-archive`: verified
  originals, production-media preservation copies, experiments, and immutable
  release bundles. Never put credentials or private files here.

The existing repository and website remain available during cutover. Creating
the Pages-only repository does not rewrite or shrink the author's old Git
history. It prevents that history, and future binary changes, from accumulating
in the publishing repository.

## Release contract

Build with the production allowlist, using the existing Pages builder. Prepare
the release using `tools/publishing/` and follow its command documentation.
Each release records the source commit, every output file's size and SHA-256,
and the archive identity. Upload and verify the public bundle before selecting
it in the Pages repository.

The Pages workflow downloads the selected release anonymously, checks archive
and per-file identities, rejects unsafe paths and links, enforces the deployment
size budget, and only then deploys. Readers receive files from GitHub Pages,
not from Hugging Face. A storage outage can block a new deployment without
breaking a release that Pages is already serving.

Keep previous release records and objects. Rollback selects a previously
verified release in a new ordinary commit; it does not force-push or rewrite
history. Content-addressed storage is application-enforced immutability, not a
provider guarantee against account-owner deletion. Verification detects changed
content; it cannot prevent a bucket administrator deleting an object.

## Artwork safety

The approved Elder WebP derivatives retain their original pixel dimensions.
The original PNGs remain distinct assets. Never treat a compressed derivative
as a backup of its source. Verify the original against its provenance hash and
verify its uploaded bytes before considering removal from Git tracking.

Backing up an asset does not itself delete or untrack it. Preserve working
files and original history. Any later untracking must use matching verification
receipts and leave a documented restoration path. Do not bulk-delete media to
make a repository look smaller.

## Future agents

1. Read `AGENTS.md`, `assets/README.md`, and the publishing tool documentation.
2. Make changes in the authoring repository, not the Pages repository.
3. Preserve or restore original assets through the verified manifests.
4. Build and test on the mini/SSD when the work is disk-heavy.
5. Create and verify a new release, then update the Pages release selector.
6. Wait for successful deployment and check chapters, languages, image loading,
   and atlas navigation on the public URL before reporting success.

Do not assume that pushing to the authoring repository automatically selects a
release in the separate Pages repository. That release selection is an explicit
publishing step.
