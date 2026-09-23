"""Offline QC for this bounded 25-frame sprite trial, never modifying inputs."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
from importlib.metadata import version

import numpy as np
from PIL import Image

from detector import detect, repair, settings_record
from evidence import crop_evidence, encode
from review import reviewed_candidates


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--native', type=Path, required=True)
    parser.add_argument('--frames', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--ffmpeg', default='/opt/homebrew/bin/ffmpeg')
    parser.add_argument('--apply-reviewed', nargs='+', default=[], metavar='CANDIDATE_ID',
                        help='Apply ONLY these explicitly reviewed candidates; default is detection-only')
    parser.add_argument('--review-record', type=Path,
                        help='JSON binding reviewer rationale and selected IDs to exact input hashes')
    parser.add_argument('--verify-existing', action='store_true',
                        help='Recompute with final code, compare saved pixels, refresh evidence only')
    return parser.parse_args(argv)


def main():
    args = parse_args()
    if args.verify_existing and not args.apply_reviewed:
        raise ValueError('Verifying a repair also requires explicit reviewed selection')
    assert args.verify_existing or not args.out.exists() or not any(args.out.iterdir()), 'Output must be new or empty'
    assert args.out.resolve() != args.frames.resolve()
    native_hash = digest(args.native)
    assert native_hash == '7ca187118f003e7b0d7ace3a16fa5f0bc03eead0115c4adee1f0428c92495877'
    paths = sorted(args.frames.glob('*.png'))
    assert [p.name for p in paths] == [f'{i:03d}.png' for i in range(25)]
    hashes = [digest(p) for p in paths]
    batch_path = args.frames.parent/'batch.json'
    batch = json.loads(batch_path.read_text())
    expected = {Path(e['path']).name: e['sha256'] for e in batch['outputs']}
    assert batch['source_sha256'] == native_hash and len(expected) == 25
    assert hashes == [expected[p.name] for p in paths], 'RGBA inputs differ from the original batch record'
    arrays = []
    for path in paths:
        with Image.open(path) as image:
            assert image.mode == 'RGBA' and image.size == (1280, 720)
            arrays.append(np.array(image))
    rgba = np.stack(arrays)
    del arrays
    # Maximum 26 decoded frames bounds the buffer; reject anything except this 25-frame input.
    raw = subprocess.check_output([args.ffmpeg, '-v', 'error', '-i', str(args.native),
        '-frames:v', '26', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
    assert len(raw) == 25*1280*720*3
    native = np.frombuffer(raw, dtype=np.uint8).reshape(25, 720, 1280, 3)
    records, strong = detect(native, rgba)
    review = json.loads(args.review_record.read_text()) if args.review_record else None
    selected = reviewed_candidates(strong, args.apply_reviewed, review, native_hash, hashes)
    print(json.dumps({'candidates': len(records), 'repair_candidates': [r for r, _ in strong],
                      'selected_ids': args.apply_reviewed}), flush=True)
    args.out.mkdir(exist_ok=True)
    authorization = {'selected_ids': args.apply_reviewed, 'review_record': review,
        'review_record_sha256': digest(args.review_record) if args.review_record else None,
        'input_batch_sha256': digest(batch_path), 'default_detection_only': not bool(selected)}
    if not selected:
        record = {'native_sha256': native_hash, 'input_frame_sha256': hashes, 'settings': settings_record(),
            'candidates': records, 'authorization': authorization, 'repairs': [], 'outputs': [],
            'changed_pixels': 0, 'input_unchanged': digest(args.native) == native_hash and
                [digest(p) for p in paths] == hashes, 'paid_api_calls': 0,
            'code_sha256': {p.name: digest(p) for p in sorted(Path(__file__).parent.glob('*.py'))}}
        (args.out/'qc.json').write_text(json.dumps(record, indent=2)+'\n')
        print('Detection only: no RGBA files modified or generated; no repair applied', flush=True)
        return
    corrected, repairs = repair(native, rgba, selected)
    if not args.verify_existing:
        (args.out/'rgba-frames').mkdir()
        (args.out/'masks').mkdir()
    changes, outputs = [], []
    for index, (before, after) in enumerate(zip(rgba, corrected)):
        changed = np.any(before != after, axis=2)
        output = args.out/'rgba-frames'/f'{index:03d}.png'
        if args.verify_existing:
            np.testing.assert_array_equal(np.asarray(Image.open(output)), after)
            if changed.any():
                np.testing.assert_array_equal(np.asarray(Image.open(args.out/'masks'/f'{index:03d}.png')),
                                              changed.astype(np.uint8)*255)
            else:
                assert digest(output) == hashes[index]
        elif changed.any():
            Image.fromarray(after).save(output)
            Image.fromarray(changed.astype(np.uint8)*255).save(args.out/'masks'/f'{index:03d}.png')
        else:
            shutil.copyfile(paths[index], output)
            assert digest(output) == hashes[index]
        changes.append({'frame': index, 'changed_pixels': int(changed.sum()),
            'outside_mask_exact_rgba': bool(np.array_equal(before[~changed], after[~changed])),
            'unchanged_file_bytes': digest(output) == hashes[index]})
        outputs.append({'path': str(output.relative_to(args.out)), 'sha256': digest(output)})
    if not args.verify_existing:
        for record, _ in selected:
            index = record['frame']
            crop_evidence(native[index], rgba[index], corrected[index], record,
                          args.out/f'{record["id"]}-before-after.png')
        encode(corrected, (24, 24, 28), args.out/'corrected-dark.mp4', args.ffmpeg)
        encode(corrected, (40, 155, 70), args.out/'corrected-green.mp4', args.ffmpeg)
    assert digest(args.native) == native_hash
    assert [digest(p) for p in paths] == hashes
    record = {'native_sha256': native_hash, 'input_frame_sha256': hashes, 'settings': settings_record(),
        'authorization': authorization,
        'candidates': records, 'repairs': repairs, 'changes': changes, 'outputs': outputs,
        'versions': {p: version(p) for p in ('numpy', 'scipy', 'pymatting', 'pillow')},
        'confidence_warning': 'Rule-based evidence labels, not calibrated probabilities or semantic proof',
        'paid_api_calls': 0, 'input_unchanged': True, 'frames': 25, 'fps': 24,
        'temporal_smoothing_or_retiming': False}
    record['code_sha256'] = {p.name: digest(p) for p in sorted(Path(__file__).parent.glob('*.py'))}
    record['recomputed_pixels_match_saved_outputs'] = args.verify_existing
    record['evidence_sha256'] = {str(p.relative_to(args.out)): digest(p)
                                for p in sorted(args.out.rglob('*'))
                                if p.is_file() and p.name != 'qc.json'}
    (args.out/'qc.json').write_text(json.dumps(record, indent=2)+'\n')
    print(json.dumps({'complete': True, 'repairs': repairs, 'out': str(args.out)}), flush=True)


if __name__ == '__main__':
    main()
