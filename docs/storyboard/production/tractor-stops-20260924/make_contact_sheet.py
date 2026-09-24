#!/usr/bin/env python3
"""Review thumbnails only; extracted source PNGs remain untouched."""
import argparse,json,pathlib,hashlib
from PIL import Image,ImageDraw
ap=argparse.ArgumentParser();ap.add_argument('--root',required=True);a=ap.parse_args();p=pathlib.Path(a.root);m=json.loads((p/'frames-manifest.json').read_text());sheet=Image.new('RGB',(6*320,4*204),'white');draw=ImageDraw.Draw(sheet)
for i,s in enumerate(m['stops']):
 im=Image.open(p/s['path']).convert('RGB');im.thumbnail((320,180),Image.Resampling.LANCZOS);x=(i%6)*320;y=(i//6)*204;sheet.paste(im,(x,y+24));draw.text((x+5,y+5),f"{s['id']} | t={s['actualTimestampSeconds']:g}s | n={s['frameIndex']}",fill='black')
f=p/'contact-sheet.jpg';sheet.save(f,quality=90);(p/'contact-sheet.json').write_text(json.dumps({'operation':'6x4 labelled review thumbnails; source frames unchanged','inputManifestSha256':hashlib.sha256((p/'frames-manifest.json').read_bytes()).hexdigest(),'output':f.name,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'width':sheet.width,'height':sheet.height},indent=2)+'\n')
