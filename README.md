# Mr. PinPin: Original Book

[Read the complete illustrated book](https://miguelemosreverte.github.io/mr-pinpin-original/).

[Read the new storyboard edition](https://miguelemosreverte.github.io/mr-pinpin-original/storyboard/?chapter=1&lang=ru).
Chapter 1 has five new illustrations and complete Russian, English, and Spanish
text. Later chapters currently show their original Russian text and artwork while
the new edition is developed. Chapter and language are preserved in the URL.

The new edition lives in `docs/storyboard/`. Run `python3 tools/build_book.py`
(requires `lxml`) and `python3 tools/prepare_scenes.py` to rebuild source data.
Both scripts verify that the original narrative is preserved in order.

This repository preserves the original HTML book and all 100 original PNG
illustrations, without compression, resizing, abridgment, or changes to the story.
Mr. PinPin and Mr. PomPom are brothers; this book focuses on Mr. PinPin's origin.

The supplied `MrPinPin.html` is stored as `docs/index.html` so the book opens
directly on GitHub Pages. Its bytes and the image bytes are unchanged from the
original export. The original document layout and font references are preserved.

GitHub Actions publishes the complete `docs/` directory from `main`.
There is no separate Pages branch or ZIP download required for reading.

To read locally, open `docs/index.html` in a browser.
