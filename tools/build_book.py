"""Extract the complete original export into ordered reader data."""

import hashlib
import json
from pathlib import Path
import re
import struct

from lxml import html


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/index.html"
OUTPUT = ROOT / "docs/storyboard/book.json"
HEADING = re.compile(r"^(?:\*\*)?(?:Глава\b|Chapter\b)")


def paragraph_parts(element):
    parts = []

    def text(value):
        if value:
            if parts and parts[-1]["type"] == "text":
                parts[-1]["text"] += value
            else:
                parts.append({"type": "text", "text": value})

    def visit(node):
        text(node.text)
        for child in node:
            if child.tag == "img":
                path = ROOT / "docs" / child.get("src")
                with path.open("rb") as image:
                    header = image.read(24)
                assert header[:8] == b"\x89PNG\r\n\x1a\n", path
                width, height = struct.unpack(">II", header[16:24])
                parts.append({"type": "image", "src": "../" + child.get("src"),
                              "width": width, "height": height})
            elif child.tag == "br":
                text("\n")
            else:
                visit(child)
            text(child.tail)

    visit(element)
    return parts


def build():
    document = html.parse(str(SOURCE))
    chapters = []
    preface = []
    original_paragraphs = document.xpath("//body//p | //body//h1 | //body//h2 | //body//h3")
    for paragraph in original_paragraphs:
        parts = paragraph_parts(paragraph)
        plain = "".join(part["text"] for part in parts if part["type"] == "text")
        if HEADING.match(plain.strip()):
            chapters.append({"id": f"chapter-{len(chapters) + 1:02d}",
                             "title": plain.strip().strip("*"), "heading": plain,
                             "blocks": [[part for part in parts if part["type"] == "image"]]
                             if any(part["type"] == "image" for part in parts) else []})
        elif plain.strip() or any(part["type"] == "image" for part in parts):
            (chapters[-1]["blocks"] if chapters else preface).append(parts)

    images = [part for chapter in chapters for block in chapter["blocks"]
              for part in block if part["type"] == "image"]
    extracted_text = "".join(
        [part["text"] for block in preface for part in block if part["type"] == "text"]
        + [chapter["heading"] + "".join(part["text"] for block in chapter["blocks"]
           for part in block if part["type"] == "text") for chapter in chapters])
    original_text = "".join(element.text_content() for element in original_paragraphs)
    normalize = lambda value: re.sub(r"\s+", "", value)
    assert normalize(extracted_text) == normalize(original_text), "Text was omitted or reordered"
    original_images = ["../" + image.get("src") for image in document.xpath("//img")]
    assert [image["src"] for image in images] == original_images, "Images were omitted or reordered"
    for chapter in chapters:
        chapter["imageCount"] = sum(part["type"] == "image"
                                    for block in chapter["blocks"] for part in block)

    book = {"title": "Мистер Пин-Пин", "language": "ru", "preface": preface,
            "chapters": chapters,
            "source": {"sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                       "chapterCount": len(chapters), "imageOccurrences": len(images),
                       "uniqueImages": len(set(original_images)), "fullTextVerified": True}}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(book, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(book["source"], indent=2))


if __name__ == "__main__":
    build()
