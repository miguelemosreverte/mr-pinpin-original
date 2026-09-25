"""Snapshot stable tractor media into a scoped regular-file archive stage on TB4.

This only prepares copies and a manifest. Use the repository HF adapter for
upload and remote verification. Existing media and global catalogs are untouched.
"""
import argparse
import hashlib
import json
import time
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--phase', required=True)
    parser.add_argument('--known', required=True)
    parser.add_argument('--minimum-age', type=int, default=120)
    args = parser.parse_args()
    if not args.phase.replace('-', '').isalnum():
        raise ValueError('Phase must contain only letters, digits and hyphens')
    pack = Path(__file__).resolve().parent
    stage = pack / ('archive-' + args.phase + '-stage')
    prefix = Path('docs/storyboard/production/tractor-stops-20260924')
    known = {(a['path'], a['sha256']) for a in json.loads(Path(args.known).read_text())['assets']}
    files = list((pack / 'stops').rglob('*'))
    for folder in (pack / 'browser-check').glob('source-*'):
        files.extend(folder.rglob('*'))
    assets = []
    for source in sorted(set(files)):
        if source.is_symlink() or not source.is_file():
            continue
        if source.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp', '.mp4'}:
            continue
        relative = source.relative_to(pack)
        if any(part.startswith('frames') for part in relative.parts):
            continue
        before = source.stat()
        if time.time() - before.st_mtime < args.minimum_age:
            continue
        data = source.read_bytes()
        sha = hashlib.sha256(data).hexdigest()
        if source.stat().st_mtime_ns != before.st_mtime_ns:
            continue
        path = prefix / relative
        if (str(path), sha) in known:
            continue
        target = stage / path
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            if hashlib.sha256(target.read_bytes()).hexdigest() != sha:
                raise ValueError(f'Conflicting immutable checkpoint: {path}')
        else:
            target.write_bytes(data)
        assets.append({'path': str(path), 'role': 'archive', 'bytes': len(data),
                       'sha256': sha, 'object': f'sha256/{sha[:2]}/{sha}/{source.name}'})
    output = stage / f'assets/tractor-stops-{args.phase}.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({'version': 1, 'bucket': 'miguelemosreverte/mr-pinpin-archive',
                                 'assets': assets}, indent=2) + '\n')
    print(json.dumps({'files': len(assets), 'bytes': sum(x['bytes'] for x in assets),
                      'manifest': str(output)}))


if __name__ == '__main__':
    main()
