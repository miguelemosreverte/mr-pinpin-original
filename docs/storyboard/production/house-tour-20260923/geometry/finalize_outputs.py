"""Verify actual cube pixels and preserve compact source review derivatives.
Run with source repository root and external tour output root. Pillow is only
required for this review derivative step; the reusable renderer is stdlib.
"""
import hashlib,json,math,shutil,subprocess,sys
from pathlib import Path
from PIL import Image
root,external=map(Path,sys.argv[1:]);pack=root/'docs/storyboard/production/house-tour-20260923/geometry';reports=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for room in ['common','bath','bedroom']:
 out=external/'rooms'/room;manifest=out/'cubemap-manifest.json'
 subprocess.run([sys.executable,str(root/'tools/locations/cli.py'),'validate','--root',str(root),'--manifest',str(manifest)],check=True)
 m=json.loads(manifest.read_text());atlas=Image.open(out/'cube-atlas.png').convert('RGB');assert atlas.size==(3072,2048);assert len(m['cameras'])==6;assert len({tuple(c['position']) for c in m['cameras']})==1
 assert {d['id']:d['angleDegrees'] for d in m['doorStates']}=={'door-front':0,'door-bath':75,'door-bedroom':75}
 for c in m['cameras']:
  assert abs(c['horizontalFovDegrees']-90)<.00001
  x,y=c['tile'];assert atlas.crop((x*1024,y*1024,(x+1)*1024,(y+1)*1024)).tobytes()==Image.open(out/(c['id']+'.png')).convert('RGB').tobytes()
 # Pair all 24 directed boundaries into exactly 12 geometrically shared edges.
 edges={}
 for c in m['cameras']:
  def v(x,y):
   a=[f+x*r+y*u for f,r,u in zip(c['forward'],c['right'],c['up'])];n=math.sqrt(sum(q*q for q in a));return tuple(round(q/n,6) for q in a)
  for a,b in [((-1,-1),(-1,1)),((1,-1),(1,1)),((-1,-1),(1,-1)),((-1,1),(1,1))]:
   key=tuple(sorted([v(*a),v(*b)]));edges[key]=edges.get(key,0)+1
 assert len(edges)==12 and set(edges.values())=={2}
 webp=out/'cube-atlas.webp';atlas.save(webp,lossless=True,method=6);assert Image.open(webp).convert('RGB').tobytes()==atlas.tobytes()
 dest=pack/'rooms'/room;dest.mkdir(parents=True,exist_ok=True)
 for name in ['cube-atlas.webp']:shutil.copyfile(out/name,dest/name)
 report={'schemaVersion':1,'room':room,'pass':True,'origin':m['cameras'][0]['position'],'sixTrue90Faces':True,'twelveSharedEdges':True,'tilePixelEquality':True,'webpRGBEquality':True,'sourceSceneSha256':m['sceneSourceSha256'],'sourceAtlasPath':str(out/'cube-atlas.png'),'sourceAtlasSha256':sha(out/'cube-atlas.png'),'sourceManifestPath':str(manifest),'sourceManifestSha256':sha(manifest),'sourceManifest':m,'artifacts':[{'path':n,'sha256':sha(dest/n),'bytes':(dest/n).stat().st_size} for n in ['cube-atlas.webp']]};(dest/'provenance.json').write_text(json.dumps(report,indent=2)+'\n');reports.append({k:v for k,v in report.items() if k!='sourceManifest'})
assert len({r['sourceSceneSha256'] for r in reports})==1
result={'pass':True,'rooms':reports,'note':'Raw individual faces and complete executable output manifests remain in external output directories.'};(pack/'render-checks.json').write_text(json.dumps(result,indent=2)+'\n');(external/'render-checks.json').write_text(json.dumps(result,indent=2)+'\n');print('ALL THREE CONNECTED CUBEMAPS VERIFIED')
