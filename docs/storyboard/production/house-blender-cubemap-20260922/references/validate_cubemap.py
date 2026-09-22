import pathlib,json,hashlib
p=pathlib.Path(__file__).resolve().parent;m=json.loads((p/'orientation.json').read_text());assert m['complete'] and len(m['faces'])==6
edges={};outputs=[]
for f in m['faces']:
 b=(p/f['file']).read_bytes();assert hashlib.sha256(b).hexdigest()==f['sha256'];assert len(b)==f['bytes'];assert int.from_bytes(b[16:20],'big')==1024 and int.from_bytes(b[20:24],'big')==1024
 def ray(u,v):return tuple(round(f['forward'][i]+(2*u-1)*f['imageRight'][i]+(1-2*v)*f['imageUp'][i],6) for i in range(3))
 for name,a,z in [('left',(0,0),(0,1)),('right',(1,0),(1,1)),('top',(0,0),(1,0)),('bottom',(0,1),(1,1))]:
  start,end=ray(*a),ray(*z);key=tuple(sorted([start,end]));edges.setdefault(key,[]).append({'face':f['name'],'edge':name,'start':start,'end':end})
assert len(edges)==12
for pair in edges.values():
 assert len(pair)==2;a,b=pair;reverse=a['start']==b['end'];assert reverse or a['start']==b['start'];outputs.append({'first':a['face']+'.'+a['edge'],'second':b['face']+'.'+b['edge'],'reverseEdgeTraversal':reverse})
result={'verified':True,'files':6,'dimensions':[1024,1024],'matchingGeometricEdgePairs':outputs,'sourceBlendSha256':m['sourceBlendSha256']};(p/'validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
