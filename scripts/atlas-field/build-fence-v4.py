#!/usr/bin/env python3
"""Derive the authorized fence-only v4 occupancy, then use the existing SDF baker."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import subprocess
import sys

import numpy as np
from PIL import Image

ROI = (1210, 735, 1300, 812)
POST_BASES = ((1224, 807), (1241, 790), (1286, 766))


def record(path):
    data = path.read_bytes()
    return {'path': str(path.resolve()), 'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest()}


def write_json(path, value):
    with path.open('x') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True, help='Fence-v4 working directory on mini')
    parser.add_argument('--prompt', type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    shared = root.parent
    baker_path = Path(__file__).with_name('build-ground-sdf.py')
    spec = importlib.util.spec_from_file_location('baker', baker_path)
    baker = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(baker)
    raw = root / 'source/generated-mask.png'
    previous = shared / 'reviewed/shire-ground-mask-v3.png'
    previous_sdf = shared / 'reviewed/shire-ground-sdf-v3.png'
    map_path = shared / 'source/map.png'
    preserved = {p.name: record(p) for p in (raw, previous, previous_sdf, map_path)}

    payload = raw.read_bytes()
    if payload[:8] != b'\x89PNG\r\n\x1a\n' or payload[12:16] != b'IHDR':
        raise ValueError('Generated payload is not PNG with an IHDR header')
    if struct.unpack('>II', payload[16:24]) != baker.WORLD:
        raise ValueError('Generated PNG header dimensions do not match the registered atlas')
    with Image.open(raw) as image:
        image.verify()
    with Image.open(raw) as image:
        if image.size != baker.WORLD or image.format != 'PNG':
            raise ValueError('Decoded image dimensions/format differ')
        if not np.all(np.asarray(image.convert('RGBA'))[..., 3] == 255):
            raise ValueError('Generated image must be opaque')
        generated = np.asarray(image.convert('L')) >= 128
    old = baker.read_mask(previous)
    x0, y0, x1, y1 = ROI
    inside = np.zeros(old.shape, dtype=bool)
    inside[y0:y1, x0:x1] = True
    walk = old.copy()
    walk[inside] = generated[inside]
    assert np.array_equal(walk[~inside], old[~inside])
    for x, y in POST_BASES:
        assert not old[y, x] and not walk[y, x], f'Post base opened: {(x, y)}'
    assert walk[772, 1260], 'Requested under-rail target is still blocked'

    derived = root / 'derived'
    derived.mkdir(parents=True, exist_ok=False)
    mask_input = derived / 'fence-roi-classified-v4.png'
    Image.fromarray(walk.astype(np.uint8) * 255).save(mask_input, optimize=True)
    derivation = {
        'version': 4, 'kind': 'versioned numerical occupancy derivation',
        'roi_xyxy': ROI, 'roi_convention': 'half-open: 1210 <= x < 1300; 735 <= y < 812',
        'classification': 'Pillow convert L; L/255 >= 0.5 (L>=128) is walkable',
        'composition': 'copy v3 binary occupancy; replace only ROI with classified raw generation',
        'geometry_processing': 'no resize, blur, morphology, manual carving, or source-image alteration',
        'raw': preserved[raw.name], 'previous_mask': preserved[previous.name],
        'previous_sdf': preserved[previous_sdf.name], 'registered_map': preserved[map_path.name],
        'exact_prompt': args.prompt.read_text(), 'prompt': record(args.prompt),
        'recipe': record(Path(__file__)), 'baker': record(baker_path),
        'derived_mask': record(mask_input),
        'outside_mask_changed_pixels': int(np.count_nonzero(walk[~inside] != old[~inside])),
        'outside_occupancy_bytes_sha256': hashlib.sha256((walk[~inside].astype(np.uint8) * 255).tobytes()).hexdigest(),
        'ignored_raw_classification_changes_outside_roi': int(np.count_nonzero(generated[~inside] != old[~inside])),
        'changed_pixels_inside_roi': int(np.count_nonzero(walk != old)),
        'opened_pixels': int(np.count_nonzero(walk & ~old)),
        'closed_pixels': int(np.count_nonzero(old & ~walk)),
        'preserved_post_base_probes_xy': POST_BASES,
    }
    derivation_path = derived / 'occupancy-derivation-v4.json'
    write_json(derivation_path, derivation)
    history = ('Main supplied one imagegen EDIT, raw PNG preserved unchanged. Explicitly authorized '
               'numerical occupancy derivation: classify generated L/255 >= 0.5 only within '
               'half-open ROI [1210,735,1300,812]; copy v3 occupancy outside byte-for-byte. '
               'See occupancy-derivation-v4.json for source hashes, prompt and ROI evidence. '
               'The existing baker consumes this binary derived input without further classification.')
    command = [sys.executable, str(baker_path), '--source-dir', str(root / 'source'),
               '--mask', str(mask_input), '--version', '4', '--map', str(map_path),
               '--prompt', str(args.prompt), '--history', history,
               '--out-dir', str(root / 'output'), '--diagnostics', str(root / 'diagnostics')]
    for path in (raw, previous, previous_sdf, derivation_path, Path(__file__)):
        command += ['--provenance', str(path)]
    result = subprocess.run(command, capture_output=True, text=True)
    (root / 'bake.log').write_text(result.stdout + result.stderr)
    result.check_returncode()

    meta_path = root / 'output/shire-ground-sdf-v4.json'
    meta = json.loads(meta_path.read_text())
    output_mask = root / 'output/shire-ground-mask-v4.png'
    output_sdf = root / 'output/shire-ground-sdf-v4.png'
    actual = baker.read_mask(output_mask)
    with Image.open(output_sdf) as image:
        distance = baker.decode(np.asarray(image.convert('RGB')))
    with Image.open(previous_sdf) as image:
        previous_distance = baker.decode(np.asarray(image.convert('RGB')))
    failures = list(meta['acceptance_failures'])
    checks = {}

    def check(name, passed, details=None):
        checks[name] = {'passed': bool(passed), 'details': details}
        if not passed:
            failures.append(name)

    check('derived_mask_matches_output', np.array_equal(actual, walk))
    check('outside_roi_occupancy_byte_identical', np.array_equal(actual[~inside], old[~inside]))
    check('roi_exactly_generated_classification', np.array_equal(actual[inside], generated[inside]))
    check('target_1260_772_at_3px', distance[772, 1260] >= 3, float(distance[772, 1260]))
    check('post_bases_blocked', all(distance[y, x] < 0 for x, y in POST_BASES),
          [{'xy': [x, y], 'distance_px': float(distance[y, x])} for x, y in POST_BASES])
    passage = (1210, 735, 1300, 812)
    check('under_rail_connected_at_3px', baker.connected(distance, passage, (1260, 795), (1260, 750), 3))
    bx0, by0, bx1, by1 = baker.PASSAGES['bridge'][0]
    check('bridge_sdf_unchanged', np.array_equal(distance[by0:by1, bx0:bx1], previous_distance[by0:by1, bx0:bx1]))
    water = ['lake', 'stream', 'lake_visible_under_canopy', 'lake_visible_under_canopy_second']
    check('water_probes_unchanged_and_blocked', all(
        distance[y, x] == previous_distance[y, x] and distance[y, x] < 0
        for x, y in (baker.PROBES[name] for name in water)))
    check('raw_v3_and_source_unchanged', all(record(Path(v['path'])) == v for v in preserved.values()))
    validation = {
        'checks': checks, 'failures': failures,
        'sdf_changed_pixels_outside_roi': int(np.count_nonzero(distance[~inside] != previous_distance[~inside])),
        'sdf_note': 'EDT is recomputed globally; distance changes outside the ROI are legitimate, occupancy changes are not',
        'artifacts': {'mask': record(output_mask), 'sdf': record(output_sdf)},
    }
    meta['occupancy_derivation'] = derivation
    meta['fence_v4_validation'] = validation
    meta['acceptance_failures'] = failures
    meta['status'] = ('candidate; numerical checks passed; browser validation pending' if not failures
                      else 'candidate; NOT runtime-ready: numerical acceptance failures')
    meta_path.write_text(json.dumps(meta, indent=2) + '\n')
    write_json(root / 'validation.json', validation)
    print(json.dumps({'derivation': derivation, 'validation': validation,
                      'passages': meta['validation']['passages']}, indent=2))
    if failures:
        raise SystemExit('Fence v4 acceptance failed; runtime must remain on v3')


if __name__ == '__main__':
    main()
