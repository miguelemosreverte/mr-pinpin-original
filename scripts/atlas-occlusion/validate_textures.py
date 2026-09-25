#!/usr/bin/env python3
"""Validate baked byte contracts and authored ordering probes without a renderer."""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from compile_instances import digest


def validate(metadata_path, texture_dir=None, probes=None):
    metadata = json.loads(Path(metadata_path).read_text())
    arrays = {}
    for name, item in metadata["outputs"].items():
        path = Path(texture_dir) / Path(item["path"]).name if texture_dir else Path(item["path"])
        if digest(path) != item["sha256"]:
            raise ValueError(f"Output checksum mismatch: {path}")
        with Image.open(path) as image:
            if image.mode != "RGBA":
                raise ValueError(f"Expected opaque RGBA bytes: {path}")
            arrays[name] = np.asarray(image)
    mask, lut = arrays["instances"], arrays["ground"]
    width, height = metadata["world"]
    if mask.shape != (height, width, 4) or lut.shape != (256, width, 4):
        raise ValueError("Texture dimensions disagree with contract")
    if np.any(mask[:, :, 3] != 255) or np.any(lut[:, :, 3] != 255):
        raise ValueError("Alpha must be 255")
    if np.any(mask[:, :, 2]) or not np.array_equal(mask[:, :, 1], (mask[:, :, 0] != 0).astype(np.uint8) * 255):
        raise ValueError("Invalid ID/coverage encoding")
    ids = {item["id"] for item in metadata["instances"]}
    if set(np.unique(mask[:, :, 0])) - {0} != ids:
        raise ValueError("Instance table and texture IDs disagree")
    for ident in range(256):
        if np.any(lut[ident, :, 2] != (255 if ident in ids else 0)):
            raise ValueError("Invalid LUT validity row")
    front = (lut[:, :, 0].astype(np.uint16) * 256 + lut[:, :, 1]) / 16
    if np.any(front > height):
        raise ValueError("Contact beyond world height")
    by_name = {item["name"]: item for item in metadata["instances"]}
    results = []
    for probe in probes or []:
        item = by_name[probe["instance"]]
        x, y = probe["foot"]
        threshold = float(front[item["id"], int(np.clip(np.floor(x), 0, width - 1))])
        foreground = y >= threshold
        if foreground != probe["foreground"]:
            raise ValueError(f"Ordering probe failed: {probe}, frontY={threshold}")
        results.append({**probe, "frontY": threshold, "signedMargin": y - threshold,
                        "within3PixelRegistrationUncertainty": abs(y - threshold) < 3})
    for item in metadata["instances"]:
        if item["contact"] == "root-bottom" and np.ptp(front[item["id"]]) != 0:
            raise ValueError("Tree root profile must remain constant across canopy")
    return {"numericValid": True, "visualAccepted": False, "instances": len(ids),
            "world": metadata["world"], "orderingProbes": results}, mask, front


def contact_diagnostic(map_path, mask, front, instances, output):
    with Image.open(map_path) as image:
        image = image.convert("RGB")
    draw = ImageDraw.Draw(image)
    for item in instances:
        if item["name"] not in ("house", "tractor", "elder"):
            continue
        x0, _, x1, _ = item["bbox"]
        points = [(x, float(front[item["id"], x])) for x in range(x0, x1)]
        draw.line(points, fill=(255, 0, 255), width=2)
    with Path(output).open("xb") as stream:
        image.save(stream, format="PNG")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("metadata")
    parser.add_argument("--texture-dir")
    parser.add_argument("--probes")
    parser.add_argument("--report")
    parser.add_argument("--contact-diagnostic")
    args = parser.parse_args()
    probes = json.loads(Path(args.probes).read_text()) if args.probes else []
    report, mask, front = validate(args.metadata, args.texture_dir, probes)
    if args.contact_diagnostic:
        metadata = json.loads(Path(args.metadata).read_text())
        contact_diagnostic(metadata["inputs"]["map"]["path"], mask, front, metadata["instances"], args.contact_diagnostic)
    if args.report:
        with Path(args.report).open("x") as stream:
            json.dump(report, stream, indent=2, allow_nan=False)
    print(json.dumps(report))


if __name__ == "__main__":
    main()
