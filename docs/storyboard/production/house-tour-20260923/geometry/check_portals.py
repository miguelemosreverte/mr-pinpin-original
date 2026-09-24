"""Read-only doorway visibility and camera checks against the pinned Blender scene."""
import ast,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
root=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
base=Path('/Volumes/TB4/mac-mini-storage/shared/pinpin-location-workflow-20260923/common-still/build/base.blend')
sys.path.insert(0,str(root/'tools/locations/builder'));from plan_geometry import point_on_path,opening_profile
plan=json.loads((root/'docs/storyboard/locations/pinpin-house/scene/house-plan.json').read_text());loc=json.loads((root/'docs/storyboard/locations/pinpin-house/location.json').read_text())
tree=ast.parse((root/'tools/locations/blender_worker.py').read_text());ns={'bpy':bpy,'math':math,'Vector':Vector,'BVHTree':BVHTree,'loc':loc}
for name in ['doors','inside','camera_clear']:
 node=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name==name);exec(compile(ast.Module(body=[node],type_ignores=[]),'frozen-worker','exec'),ns)
bpy.ops.wm.open_mainfile(filepath=str(base));states=ns['doors']({'door-front':0,'door-bath':75,'door-bedroom':75});deps=bpy.context.evaluated_depsgraph_get()
portals=[]
for o in plan['openings']:
 if o['id'] not in ['door-bath','door-bedroom']:continue
 w=next(w for w in plan['walls'] if w['id']==o['wall']);center,tangent=point_on_path(w['path'],w.get('closed',False),o['station']);profile=opening_profile('arch',o['width'],o['height'],o['sillZ']);poly=[[center.x+tangent.x*x,center.y+tangent.y*x,z] for x,z in profile];portals.append({'id':o['id'],'connects':o['connects'],'center':list(center),'tangent':list(tangent),'width':o['width'],'thickness':w['thickness'],'polygonWorld':poly})
candidates={'common':[[1.1,-1.8,1.15],[0,-1.8,1.15],[0,-1.2,1.15],[-.3,-1.6,1.15],[.2,-2.2,1.15],[-1.3,-1.3,1.15],[-1.3,-.9,1.15],[-1.3,-2,1.15],[-.7,-2.1,1.15]],'bath':[[-2.4,2,1.15],[-2.6,2,1.15],[-2.8,1.7,1.15]],'bedroom':[[1.45,1.2,1.15],[1.8,1.2,1.15],[2,1.4,1.15]]}
rows=[]
for room,positions in candidates.items():
 for pos in positions:
  row={'room':room,'origin':pos,'portals':[]}
  try: row['cameraCheck']=ns['camera_clear']({'position':pos},plan)
  except ValueError as e:row['cameraCheck']={'pass':False,'reason':str(e)}
  for p in portals:
   if room not in p['connects']:continue
   visible=[];blocked=[]
   for lateral in [-.30,0,.30]:
    for z in [.65,1.05,1.45]:
     target=Vector((p['center'][0]+p['tangent'][0]*p['width']*lateral,p['center'][1]+p['tangent'][1]*p['width']*lateral,z));delta=target-Vector(pos);direction=delta.normalized();normal=Vector((-p['tangent'][1],p['tangent'][0],0));distance=delta.length+(p['thickness']/2+.03)/abs(direction.dot(normal))
     hit,loca,norm,index,obj,mat=bpy.context.scene.ray_cast(deps,Vector(pos),direction,distance=distance)
     (blocked if hit else visible).append({'anchor':list(target),'hit':obj.name if hit else None})
   row['portals'].append({'id':p['id'],'visible':visible,'blocked':blocked})
  rows.append(row)
(out/'portal-probe.json').write_text(json.dumps({'base':str(base),'doorStates':states,'portals':portals,'candidates':rows},indent=2));print('PORTAL PROBE DONE')
