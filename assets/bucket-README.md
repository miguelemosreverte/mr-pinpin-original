# Mr. PinPin storage

Public preservation storage for the illustrated books and interactive atlas.
This README is a mutable navigation index. Content-addressed release objects
must never be overwritten or deleted.

## Where things belong

- [Published books](https://miguelemosreverte.github.io/mr-pinpin-official/storyboard/library.html)
  and [atlas](https://miguelemosreverte.github.io/mr-pinpin-official/storyboard/atlas-webgpu.html)
  are served by GitHub Pages.
- [Authoring repository](https://github.com/miguelemosreverte/mr-pinpin-source)
  holds source, story text, translations, provenance, and historical Git data.
- [Official publishing repository](https://github.com/miguelemosreverte/mr-pinpin-official)
  holds deployment code and immutable release manifests, not binary artwork.
- This bucket holds original assets, preservation copies, experiments, Blender
  authoring data, and complete release bundles.

## Inventories and restoration

- [Production preservation manifest](https://github.com/miguelemosreverte/mr-pinpin-source/blob/main/tools/assets/production-preservation.json)
- [Elder original PNG manifest](https://github.com/miguelemosreverte/mr-pinpin-source/blob/main/tools/assets/backup-publication-masters.json)
- [Runtime and experimental asset manifest](https://github.com/miguelemosreverte/mr-pinpin-source/blob/main/assets/manifest.json)
- [Asset restoration instructions](https://github.com/miguelemosreverte/mr-pinpin-source/blob/main/tools/assets/backup-publication.md)
- [Publishing and rollback instructions](https://github.com/miguelemosreverte/mr-pinpin-source/blob/main/PUBLISHING.md)
- [Release verification](https://github.com/miguelemosreverte/mr-pinpin-source/blob/main/tools/assets/verification-immutable-release.md)

The bucket remains `miguelemosreverte/mr-pinpin-archive`. Former GitHub repo URLs
redirect after renaming; old Pages URLs do not automatically redirect. The
canonical reader website is https://miguelemosreverte.github.io/mr-pinpin-official/.
Any source-repo site at `/mr-pinpin-source/` is noncanonical. Historical reports
and immutable manifests retain their original recorded names and hashes.

Objects named `sha256/<prefix>/<hash>/<filename>` are identified by their bytes.
The manifests map those objects back to meaningful project paths and record
their expected sizes and SHA-256 checksums. Restore through the documented tools;
do not guess which hash-named file belongs to a scene.

The Pages workflow downloads its selected release anonymously, verifies the
archive and every extracted file, and then deploys. Browsers read the resulting
files from Pages, not this bucket. Originals and published WebP derivatives
remain separate; a compressed copy is never treated as the original's backup.

Buckets are not provider-enforced write-once storage. The publishing workflow
enforces content identities and detects altered bytes. Keep prior objects and
release records for restoration and rollback; restrict write access.
