#!/usr/bin/env python3
"""Bake a registered binary ground mask into an opaque, metric RGB SDF.

Requires NumPy, SciPy and Pillow. No art correction, blur, morphology, resampling,
or inferred obstacles. Optional explicit threshold only classifies raw pixels.
"""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
import scipy
from PIL import Image, ImageDraw
from scipy import ndimage

SCALE, BIAS = 16, 32768
WORLD = (1536, 1024)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_mask(path, threshold=None):
    with Image.open(path) as image:
        rgba = np.asarray(image.convert('RGBA'))
        gray = np.asarray(image.convert('L')) if threshold is not None else None
    rgb = rgba[..., :3]
    if not np.all(rgba[..., 3] == 255):
        raise ValueError('Mask must be fully opaque')
    if threshold is not None:
        if not 0 < threshold < 1:
            raise ValueError('Threshold must be between 0 and 1')
        return gray.astype(np.float64) / 255 >= threshold
    if not np.all(rgb == rgb[..., :1]) or not np.all((rgb == 0) | (rgb == 255)):
        raise ValueError('Mask must be binary black/white; no implicit thresholding')
    return rgb[..., 0] == 255


def signed_distance(walk):
    walk = np.asarray(walk, dtype=bool)
    if walk.ndim != 2 or not walk.any() or walk.all():
        raise ValueError('A 2D mask with both classes is required')
    # EDT is exact between pixel centers. Move the zero crossing half a pixel
    # toward each class; this is not an exact polygon-edge distance at corners.
    inside = ndimage.distance_transform_edt(walk)
    outside = ndimage.distance_transform_edt(~walk)
    return np.where(walk, inside - 0.5, 0.5 - outside)


def encode(distance):
    values = np.rint(np.asarray(distance) * SCALE + BIAS)
    if not np.isfinite(values).all() or np.any((values < 0) | (values > 65535)):
        raise ValueError('Distance exceeds uint16 encoding; refusing saturation')
    values = values.astype(np.uint16)
    return np.stack([(values >> 8).astype(np.uint8),
                     (values & 255).astype(np.uint8),
                     np.zeros(values.shape, dtype=np.uint8)], axis=-1)


def decode(rgb):
    values = rgb[..., 0].astype(np.uint16) * 256 + rgb[..., 1].astype(np.uint16)
    return (values.astype(np.float64) - BIAS) / SCALE


# Bounds constrain each connectivity check to the actual passage, avoiding a
# false pass from a long route around the stream's endpoint or map edge.
PASSAGES = {
    'forest': ((700, 820, 1200, 1010), (730, 880), (1160, 930)),
    'tractor_front': ((1200, 796, 1510, 875), (1240, 835), (1480, 815)),
    'tractor_behind': ((1200, 650, 1510, 741), (1240, 690), (1480, 700)),
    'bridge': ((825, 535, 1110, 685), (845, 630), (1080, 570)),
}
PROBES = {
    'lake': (650, 370), 'stream': (1050, 730), 'house': (300, 675),
    'lake_visible_under_canopy': (445, 320),
    'lake_visible_under_canopy_second': (460, 300),
    'elder_trunk': (1220, 120), 'tractor': (1340, 767),
    'trailer': (1415, 750), 'forest_floor': (980, 900),
    'tractor_front': (1370, 815), 'tractor_behind': (1450, 705),
    'bridge_deck': (965, 605),
}


def connected(distance, bounds, start, end, clearance):
    x0, y0, x1, y1 = bounds
    labels, _ = ndimage.label(distance[y0:y1, x0:x1] >= clearance)
    a, b = labels[start[1] - y0, start[0] - x0], labels[end[1] - y0, end[0] - x0]
    return bool(a != 0 and a == b)


def inspect_field(distance):
    routes = {}
    for name, (bounds, start, end) in PASSAGES.items():
        levels = np.unique(distance[bounds[1]:bounds[3], bounds[0]:bounds[2]])
        levels = levels[levels >= 0]
        lo, hi = 0, len(levels)
        while lo < hi:
            mid = (lo + hi) // 2
            if connected(distance, bounds, start, end, levels[mid]):
                lo = mid + 1
            else:
                hi = mid
        routes[name] = {
            'bounds_xyxy': bounds, 'start_xy': start, 'end_xy': end,
            'start_distance_px': float(distance[start[1], start[0]]),
            'end_distance_px': float(distance[end[1], end[0]]),
            'connected_at_0px': connected(distance, bounds, start, end, 0),
            'connected_at_3px': connected(distance, bounds, start, end, 3),
            'maximum_path_clearance_px': float(levels[lo - 1]) if lo else None,
            'connectivity': '4-neighbor; reverse direction equivalent',
        }
    return {
        'passages': routes,
        'probes': {name: {'xy': xy, 'distance_px': float(distance[xy[1], xy[0]])}
                   for name, xy in PROBES.items()},
    }


