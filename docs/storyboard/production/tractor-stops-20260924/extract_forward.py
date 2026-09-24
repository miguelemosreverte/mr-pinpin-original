#!/usr/bin/env python3
"""Extract a rectangular bridge endpoint from the selected spherical texture."""
import argparse, hashlib, json, math, pathlib, sys
import numpy as np

p = argparse.ArgumentParser()
p.add_argument('--panorama', required=True)
p.add_argument('--camera', required=True, help='JSON with yaw/pitch radians and fov degrees')
p.add_argument('--output', required=True)
p.add_argument('--helpers', required=True)
a = p.parse_args()
sys.path.insert(0, a.helpers)
from trusted_reproject import load, save, pano_sample

camera = json.loads(a.camera)
yaw, pitch = camera['yaw'], camera['pitch']
cy, sy, cp, sp = math.cos(yaw), math.sin(yaw), math.cos(pitch), math.sin(pitch)
w, h = 1280, 720
yy, xx = np.mgrid[:h, :w]
t = math.tan(math.radians(camera['fov']) / 2)
x = (2 * (xx + .5) / w - 1) * t * w / h
y = (1 - 2 * (yy + .5) / h) * t
z = cp - y * sp
rays = np.stack((x * cy + z * sy, z * cy - x * sy, y * cp + sp), -1)
source = pathlib.Path(a.panorama)
output = pathlib.Path(a.output)
output.parent.mkdir(parents=True, exist_ok=True)
save(output, np.rint(pano_sample(load(source)[..., :3], rays)).clip(0, 255).astype(np.uint8))
sha = lambda path: hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()
record = {'schemaVersion': 1, 'operation': 'Rectangular 16:9 spherical perspective extraction; no artistic changes',
          'input': {'path': str(source), 'sha256': sha(source)}, 'camera': camera,
          'output': {'path': str(output), 'width': w, 'height': h, 'sha256': sha(output)},
          'scriptSha256': sha(__file__)}
output.with_suffix('.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record))
