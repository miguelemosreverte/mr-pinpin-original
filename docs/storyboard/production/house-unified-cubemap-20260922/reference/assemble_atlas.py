from pathlib import Path
import argparse,struct,zlib,json,hashlib
SIGN=b'\x89PNG\r\n\x1a\n'
def sha(b):return hashlib.sha256(b).hexdigest()
def paeth(a,b,c):
 p=a+b-c;pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
 return a if pa<=pb and pa<=pc else b if pb<=pc else c
def read_png(path):
 data=Path(path).read_bytes();assert data[:8]==SIGN
 offset=8;compressed=bytearray();meta=None
 while offset<len(data):
  n=struct.unpack('>I',data[offset:offset+4])[0];kind=data[offset+4:offset+8];body=data[offset+8:offset+8+n];crc=struct.unpack('>I',data[offset+8+n:offset+12+n])[0]
  assert zlib.crc32(kind+body)&0xffffffff==crc
  if kind==b'IHDR':meta=struct.unpack('>IIBBBBB',body)
  if kind==b'IDAT':compressed.extend(body)
  offset+=n+12
 w,h,depth,color,compression,filt,interlace=meta;assert (depth,color,compression,filt,interlace)==(8,2,0,0,0)
 raw=zlib.decompress(compressed);stride=w*3;assert len(raw)==h*(stride+1);prev=bytearray(stride);rows=[]
 for y in range(h):
  pos=y*(stride+1);filtertype=raw[pos];row=bytearray(raw[pos+1:pos+stride+1]);assert filtertype<=4
  if filtertype:
   for x in range(stride):
    a=row[x-3] if x>=3 else 0;b=prev[x];c=prev[x-3] if x>=3 else 0
    prediction=a if filtertype==1 else b if filtertype==2 else (a+b)//2 if filtertype==3 else paeth(a,b,c)
    row[x]=(row[x]+prediction)&255
  rows.append(bytes(row));prev=row
 return w,h,rows
def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
def main():
 p=argparse.ArgumentParser();p.add_argument('--faces',required=True);p.add_argument('--out',required=True);args=p.parse_args()
 src=Path(args.faces);out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
 orientations=json.loads((src/'orientation.json').read_text());validation=json.loads((src.parent/'validation.json').read_text())
 order=[['front','right','back'],['left','up','down']];decoded={};face_meta={f['name']:f for f in orientations['faces']};tiles=[]
 for row,names in enumerate(order):
  for col,name in enumerate(names):
   path=src/(name+'.png');b=path.read_bytes();assert sha(b)==face_meta[name]['sha256']
   w,h,pixels=read_png(path);assert (w,h)==(1024,1024);decoded[name]=pixels
   tiles.append({'face':name,'column':col,'row':row,'pixelRect':[col*1024,row*1024,1024,1024],'atlasUVRect':[col/3,row/2,1/3,1/2],'sourceFile':str(path),'sourceSha256':sha(b),'decodedRGBSha256':sha(b''.join(pixels)),**{k:face_meta[name][k] for k in ['forward','imageRight','imageUp','cameraRotationMatrixRows','cameraEulerXYZRadians']}})
 rows=[]
 for names in order:
  for y in range(1024):rows.append(b''.join(decoded[name][y] for name in names))
 encoded=SIGN+chunk(b'IHDR',struct.pack('>IIBBBBB',3072,2048,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(b'\x00'+row for row in rows),9))+chunk(b'IEND',b'')
 filename='room-cubemap-atlas-gray-v1.png';(out/filename).write_bytes(encoded)
 aw,ah,actual=read_png(out/filename);assert (aw,ah)==(3072,2048)
 for t in tiles:
  recovered=[actual[t['row']*1024+y][t['column']*3072:(t['column']+1)*3072] for y in range(1024)]
  assert recovered==decoded[t['face']]
 tilemap={t['face']:t for t in tiles};edgeuv={'left':((0,0),(0,1)),'right':((1,0),(1,1)),'top':((0,0),(1,0)),'bottom':((0,1),(1,1))}
 pairs=[]
 for pair in validation['matchingGeometricEdgePairs']:
  item=dict(pair)
  for key in ['first','second']:
   name,edge=pair[key].split('.');t=tilemap[name]
   item[key+'AtlasEndpoints']=[[(t['column']+u)/3,(t['row']+v)/2] for u,v in edgeuv[edge]]
  pairs.append(item)
 assert len(pairs)==12
 manifest={'version':1,'method':'Lossless deterministic assembly of six direct Blender camera renders; no creative generation, resizing, rotation or color adjustment','atlas':{'file':filename,'width':3072,'height':2048,'columns':3,'rows':2,'faceSize':1024,'bytes':len(encoded),'sha256':sha(encoded),'layout':order,'gutters':0,'labels':False},'sourceBlendSha256':orientations['sourceBlendSha256'],'cameraOriginMeters':orientations['cameraOriginMeters'],'worldConvention':orientations['worldConvention'],'fovDegrees':90,'imageUVOrigin':'top-left','faceRayFormula':orientations['rayFormula'],'atlasUVFormula':'((column+faceU)/3,(row+faceV)/2)','edgeSafeFaceUVClamp':[.5/1024,1-.5/1024],'tiles':tiles,'edgePairs':pairs,'validation':{'allSixDecodedTilesExactlyMatchSourcePixels':True,'sourcePNGSha256MatchesLockedManifest':True,'matchingGeometricEdgePairs':12}}
 (out/'atlas-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'atlas':str(out/filename),'bytes':len(encoded),'sha256':sha(encoded),'exactPixelTiles':6,'edgePairs':12}))
if __name__=='__main__':main()