def diagnostics(directory, art_path, walk, distance):
    directory.mkdir(parents=True, exist_ok=True)
    with Image.open(art_path) as image:
        art = np.asarray(image.convert('RGB'))
    if art.shape[:2] != walk.shape:
        raise ValueError('Map and mask dimensions differ')
    overlay = art.copy()
    overlay[~walk] = np.rint(art[~walk] * 0.5 + np.array([255, 30, 50]) * 0.5)
    edge = walk != ndimage.binary_erosion(walk, border_value=1)
    overlay[edge] = [0, 255, 255]
    Image.fromarray(overlay).save(directory / 'map-mask-overlay.png')
    gray = np.rint(128 + np.clip(distance / 64, -1, 1) * 127).astype(np.uint8)
    Image.fromarray(gray).save(directory / 'sdf-grayscale-plusminus64px.png')
    stops = np.array([-64, -18, -3, 0, 3, 18, 64])
    colors = np.array([[90, 0, 25], [225, 40, 60], [255, 160, 90],
                       [255, 255, 255], [100, 225, 225], [20, 165, 160], [0, 70, 75]])
    heat = np.stack([np.interp(distance, stops, colors[:, i]) for i in range(3)], -1)
    heat_image = Image.fromarray(np.rint(heat).astype(np.uint8))
    heat_image.save(directory / 'sdf-heatmap-plusminus64px.png')
    for name, bounds in {'bridge': (835, 550, 1085, 665),
                         'tractor': (1190, 640, 1536, 890),
                         'lake-house': (100, 140, 1040, 735)}.items():
        panels = [Image.fromarray(art).crop(bounds), Image.fromarray(overlay).crop(bounds),
                  heat_image.crop(bounds)]
        width, height = panels[0].size
        sheet = Image.new('RGB', (width * 3, height + 24), 'white')
        draw = ImageDraw.Draw(sheet)
        for index, (panel, label) in enumerate(zip(panels, ['Map', 'Blocked red; edge cyan', 'SDF: red blocked / teal open'])):
            sheet.paste(panel, (index * width, 24))
            draw.text((index * width + 4, 5), label, fill='black')
        sheet.save(directory / f'{name}-comparison.png')
        if name == 'bridge':
            sheet.resize((sheet.width * 4, sheet.height * 4), Image.Resampling.NEAREST).save(
                directory / 'bridge-comparison-4x.png')


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--mask', type=Path, help='Exact binary input PNG; required for versions after v2')
    parser.add_argument('--version', type=int, default=2)
    parser.add_argument('--threshold', type=float,
                        help='Explicit numerical classification of Pillow L/255; e.g. 0.5')
    parser.add_argument('--map', type=Path, help='Registered map; default SOURCE_DIR/map.png')
    parser.add_argument('--prompt', type=Path, help='Exact generation prompt; required after v2')
    parser.add_argument('--history', help='Source generation/processing history; required after v2')
    parser.add_argument('--provenance', type=Path, action='append', default=[],
                        help='Additional reference/raw output/log/spec to preserve; repeatable')
    parser.add_argument('--out-dir', type=Path, required=True)
    parser.add_argument('--diagnostics', type=Path, required=True)
    args = parser.parse_args()
    if args.version < 1:
        parser.error('--version must be a positive integer')
    if args.version != 2 and not all([args.mask, args.prompt, args.history]):
        parser.error('New versions require explicit --mask, --prompt and --history')
    return args


