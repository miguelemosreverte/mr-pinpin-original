"""Create a tiny Pages repo; stage immutable records and explicitly select one."""
import os
from pathlib import Path
import shutil
import tempfile

from release_format import (canonical, clean_path, digest, load_release, new_directory,
                            require, write_new)
from materialize import selected_release

WORKFLOW = """name: Publish Verified Release
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Download and verify selected immutable release
        run: python3 scripts/materialize.py --repo . --out .pages-site
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .pages-site
      - name: Deploy verified site
        id: deployment
        uses: actions/deploy-pages@v4
"""

README = """# Mr. PinPin Official Reader Releases

Public site: https://mr-pinpin.github.io/
Authoring repository: https://github.com/mr-pinpin/mr-pinpin-source
Public release bucket: https://huggingface.co/buckets/miguelemosreverte/mr-pinpin-archive

Deployment-only repository: mr-pinpin/mr-pinpin.github.io. Source, asset
authoring, and build history remain in the authoring repository. No site binaries
or source history belong in this repo.

Canonical local checkouts are siblings mr-pinpin-official and mr-pinpin-source
under /Users/miguel_lemos/anastasia-pinpin-repos/. Former local names are symlink
aliases; use canonical paths with the publishing tools. Old GitHub repository
URLs redirect to the mr-pinpin organization, but old Pages URLs do not automatically
redirect. Local directory names stay unchanged: mr-pinpin-official checks out
mr-pinpin/mr-pinpin.github.io.
A legacy source site may redeploy at /mr-pinpin-source/; it is not canonical.
The public HF bucket name, historical evidence, and release manifests stay unchanged.

| Location | Role |
| --- | --- |
| mr-pinpin-source | Authoring, recipes, tests, provenance, preserved history |
| mr-pinpin/mr-pinpin.github.io | Reader deployment scripts and immutable release records |
| mr-pinpin-archive on HF | Verified original media, experiments, release archives |

release.json selects a SHA-256-addressed releases/<sha>.json. The manifest records
the source commit, exact archive identity, and every site file's bytes and SHA-256.
CI downloads anonymously from the public Hugging Face bucket and verifies all of
them before deploying. No HF secret is needed. Set Pages source to GitHub Actions.

Run locally: python3 scripts/materialize.py --repo . --out NEW_OUTPUT_DIRECTORY
The Python materializer uses only the standard library and never replaces an
existing output. URLs and paths inside the built site are preserved unchanged.

| Path | Purpose |
| --- | --- |
| release.json | Current release selector |
| releases/<sha>.json | Immutable per-file manifest and source commit |
| scripts/ | Anonymous download and verification, stdlib only |
| .github/workflows/pages.yml | Verify, then deploy to the official site |

To publish or roll back, use tools/publishing/publish.py in the authoring repo:
stage --package PACKAGE --pages-repo THIS_REPO adds an immutable release record;
select --pages-repo THIS_REPO --release SHA --expected-current OLD_SHA explicitly
updates the selector. Review, commit, and push normally. Never force-push. Keep
older release records and HF objects so rollback remains available. First-time
template generation includes the initial selected manifest.

HF buckets are mutable storage, not provider WORM. Hash keys, refusal to overwrite
conflicting content, verified upload readback, and anonymous deployment checks
enforce immutability at the application level. Never replace/delete release
objects. External mutation causes verification failure, not silent deployment.
The script does not create repositories, configure Pages, commit, push, cut over
traffic, or redirect old Pages URLs. Operators manage those actions separately.
"""

AGENTS = """# Official publishing rules

This is mr-pinpin/mr-pinpin.github.io, a deployment-only repo.
The local checkout remains mr-pinpin-official. Author in mr-pinpin-source:
https://github.com/mr-pinpin/mr-pinpin-source
Canonical readers: https://mr-pinpin.github.io/
Store: https://huggingface.co/buckets/miguelemosreverte/mr-pinpin-archive
Do not add authoring history or site binaries.
Never edit/delete releases/<sha>.json or rewrite published HF objects. New
releases add new records; rollback only changes release.json to an existing SHA.
Use the authoring repo's tools/publishing CLI, normal commits, and normal pushes.
Do not bypass archive/file verification or raise the 950,000,000-byte size cap.
HF public downloads require no credentials. Do not add secrets to this repo.
No deployment or old-site cutover without the operator's authorization.
Use canonical local paths, not former-name symlink aliases. GitHub repo redirects
do not imply Pages URL redirects. The source legacy site is not canonical.
Keep historical evidence and immutable release manifests unchanged after renames.
"""


def stage(package, repo):
    manifest, release = load_release(clean_path(package) / "release-manifest.json")
    repo = clean_path(repo)
    require(repo.is_dir(), "Pages repo does not exist")
    directory = clean_path(repo / "releases")
    directory.mkdir(exist_ok=True)
    target = directory / (release + ".json")
    if target.exists():
        load_release(target, release)
    else:
        write_new(target, canonical(manifest))
    return release


def template(package, output):
    output = new_directory(output)
    try:
        release = stage(package, output)
        write_new(output / "release.json", canonical({"version": 1, "release": release}))
        (output / "scripts").mkdir()
        for name in ["materialize.py", "release_format.py"]:
            write_new(output / "scripts" / name, (Path(__file__).parent / name).read_bytes())
        (output / ".github" / "workflows").mkdir(parents=True)
        write_new(output / ".github" / "workflows" / "pages.yml", WORKFLOW.encode())
        write_new(output / "README.md", README.encode())
        write_new(output / "AGENTS.md", AGENTS.encode())
        write_new(output / ".gitignore", b".pages-site/\n__pycache__/\n*.pyc\n")
    except BaseException:
        shutil.rmtree(output)
        raise
    return release


def select(repo, release, expected_current):
    repo = clean_path(repo)
    digest(release)
    load_release(repo / "releases" / (release + ".json"), release)
    # Serialize our own selector writers; immutable records are never replaced.
    lock = repo / ".release-selector.lock"
    write_new(lock, b"")
    temporary = None
    try:
        _, current = selected_release(repo)
        require(current == digest(expected_current), "Selector changed; refusing stale selection")
        fd, temporary = tempfile.mkstemp(prefix=".release-selector-", dir=repo)
        with os.fdopen(fd, "wb") as stream:
            stream.write(canonical({"version": 1, "release": release}))
            stream.flush()
            os.fsync(stream.fileno())
        require(selected_release(repo)[1] == current, "Selector changed while selecting")
        os.replace(temporary, repo / "release.json")
    finally:
        if temporary:
            Path(temporary).unlink(missing_ok=True)
        lock.unlink()
    return release
