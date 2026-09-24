"""Materialize hash-checked input textures from a restored repository; no transforms."""
from pathlib import Path
import argparse,json,hashlib,shutil,os
p=argparse.ArgumentParser();p.add_argument('--repo',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();here=Path(__file__).resolve().parent
(a.out/'projection').mkdir(parents=True,exist_ok=True);(a.out/'inputs').mkdir(parents=True,exist_ok=True)
for f in here.iterdir():
 if f.is_file():
  target=a.out/'projection'/f.name
  if f.resolve()!=target.resolve():shutil.copyfile(f,target)
c=json.loads((here/'input-config.json').read_text());seen=set()
for room in c['rooms'].values():
 for row in room['inputs'].values():
  source=a.repo/row['sourceRepoPath'];target=a.out/'projection'/row['file']
  if row['file'] in seen:continue
  seen.add(row['file']);assert hashlib.sha256(source.read_bytes()).hexdigest()==row['sha256']
  if not target.exists():
   try:os.link(source.resolve(),target)
   except OSError:shutil.copyfile(source,target)
  assert hashlib.sha256(target.read_bytes()).hexdigest()==row['sha256']
print('Verified input textures:',len(seen))
