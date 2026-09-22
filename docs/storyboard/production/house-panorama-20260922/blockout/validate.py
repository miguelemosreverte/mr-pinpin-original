import bpy,pathlib,json,hashlib,math
p=pathlib.Path(__file__).parent
im=bpy.data.images.load(str(p/'room-blockout-equirectangular.png'));w,h=im.size;px=list(im.pixels)
seam=[sum(abs(px[(y*w)*4+c]-px[(y*w+w-1)*4+c]) for y in range(h))/h for c in range(3)]
cam=bpy.context.scene.camera
from mathutils import Vector
forward=cam.rotation_euler.to_matrix()@Vector((0,0,-1));up=cam.rotation_euler.to_matrix()@Vector((0,1,0))
assert w==2048 and h==1024 and cam.data.type=='PANO' and cam.data.panorama_type=='EQUIRECTANGULAR'
assert (forward-Vector((0,1,0))).length<1e-5 and (up-Vector((0,0,1))).length<1e-5
proof={'resolution':[w,h],'aspectRatio':w/h,'seamAdjacentPixelMeanAbsoluteDifferenceLinear01':seam,'cameraForward':list(forward),'cameraUp':list(up),'cameraPosition':list(cam.location),'files':{}}
for name in ['room-blockout-equirectangular.png','room-blockout.blend','build_room.py']:
 b=(p/name).read_bytes();proof['files'][name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(p/'validation.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof,indent=2))
