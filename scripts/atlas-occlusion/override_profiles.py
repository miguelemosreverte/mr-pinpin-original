#!/usr/bin/env python3
"""Preview/bake new authored support rows without touching an immutable ID mask."""
import argparse
import copy
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from compile_instances import digest, exclusive_png, front_profile
from validate_textures import validate


def amend(base_path, spec_path):
    base = json.loads(Path(base_path).read_text())
    spec = json.loads(Path(spec_path).read_text())
    _, mask, old_front = validate(base_path)
    with Image.open(base["outputs"]["ground"]["path"]) as image:
        lut = np.asarray(image).copy()
    metadata = copy.deepcopy(base)
    remaining = set(spec["instances"])
    changed = []
    for item in metadata["instances"]:
        if item["name"] not in remaining:
            continue
        change = spec["instances"][item["name"]]
        if set(change) - {"contact", "front", "class", "authoring"}:
            raise ValueError("Override may change contacts, not IDs/segmentation")
        item.update(change)
        profile = front_profile(mask[:, :, 0], item, metadata["world"][1])
        encoded = np.rint(profile * 16).astype(np.uint16)
        lut[item["id"], :, 0] = encoded >> 8
        lut[item["id"], :, 1] = encoded & 255
        changed.append(item["id"])
        remaining.remove(item["name"])
    if remaining:
        raise ValueError(f"Unknown instance names: {remaining}")
    metadata["status"] = "candidate-support-profile-awaiting-runtime-acceptance"
    metadata["profileRevision"] = {"version": spec["version"], "method": spec["method"],
                                    "changedIds": changed, "maskUnchanged": True,
                                    "baseSidecarSha256": digest(base_path)}
    metadata["inputs"]["supportSpec"] = {"path": str(spec_path), "sha256": digest(spec_path)}
    metadata["inputs"]["supportCompiler"] = {"path": __file__, "sha256": digest(__file__)}
    metadata["inputs"]["supportProfileFunction"] = {
        "path": str(Path(__file__).with_name("compile_instances.py")),
        "sha256": digest(Path(__file__).with_name("compile_instances.py"))}
    return metadata, mask, old_front, lut


def preview(metadata, old_front, lut, output):
    with Image.open(metadata["inputs"]["map"]["path"]) as image:
        image = image.convert("RGB")
    draw = ImageDraw.Draw(image)
    front = (lut[:, :, 0].astype(np.uint16) * 256 + lut[:, :, 1]) / 16
    for item in metadata["instances"]:
        if item["id"] not in metadata["profileRevision"]["changedIds"]:
            continue
        left, top, right, bottom = item["bbox"]
        x0, x1 = max(0, left - 12), min(image.width, right + 12)
        draw.line([(x, float(old_front[item["id"], x])) for x in range(x0, x1)], fill=(255, 50, 120), width=1)
        draw.line([(x, float(front[item["id"], x])) for x in range(x0, x1)], fill=(0, 255, 200), width=2)
        for x, y in item["front"]:
            draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(255, 255, 255))
        box = (max(0, left - 35), max(0, top - 20), min(image.width, right + 35), min(image.height, bottom + 30))
        crop = image.crop(box)
        exclusive_png(Path(output) / f"{item['name']}-support-v2-overlay.png",
                      np.asarray(crop.resize((crop.width * 4, crop.height * 4), Image.Resampling.NEAREST)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--spec", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--bake", action="store_true")
    args = parser.parse_args()
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    metadata, _, old_front, lut = amend(args.base, args.spec)
    version = metadata["profileRevision"]["version"]
    if not version.isalnum():
        parser.error("Version must be an alphanumeric filename token")
    if args.bake:
        ground_path = output / f"shire-object-ground-{version}.png"
        spec_path = output / f"shire-object-occlusion-{version}.json"
        if ground_path.exists() or spec_path.exists():
            raise ValueError("Versioned output already exists")
        exclusive_png(ground_path, lut)
        metadata["outputs"]["ground"] = {"path": str(ground_path), "sha256": digest(ground_path)}
        with spec_path.open("x") as stream:
            json.dump(metadata, stream, indent=2, allow_nan=False)
            stream.write("\n")
        print(json.dumps({"ground": str(ground_path), "sidecar": str(spec_path), "maskUnchanged": True}))
    else:
        preview(metadata, old_front, lut, output)
        print(json.dumps({"preview": str(output), "baked": False}))


if __name__ == "__main__":
    main()
