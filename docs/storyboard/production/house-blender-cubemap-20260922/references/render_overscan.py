import bpy, math, pathlib, json,hashlib
OUT=pathlib.Path(__file__).resolve().parent
DIRECT=OUT/'faces-110';DIRECT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(OUT/'room-cubemap-rig.blend'))
scene=bpy.context.scene;scene.cycles.samples=16
manifest=json.loads((OUT/'orientation.json').read_text());manifest.pop('complete',None);manifest.pop('rigSha256',None);manifest['fovDegrees']=110;manifest['renderSamples']=16;manifest['purpose']='Overscan image-generation guides; 10 degrees overlap beyond each canonical cube edge'
for f in manifest['faces']:
 f['fovHorizontalDegrees']=110;f['fovVerticalDegrees']=110;f['file']=f['name']+'.png';f.pop('sha256',None);f.pop('bytes',None)
for f in manifest['faces']:
 name=f['name'];cam=bpy.data.objects['Cube camera '+name];cam.data.lens=cam.data.sensor_width/(2*math.tan(math.radians(55)));scene.camera=cam;scene.render.filepath=str(DIRECT/f['file']);bpy.ops.render.render(write_still=True)
 b=(DIRECT/f['file']).read_bytes();f.update({'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()});(DIRECT/'orientation.json').write_text(json.dumps(manifest,indent=2)+'\n');print('OVERSCAN_FACE_READY '+name,flush=True)
manifest['complete']=True;manifest['rayFormula']='normalize(forward + (2*u-1)*tan(55 degrees)*imageRight + (1-2*v)*tan(55 degrees)*imageUp)';(DIRECT/'orientation.json').write_text(json.dumps(manifest,indent=2)+'\n');print('OVERSCAN_COMPLETE',flush=True)
