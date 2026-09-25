#!/usr/bin/env python3
"""Compile reviewed 2D instance/contact proposals into discrete GPU data textures."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_rgb(path, size):
    with Image.open(path) as image:
        if image.size != tuple(size):
            raise ValueError(f"Registration dimensions: {path}: {image.size} != {size}")
        rgba = np.asarray(image.convert("RGBA"))
    if np.any(rgba[:, :, 3] != 255):
        raise ValueError(f"Nonopaque source: {path}")
    return rgba[:, :, :3]


def classify(rgb, palette, max_error=48, max_unknown_fraction=0.01):
    """Nearest RGB palette; residual rejection never moves image geometry."""
    colors = np.asarray(palette, dtype=np.float32)
    if colors.ndim != 2 or colors.shape[1] != 3 or not 2 <= len(colors) <= 256:
        raise ValueError("Need 2..256 RGB palette colors")
    if not np.isfinite(colors).all() or np.any(colors < 0) or np.any(colors > 255):
        raise ValueError("Invalid palette values")
    if len(np.unique(colors, axis=0)) != len(colors) or np.any(colors[0] != 0):
        raise ValueError("Palette must be unique and begin with black open land")
    labels = np.zeros(rgb.shape[:2], dtype=np.uint8)
    best = np.full(rgb.shape[:2], np.inf, dtype=np.float32)
    pixels = rgb.astype(np.float32)
    for index, color in enumerate(colors):
        distance = np.sum((pixels - color) ** 2, axis=2)
        closer = distance < best
        labels[closer] = index
        best[closer] = distance[closer]
    residual = np.sqrt(best)
    unknown = residual > max_error
    stats = {"unknownPixels": int(unknown.sum()), "unknownFraction": float(unknown.mean()),
             "maxResidualRgb": float(residual.max()), "p99ResidualRgb": float(np.percentile(residual, 99))}
    if stats["unknownFraction"] > max_unknown_fraction:
        raise ValueError(f"Palette residual exceeds allowed fraction: {stats}")
    return labels, stats


def discover_palette(rgb, reserved, count=48):
    """Pillow median-cut suggests colors; returned palette is not visual approval."""
    image = Image.fromarray(rgb).quantize(colors=count, method=Image.Quantize.MEDIANCUT)
    raw = np.asarray(image.getpalette(), dtype=np.uint8).reshape(-1, 3)
    colors = [[0, 0, 0]] + [list(color) for color in reserved]
    for _, index in sorted(image.getcolors(), reverse=True):
        color = raw[index].astype(int)
        if color.max() < 96 or color.max() - color.min() < 64:
            continue
        if min(np.linalg.norm(color - np.asarray(other)) for other in colors) >= 64:
            colors.append(color.tolist())
    return colors


def split_instances(labels, entries, min_pixels=12, fill_holes=False, fragment_radius=0):
    result = np.zeros(labels.shape, dtype=np.uint8)
    instances, removed, filled = [], 0, 0
    for palette_index, entry in enumerate(entries, 1):
        selected = labels == palette_index
        primary = None
        if "primaryBox" in entry:
            x0, y0, x1, y1 = entry["primaryBox"]
            primary = np.zeros_like(selected)
            primary[y0:y1, x0:x1] = selected[y0:y1, x0:x1]
            selected = selected & ~primary
        if entry.get("split", False) or primary is not None:
            components, count = ndimage.label(selected, structure=np.ones((3, 3)))
        else:
            components, count = selected.astype(np.uint8), 1
        supports = [(components == component, f"-{component}") for component in range(1, count + 1)]
        if primary is not None:
            supports.insert(0, (primary, ""))
        for support, suffix in supports:
            area = int(support.sum())
            if area < min_pixels:
                removed += area
                continue
            ident = len(instances) + 1
            if ident > 255:
                raise ValueError("More than 255 instances; inspect palette/components")
            if entry.get("fillEnclosedHoles", fill_holes):
                holes = ndimage.binary_fill_holes(support) & ~support & (labels == 0) & (result == 0)
                hole_ids, _ = ndimage.label(holes)
                sizes = np.bincount(hole_ids.ravel())
                allowed = sizes <= entry.get("maxHolePixels", 64)
                allowed[0] = False
                added = allowed[hole_ids]
                filled += int(added.sum())
                support = support | added
                area = int(support.sum())
            y, x = np.where(support)
            item = {**entry, "id": ident, "pixels": area,
                    "bbox": [int(x.min()), int(y.min()), int(x.max()) + 1, int(y.max()) + 1]}
            if entry.get("split", False) or primary is not None:
                item["name"] = entry["name"] + suffix
            if primary is not None and suffix:
                item["contact"] = "root-bottom"
                item.pop("front", None)
            instances.append(item)
            result[support] = ident
    missing = [entry["name"] for entry in entries if entry.get("required", True)
               and not any(item["name"] == entry["name"] or item["name"].startswith(entry["name"] + "-") for item in instances)]
    if missing:
        raise ValueError(f"Required instances absent: {missing}")
    reassigned = 0
    if fragment_radius > 0 and np.any(result):
        distance, nearest = ndimage.distance_transform_edt(result == 0, return_indices=True)
        nearest_ids = result[tuple(nearest)]
        foreground_components, _ = ndimage.label(labels != 0, structure=np.ones((3, 3)))
        same_component = foreground_components == foreground_components[tuple(nearest)]
        fragments = (labels != 0) & (result == 0) & (distance <= fragment_radius) & same_component
        result[fragments] = nearest_ids[fragments]
        reassigned = int(fragments.sum())
        for item in instances:
            y, x = np.where(result == item["id"])
            item["pixels"] = len(x)
            item["bbox"] = [int(x.min()), int(y.min()), int(x.max()) + 1, int(y.max()) + 1]
    return result, instances, {"removedSmallComponentPixels": removed - reassigned,
                               "reassignedPaletteFragmentPixels": reassigned, "filledEnclosedPixels": filled}


def front_profile(ids, item, height, footprints=None):
    width = ids.shape[1]
    mode = item.get("contact", "external")
    if mode in ("external", "support-line"):
        knots = np.asarray(item.get("front", []), dtype=float)
        if knots.ndim != 2 or knots.shape[1] != 2 or len(knots) < 1 or not np.isfinite(knots).all():
            raise ValueError(f"Missing/invalid reviewed front curve: {item['name']}")
        xs, ys = knots.T
        if np.any(np.diff(xs) <= 0) or np.any(xs < 0) or np.any(xs > width):
            raise ValueError("Front X values must ascend within world")
    elif mode == "root-bottom":
        rows, cols = np.where(ids == item["id"])
        quantile = item.get("rootQuantile", 1.0)
        if not 0.95 <= quantile <= 1:
            raise ValueError("rootQuantile must be in [0.95,1]")
        xs = np.asarray([float(np.median(cols)) + 0.5])
        ys = np.asarray([float(np.quantile(rows, quantile, method="nearest")) + 0.5])
    elif mode in ("silhouette-bottom", "footprint-bottom"):
        source = ids if mode == "silhouette-bottom" else footprints
        if source is None:
            raise ValueError("Footprint contact mode needs a footprint ID raster")
        rows, cols = np.where(source == item["id"])
        if not len(cols):
            raise ValueError(f"Missing contact support: {item['name']}")
        xs = np.unique(cols)
        ys = ndimage.maximum(rows + 0.5, labels=cols, index=xs)
        xs = xs + 0.5
    else:
        raise ValueError(f"Unknown contact mode: {mode}")
    if np.any(ys < 0) or np.any(ys > height):
        raise ValueError("Front Y outside world")
    return np.interp(np.arange(width) + 0.5, xs, ys)


def textures(ids, instances, footprints=None):
    height, width = ids.shape
    mask = np.zeros((height, width, 4), dtype=np.uint8)
    mask[:, :, 0], mask[:, :, 1], mask[:, :, 3] = ids, (ids != 0).astype(np.uint8) * 255, 255
    lut = np.zeros((256, width, 4), dtype=np.uint8)
    lut[:, :, 3] = 255
    for item in instances:
        encoded = np.rint(front_profile(ids, item, height, footprints) * 16).astype(np.uint16)
        lut[item["id"], :, 0] = encoded >> 8
        lut[item["id"], :, 1] = encoded & 255
        lut[item["id"], :, 2] = 255
    return mask, lut


def check_registration(ids, instances, checks):
    by_name = {item["name"]: item for item in instances}
    for probe in checks.get("probes", []):
        x, y = probe["pixel"]
        expected = 0 if probe["instance"] == "open" else by_name[probe["instance"]]["id"]
        if not (0 <= x < ids.shape[1] and 0 <= y < ids.shape[0]) or int(ids[y, x]) != expected:
            raise ValueError(f"Registration probe failed: {probe}")
    for name, limits in checks.get("instances", {}).items():
        item = by_name[name]
        if "area" in limits and not limits["area"][0] <= item["pixels"] <= limits["area"][1]:
            raise ValueError(f"Area drift: {name}")
        if "bbox" in limits:
            tolerance = limits.get("tolerance", 0)
            if max(abs(a - b) for a, b in zip(item["bbox"], limits["bbox"])) > tolerance:
                raise ValueError(f"Bounding-box drift: {name}")


def exclusive_png(path, pixels):
    with Path(path).open("xb") as stream:
        Image.fromarray(pixels).save(stream, format="PNG")


def bake(mask_path, map_path, spec_path, output, name, diagnostics, footprint_path=None):
    config = json.loads(Path(spec_path).read_text())
    size = config.get("world", [1536, 1024])
    if size != [1536, 1024]:
        raise ValueError("Production compilation requires full 1536x1024 world")
    source, reference = read_rgb(mask_path, size), read_rgb(map_path, size)
    entries = config["instances"]
    palette = [[0, 0, 0]] + [entry["color"] for entry in entries]
    if config.get("discoverComponents"):
        palette = discover_palette(source, palette[1:], config.get("paletteCount", 48))
        entries = entries + [{"name": f"component-color-{i}", "color": color, "split": True,
                              "required": False, "contact": config.get("componentContact", "external"),
                              "rootQuantile": config.get("rootQuantile", 1.0), "class": "unreviewed-component"}
                             for i, color in enumerate(palette[len(entries) + 1:], len(entries) + 1)]
    labels, residual = classify(source, palette, config.get("maxPaletteError", 48),
                                config.get("maxUnknownFraction", 0.01))
    ids, instances, modifications = split_instances(labels, entries, config.get("minComponentPixels", 12),
                                                   config.get("fillEnclosedHoles", False),
                                                   config.get("fragmentReassignRadius", 0))
    overrides = config.get("contacts", {})
    for item in instances:
        item.update(overrides.get(item["name"], {}))
    check_registration(ids, instances, config.get("registration", {}))
    output, diagnostics = Path(output), Path(diagnostics)
    output.mkdir(parents=True, exist_ok=True)
    diagnostics.mkdir(parents=True, exist_ok=True)
    version = config.get("version", "v1")
    paths = {kind: output / f"{name}-{kind}-{version}.png" for kind in ("instances", "ground")}
    meta_path = output / f"{name}.json"
    if any(path.exists() for path in [*paths.values(), meta_path]):
        raise ValueError("Refusing to overwrite versioned output")
    # Diagnostic discovery is saved before missing contact curves reject the bake.
    proposal = diagnostics / f"{name}-components.json"
    with proposal.open("x") as stream:
        json.dump({"instances": instances, "palette": palette, "residual": residual}, stream, indent=2)
    overlay = reference.copy()
    selected = ids != 0
    overlay[selected] = np.rint(reference[selected] * 0.5 + source[selected] * 0.5).astype(np.uint8)
    exclusive_png(diagnostics / f"{name}-overlay.png", overlay)
    for label, box in config.get("diagnosticCrops", {}).items():
        with Image.fromarray(overlay).crop(box) as crop:
            with (diagnostics / f"{name}-{label}.png").open("xb") as stream:
                crop.resize((crop.width * 3, crop.height * 3), Image.Resampling.NEAREST).save(stream, format="PNG")
    footprints = None
    if footprint_path:
        # Footprint raster is already encoded R=final ID, G/B=0, opaque.
        footprint = read_rgb(footprint_path, size)
        if np.any(footprint[:, :, 1:]) or not set(np.unique(footprint[:, :, 0])).issubset({0, *[i["id"] for i in instances]}):
            raise ValueError("Footprint raster must use final discrete R-channel IDs")
        footprints = footprint[:, :, 0]
    mask, lut = textures(ids, instances, footprints)
    exclusive_png(paths["instances"], mask)
    exclusive_png(paths["ground"], lut)
    inputs = {"mask": mask_path, "map": map_path, "spec": spec_path, "compiler": __file__}
    if footprint_path:
        inputs["footprint"] = footprint_path
    metadata = {"schema": "atlas-instance-front-v1", "world": size, "status": "candidate-unaccepted",
                "units": "world pixels, centers x+0.5/y+0.5", "instances": instances,
                "encoding": {"instances": "R=id,G=binary coverage,B=0,A=255",
                             "front": "1536x256,row=id,RG=uint16BE round(frontY*16),B=valid255,A=255",
                             "filter": "nearest, linear data not sRGB, no mipmaps", "scale": 16,
                             "outsideContactX": "constant endpoint extension", "foreground": "footY>=frontY"},
                "quantization": {**residual, "method": "nearest RGB palette; optional logged small-hole fill and component removal",
                                 "minComponentPixels": config.get("minComponentPixels", 12),
                                 **modifications, "fragmentReassignRadius": config.get("fragmentReassignRadius", 0),
                                 "fillEnclosedHoles": config.get("fillEnclosedHoles", False),
                                 "coverage": "binary, not material alpha"},
                "registration": {"checks": config.get("registration", {}), "numericPassed": True,
                                 "visualApproved": False, "metric3D": False},
                "inputs": {key: {"path": str(path), "sha256": digest(path)} for key, path in inputs.items()},
                "outputs": {key: {"path": str(path), "sha256": digest(path)} for key, path in paths.items()}}
    with meta_path.open("x") as stream:
        json.dump(metadata, stream, indent=2, allow_nan=False)
        stream.write("\n")
    return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("mask", "map", "spec", "output", "name", "diagnostics"):
        parser.add_argument("--" + flag, required=True)
    parser.add_argument("--footprint")
    args = parser.parse_args()
    if Path(args.name).name != args.name or args.name in (".", ".."):
        parser.error("name must be a plain versioned filename stem")
    result = bake(args.mask, args.map, args.spec, args.output, args.name, args.diagnostics, args.footprint)
    print(json.dumps({"status": result["status"], "instances": len(result["instances"]), "outputs": result["outputs"]}))


if __name__ == "__main__":
    main()
