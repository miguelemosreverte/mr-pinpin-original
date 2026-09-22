import bpy, math, pathlib, json, hashlib
from mathutils import Vector, Matrix
OUT=pathlib.Path(__file__).resolve().parent
(OUT/'faces-90').mkdir(exist_ok=True)
SOURCE=OUT.parent/'blockout'/'room-blockout.blend'
if not SOURCE.exists(): SOURCE=OUT.parent.parent/'house-panorama-20260922'/'blockout'/'room-blockout.blend'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene
origin=scene.camera.location.copy()
# Each tuple is (forward, image-right, image-up), all in Blender world space.
axes={
 'front':((0,1,0),(1,0,0),(0,0,1)),
 'back':((0,-1,0),(-1,0,0),(0,0,1)),
 'right':((1,0,0),(0,-1,0),(0,0,1)),
 'left':((-1,0,0),(0,1,0),(0,0,1)),
 'up':((0,0,1),(1,0,0),(0,-1,0)),
 'down':((0,0,-1),(1,0,0),(0,1,0)),
}
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.cycles.seed=0
scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.render.pixel_aspect_x=1;scene.render.pixel_aspect_y=1
cams={};faces=[]
for name,(forward,right,up) in axes.items():
 f,r,u=Vector(forward),Vector(right),Vector(up)
 assert abs(f.dot(r))<1e-8 and abs(f.dot(u))<1e-8 and abs(r.dot(u))<1e-8
 # Camera local +X = image right, +Y = image up, -Z = forward.
 matrix=Matrix((r,u,-f)).transposed();assert abs(matrix.determinant()-1)<1e-8
 data=bpy.data.cameras.new('Cube '+name);data.type='PERSP';data.sensor_fit='HORIZONTAL';data.sensor_width=36;data.lens=18;data.clip_start=.01;data.clip_end=200
 cam=bpy.data.objects.new('Cube camera '+name,data);bpy.context.collection.objects.link(cam);cam.location=origin;cam.rotation_euler=matrix.to_euler();cams[name]=cam
 actualf=cam.rotation_euler.to_matrix()@Vector((0,0,-1));actualu=cam.rotation_euler.to_matrix()@Vector((0,1,0))
 assert (actualf-f).length<1e-5 and (actualu-u).length<1e-5
 faces.append({'name':name,'file':'faces-90/'+name+'.png','forward':list(f),'imageRight':list(r),'imageUp':list(u),'cameraEulerXYZRadians':list(cam.rotation_euler),'cameraRotationMatrixRows':[list(row) for row in matrix],'fovHorizontalDegrees':90,'fovVerticalDegrees':90,'width':1024,'height':1024})
scene.camera=cams['front'];bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'room-cubemap-rig.blend'))
manifest={'sourceBlend':str(SOURCE),'sourceBlendSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'projection':'six direct perspective renders of one locked Blender scene','worldConvention':{'forward':'+Y','right':'+X','up':'+Z'},'cameraOriginMeters':list(origin),'imageUVOrigin':'top-left','pixelCenterUV':'((x+0.5)/1024,(y+0.5)/1024)','rayFormula':'normalize(forward + (2*u-1)*imageRight + (1-2*v)*imageUp)','fovDegrees':90,'renderSamples':24,'denoising':True,'renderSeed':0,'faces':faces}
(OUT/'orientation.json').write_text(json.dumps(manifest,indent=2)+'\n')
for face in faces:
 name=face['name'];scene.camera=cams[name];scene.render.filepath=str(OUT/face['file']);bpy.ops.render.render(write_still=True)
 b=(OUT/face['file']).read_bytes();face.update({'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()});(OUT/'orientation.json').write_text(json.dumps(manifest,indent=2)+'\n');print('CUBE_FACE_READY '+name,flush=True)
manifest['complete']=True;manifest['rigSha256']=hashlib.sha256((OUT/'room-cubemap-rig.blend').read_bytes()).hexdigest();(OUT/'orientation.json').write_text(json.dumps(manifest,indent=2)+'\n');print('CUBEMAP_COMPLETE',flush=True)
