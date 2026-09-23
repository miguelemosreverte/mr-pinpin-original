"""Extract unedited first decoded frames for native/keyed review video posters."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--ffmpeg', default='/opt/homebrew/bin/ffmpeg')
    args = parser.parse_args()
    root = args.manifest.resolve().parent
    spec = json.loads(args.manifest.read_text())
    args.out.mkdir(exist_ok=False)
    records = []
    for field, name in [('video', 'native-first.png'), ('keyedVideo', 'keyed-first.png')]:
        source = (root / spec[field]).resolve()
        assert source.is_relative_to(root) and source.is_file()
        before = sha(source)
        poster = args.out / name
        command = [args.ffmpeg, '-v', 'error', '-n', '-i', str(source), '-frames:v', '1', str(poster)]
        subprocess.run(command, check=True)
        assert sha(source) == before
        records.append({'source': spec[field], 'source_sha256': before, 'poster': name,
                        'poster_sha256': sha(poster), 'command': command})
    (args.out / 'posters.json').write_text(json.dumps({'method': 'First decoded frame, no editing, scaling or AI',
        'software_sha256': sha(Path(__file__)), 'posters': records}, indent=2) + '\n')
