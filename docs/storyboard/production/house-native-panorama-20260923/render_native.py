"""One native Cycles full-sphere frame; no cube-to-panorama intermediate."""
import ast,hashlib,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
args=sys.argv[sys.argv.index('--')+1:];root,out=map(Path,args);out.mkdir(parents=True,exist_ok=True)
base=Path('/Volumes/TB4/mac-mini-storage/shared/pinpin-location-workflow-20260923/common-still/build/base.blend');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();assert sha(base)=='b1f0108066e974dadbc07a36dcadf50a30d91ee9650bbd5ca0eb838b27176e03'
plan=json.loads((root/'docs/storyboard/locations/pinpin-house/scene/house-plan.json').read_text());loc=json.loads((root/'docs/storyboard/locations/pinpin-house/location.json').read_text());worker=root/'tools/locations/blender_worker.py';tree=ast.parse(worker.read_text());ns={'bpy':bpy,'math':math,'Vector':Vector,'BVHTree':BVHTree,'loc':loc}
for name in ['doors','inside','camera_clear']:
 node=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name==name);exec(compile(ast.Module(body=[node],type_ignores=[]),str(worker),'exec'),ns)
bpy.ops.wm.open_mainfile(filepath=str(base));states=ns['doors']({'door-front':0,'door-bath':75,'door-bedroom':75});pos=[-1.3,-1.3,1.15];clear=ns['camera_clear']({'position':pos},plan);scene=bpy.context.scene
camdata=bpy.data.cameras.new('Native spherical camera');cam=bpy.data.objects.new(camdata.name,camdata);scene.collection.objects.link(cam);cam.location=pos;cam.rotation_euler=(math.pi/2,0,0);camdata.type='PANO';camdata.panorama_type='EQUIRECTANGULAR';camdata.longitude_min=-math.pi;camdata.longitude_max=math.pi;camdata.latitude_min=-math.pi/2;camdata.latitude_max=math.pi/2;camdata.clip_start=.025;camdata.clip_end=100;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.seed=7;scene.cycles.use_denoising=True;scene.render.resolution_x=2048;scene.render.resolution_y=1024;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.filepath=str(out/'native-guide.png');bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
probes=[]
for yaw in [math.pi-.04,math.pi,math.pi+.04]:
 d=Vector((math.sin(yaw),math.cos(yaw),0));hit,p,n,i,obj,mat=scene.ray_cast(deps,Vector(pos),d,distance=20);probes.append({'yaw':yaw,'hit':obj.name if hit else None,'point':list(p) if hit else None});assert hit and obj.name=='House structural walls'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'native-scene.blend'));bpy.ops.render.render(write_still=True)
record={'schemaVersion':1,'method':'One direct native Cycles EQUIRECTANGULAR render, no cube reprojection','baseBlendSha256':sha(base),'scriptSha256':sha(Path(__file__)),'frozenWorkerSha256':sha(worker),'planSha256':sha(root/'docs/storyboard/locations/pinpin-house/scene/house-plan.json'),'camera':{'position':pos,'rotationEulerXYZ':list(cam.rotation_euler),'matrixWorld':[list(r) for r in cam.matrix_world],'yawOffsetRadians':0,'canonicalFrontUV':[.5,.5],'forward':'+Y','right':'+X','up':'+Z','wrapDirection':'-Y quiet front-wall strip between door and window'},'wrapWallProbes':probes,'doorStates':states,'cameraClearance':clear,'resolution':[2048,1024],'samples':24,'seed':7,'output':str(out/'native-guide.png'),'outputSha256':sha(out/'native-guide.png'),'blenderVersion':bpy.app.version_string};(out/'native-guide.json').write_text(json.dumps(record,indent=2)+'\n');print('NATIVE GUIDE READY '+str(out/'native-guide.png'),flush=True)
