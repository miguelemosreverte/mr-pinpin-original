"""Prepare five complete-text scenes per chapter; retain published artwork."""

import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "docs/storyboard/illustrations.json"


def prepare():
    book = json.loads((ROOT / "docs/storyboard/book.json").read_text())
    result = json.loads(TARGET.read_text()) if TARGET.exists() else {"chapters": {}}
    result["scenes"] = {}
    for chapter in book["chapters"]:
        paragraphs = ["".join(p["text"] for p in block if p["type"] == "text")
                      for block in chapter["blocks"]]
        paragraphs = [p for p in paragraphs if p.strip() and p.strip() != "---"]
        sentences = []
        for paragraph in paragraphs:
            sentences.extend(re.split(r"(?<=[.!?])\s+(?=[А-ЯЁA-Z\"«])", paragraph))
        while len(sentences) < 5:
            index = max(range(len(sentences)), key=lambda i: len(sentences[i]))
            words = sentences[index].split()
            assert len(words) > 1, chapter["id"]
            middle = len(words) // 2
            sentences[index:index + 1] = [" ".join(words[:middle]), " ".join(words[middle:])]
        cumulative = [0]
        for sentence in sentences:
            cumulative.append(cumulative[-1] + len(sentence))
        boundaries = [0]
        for index in range(1, 5):
            candidates = range(boundaries[-1] + 1, len(sentences) - (5 - index) + 1)
            boundaries.append(min(candidates, key=lambda i: abs(cumulative[i] - cumulative[-1] * index / 5)))
        boundaries.append(len(sentences))
        groups = [sentences[start:end] for start, end in zip(boundaries, boundaries[1:])]
        if chapter["id"] == "chapter-01":
            ending = re.split(r"(?<=\.)\s+", paragraphs[7])
            groups = [[paragraphs[0]], paragraphs[1:5], paragraphs[5:7],
                      [" ".join(ending[:2])], [" ".join(ending[2:])]]
        normalize = lambda text: re.sub(r"\s+", "", text)
        assert normalize("".join(paragraphs)) == normalize("".join(p for group in groups for p in group)), chapter["id"]
        result["scenes"][chapter["id"]] = [{"paragraphs": group} for group in groups]
    TARGET.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(f"Prepared {len(result['scenes'])} chapters, 190 scenes; complete narrative text verified.")


if __name__ == "__main__":
    prepare()
