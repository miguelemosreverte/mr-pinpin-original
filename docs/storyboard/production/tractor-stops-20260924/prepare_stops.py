#!/usr/bin/env python3
"""Prepare stable per-stop paths and invoke deterministic guides; never generate art."""
import argparse,hashlib,json,os,pathlib,subprocess,sys
ap=argparse.ArgumentParser();ap.add_argument('--root',required=True);ap.add_argument('--ids',default='all',help='Comma-separated numeric IDs or all');ap.add_argument('--guide',action='store_true');ap.add_argument('--helpers');a=ap.parse_args();root=pathlib.Path(a.root);manifest=json.loads((root/'frames-manifest.json').read_text());selected=set(range(24)) if a.ids=='all' else {int(i) for i in a.ids.split(',')};sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for row in manifest['stops']:
 i=int(row['id'].split('-')[1])
 if i not in selected:continue
 d=root/'stops'/row['id'];d.mkdir(parents=True,exist_ok=True);src=root/row['path'];dest=d/'source.png'
 assert sha(src)==row['sha256']
 if not dest.exists():os.link(src,dest)
 assert sha(dest)==row['sha256']
 descriptor={'schemaVersion':1,'id':row['id'],'source':{'path':'source.png','sha256':row['sha256'],'width':row['width'],'height':row['height'],'videoTimestampSeconds':row['actualTimestampSeconds'],'videoFrameIndex':row['frameIndex'],'originalExtractionPath':'../../'+row['path']},'camera':{'yawRadians':0,'pitchRadians':0,'verticalFovDegrees':45,'aspectPolicy':'Retain actual restored-image aspect; nominal16:9','status':'Authored registration convention, not a measured video camera'},'files':{'restored':'restored-v1.png','guide':'guide-v1.png','panorama':'panorama-v1.png'},'note':'File names reserve destinations; no restoration or panorama readiness is implied. Original extraction remains unchanged.'}
 f=d/'source.json'
 if f.exists():assert json.loads(f.read_text())==descriptor,'Existing descriptor differs; do not overwrite'
 else:f.write_text(json.dumps(descriptor,indent=2)+'\n')
 if a.guide:
  restored=d/'restored-v1.png'
  if not restored.exists():raise SystemExit(f'Missing {restored}; restoration must complete first')
  target=d/'guide-v1';cmd=[sys.executable,str(root/'perspective_guide.py'),'--input',str(restored),'--out',str(target)]
  if a.helpers:cmd+=['--helpers',a.helpers]
  if (target/'guide.json').exists():
   prior=json.loads((target/'guide.json').read_text());assert prior['input']['sha256']==sha(restored),'Existing guide has a different restored source; use a new version'
   assert prior['scriptSha256']==sha(root/'perspective_guide.py'),'Guide utility changed; do not silently overwrite'
   for item in prior['outputs']:assert sha(target/item['path'])==item['sha256']
  else:subprocess.run(cmd,check=True)
  for name,source in [('guide-v1.png',target/'guide-equirect.png'),('guide-v1.json',target/'guide.json')]:
   f=d/name
   if f.exists():assert sha(f)==sha(source),'Existing guide alias differs; preserve before selecting new output'
   else:os.link(source,f)
 print(row['id'],row['actualTimestampSeconds'],'guide' if a.guide else 'source-only')
