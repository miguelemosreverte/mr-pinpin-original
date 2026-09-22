# Mr. PinPin: Original Book

[Read the complete illustrated book](https://miguelemosreverte.github.io/mr-pinpin-pages/).

[Read the new storyboard edition](https://miguelemosreverte.github.io/mr-pinpin-pages/storyboard/?chapter=1&lang=ru).
The storyboard edition and standalone family stories are developed alongside the
original book. Chapter and language are preserved in the URL; the library shows
the available editions.

[Chapter library](https://miguelemosreverte.github.io/mr-pinpin-pages/storyboard/library.html)
and [interactive atlas](https://miguelemosreverte.github.io/mr-pinpin-pages/storyboard/atlas-webgpu.html).

This is the authoring and historical repository. The separate
[mr-pinpin-pages repository](https://github.com/miguelemosreverte/mr-pinpin-pages)
contains only deployment code and immutable release records. It downloads and
verifies a selected public Hugging Face bundle before deploying. Read
[PUBLISHING.md](PUBLISHING.md) for the release, restoration, and rollback workflow.
The previous `mr-pinpin-original` website remains online as well.

The new edition lives in `docs/storyboard/`. Run `python3 tools/build_book.py`
(requires `lxml`) and `python3 tools/prepare_scenes.py` to rebuild source data.
Both scripts verify that the original narrative is preserved in order.

This repository preserves the original HTML book and all 100 original PNG
illustrations, without compression, resizing, abridgment, or changes to the story.
Mr. PinPin and Mr. PomPom are brothers; this book focuses on Mr. PinPin's origin.

The supplied `MrPinPin.html` is stored as `docs/index.html` so the book opens
directly on GitHub Pages. Its bytes and the image bytes are unchanged from the
original export. The original document layout and font references are preserved.

The legacy GitHub Actions workflow builds a production-only site from `main`, using the asset manifest
instead of uploading the complete development directory. Original book images
and active story/atlas assets remain unchanged; experiments are not bundled into
the published site.
There is no separate Pages branch or ZIP download required for reading.

To read locally, open `docs/index.html` in a browser.

## Development and Asset Storage

```sh
npm ci
npm test
npm run build:pages
```

Production assets still stay in this legacy Git history; they are not copied to
the lightweight Pages repository. Non-production assets use the Hugging Face bucket
recorded in `assets/manifest.json`, with content hashes and verified restoration.
Source code, generation recipes, provenance, and the manifest remain versioned.
The production build does not require Hugging Face credentials or make readers
download anything from the archive.

Use `npm run assets:sync -- --dry-run` to inspect changes, `npm run assets:sync`
to back up and migrate verified archive assets, and `npm run assets:pull` to
restore missing review/authoring assets. The sync command does not commit, push,
delete working files, or rewrite history. [Storage workflow](assets/README.md).