def main():
    args = parse_args()
    source = args.source_dir
    mask_input = args.mask or source / 'walk3.png'
    map_input = args.map or source / 'map.png'
    prompt_input = args.prompt or source / 'prompt3.txt'
    history = args.history or ('Supplied walk3 was imagegen EDIT then ImageMagick grayscale/50% '
                              'threshold to bilevel, per codex3.log. No further segmentation edits.')
    inputs = [mask_input, map_input, prompt_input, *args.provenance]
    if args.version == 2 and args.mask is None:
        inputs += [source / name for name in ['walk.png', 'depth.png', 'codex3.log',
                   'exec-ffac4b09-02a5-4c20-aaa8-7732246c9ce1.png']]
    records = {}
    for path in inputs:
        record = {'sha256': sha256(path), 'bytes': path.stat().st_size,
                  'original_path': str(path.resolve())}
        if path.name in records and records[path.name]['sha256'] != record['sha256']:
            raise ValueError(f'Conflicting provenance filenames: {path.name}')
        records[path.name] = record
    exact_prompt = prompt_input.read_text()
    walk = read_mask(mask_input, args.threshold)
    if walk.shape != (WORLD[1], WORLD[0]):
        raise ValueError(f'Expected full world {WORLD}, got {walk.shape[::-1]}')
    args.out_dir.mkdir(parents=True, exist_ok=True)
    mask_path = args.out_dir / f'shire-ground-mask-v{args.version}.png'
    sdf_path = args.out_dir / f'shire-ground-sdf-v{args.version}.png'
    spec_path = args.out_dir / f'shire-ground-sdf-v{args.version}.json'
    for path in (mask_path, sdf_path, spec_path):
        if path.exists():
            raise FileExistsError(f'Refusing to overwrite versioned artifact: {path}')
    distance = signed_distance(walk)
    rgb = encode(distance)
    # A version-specific directory preserves previous visual reviews and input bytes.
    diagnostic_dir = args.diagnostics / f'v{args.version}'
    if diagnostic_dir.exists():
        raise FileExistsError(f'Refusing to overwrite diagnostics/provenance: {diagnostic_dir}')
    diagnostics(diagnostic_dir, map_input, walk, distance)
    archive = diagnostic_dir / 'source-inputs'
    archive.mkdir()
    for path in inputs:
        shutil.copyfile(path, archive / path.name)
    if args.threshold is None:
        shutil.copyfile(mask_input, mask_path)
    else:
        Image.fromarray(walk.astype(np.uint8) * 255).save(mask_path, optimize=True)
    Image.fromarray(rgb).save(sdf_path, optimize=True)
    validation = inspect_field(distance)
    failures = [f'{name}: disconnected at 3px' for name, route in validation['passages'].items()
                if not route['connected_at_3px']]
    for name in ['lake', 'stream', 'house', 'elder_trunk', 'tractor', 'trailer',
                 'lake_visible_under_canopy', 'lake_visible_under_canopy_second']:
        if validation['probes'][name]['distance_px'] >= 0:
            failures.append(f'{name}: expected blocked')
    for name in ['forest_floor', 'tractor_front', 'tractor_behind', 'bridge_deck']:
        if validation['probes'][name]['distance_px'] <= 3:
            failures.append(f'{name}: expected more than 3px clearance')
    spec = {
        'version': args.version,
        'status': ('candidate; NOT runtime-ready: numerical acceptance failures' if failures
                   else 'candidate; numerical checks passed; visual/runtime acceptance pending'),
        'acceptance_failures': failures,
        'width': WORLD[0], 'height': WORLD[1], 'units': 'full-resolution world pixels',
        'coordinates': 'top-left origin; x right; y down; integer coordinates sample pixel centers',
        'mask': {'src': mask_path.name, 'sha256': sha256(mask_path),
                 'white': 'walkable', 'black': 'blocked',
                 'processing': ('byte-for-byte source copy' if args.threshold is None
                                else 'explicit numerical threshold; no geometry edits'),
                 'threshold': args.threshold,
                 'classification': ('Pillow convert L (8-bit luma), L/255 >= threshold is white; '
                                    'at 0.5: values 128..255 white, 0..127 black')
                                   if args.threshold is not None else 'binary source unchanged'},
        'sdf': {'src': sdf_path.name, 'sha256': sha256(sdf_path),
                'mode': 'RGB PNG; implicit alpha 255; no ICC/gamma profile',
                'encoding': 'uint16 = round(distance * 16 + 32768); R=high byte; G=low byte; B=0',
                'decode': '((R * 256 + G) - 32768) / 16', 'scale': SCALE, 'bias': BIAS,
                'positive': 'walkable', 'negative': 'blocked',
                'rounding': 'nearest, ties to even (numpy.rint)',
                'quantization_px': 1 / SCALE, 'maximum_rounding_error_px': 0.5 / SCALE,
                'representable_range_px': [-2048, 2047.9375], 'saturation': 'none; overflow rejected',
                'actual_range_px': [float(distance.min()), float(distance.max())]},
        'distance_method': {
            'implementation': 'scipy.ndimage.distance_transform_edt', 'scipy_version': scipy.__version__,
            'metric': 'exact Euclidean distance to nearest opposite-class pixel center',
            'boundary_offset_px': 0.5,
            'formula': 'walkable: EDT(walk)-0.5; blocked: 0.5-EDT(blocked)',
            'corner_limit': 'half-pixel offset convention; not exact distance to pixel-square polygon edges',
            'world_edges': 'no padding or invented exterior obstacles; runtime enforces world bounds',
        },
        'runtime_contract': {'src': 'images/atlas/' + sdf_path.name,
                             'scale': SCALE, 'bias': BIAS, 'clearance': 3, 'softRange': 18},
        'counts': {'walkable': int(walk.sum()), 'blocked': int((~walk).sum()),
                   'total': int(walk.size)},
        'source': records,
        'source_mask': mask_input.name,
        'source_map': map_input.name,
        'source_prompt': prompt_input.name,
        'source_archive_directory': str(archive),
        'exact_source_prompt': exact_prompt,
        'source_processing_history': history,
        'baker_sha256': sha256(__file__),
        'diagnostics_directory': str(diagnostic_dir),
        'known_source_limits': [
            *failures,
            'Sparse numerical probes do not prove full semantic correctness or pixel registration; review overlays.',
            'No source corrections are performed by this baker; image generation correction belongs to the main agent.',
        ],
        'validation': validation,
    }
    spec_path.write_text(json.dumps(spec, indent=2) + '\n')
    print(json.dumps({'counts': spec['counts'], 'validation': spec['validation']}, indent=2))


if __name__ == '__main__':
    main()
