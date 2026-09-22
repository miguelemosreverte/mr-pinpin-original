import bpy, math, os, json
from mathutils import Vector
OUT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for d in list(bpy.data.materials): bpy.data.materials.remove(d)
def mat(name,value):
 m=bpy.data.materials.new(name);m.diffuse_color=(value,value,value,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(value,value,value,1);p.inputs['Roughness'].default_value=.8
 return m
plaster=mat('Clay plaster',.63);wood=mat('Clay timber',.36);furn=mat('Clay furnishings',.47);dark=mat('Clay stove and hardware',.22);light=mat('Clay ceramics',.73);rug=mat('Clay circular rug',.53)
def finish(o,name,material):
 o.name=name
 if material:o.data.materials.append(material)
 return o
def box(name,loc,scale,material=wood,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mo=o.modifiers.new('Soft blockout corners','BEVEL');mo.width=bevel;mo.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return finish(o,name,material)
def cyl(name,loc,radius,depth,material=furn,rotation=(0,0,0),vertices=48):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc,rotation=rotation);return finish(bpy.context.object,name,material)
def sphere(name,loc,scale,material=light):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=loc);o=bpy.context.object;o.scale=scale;return finish(o,name,material)
def line(name,points,r,material=wood,closed=False):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2
 sp=c.splines.new('POLY');sp.points.add(len(points)-1)
 for p,v in zip(sp.points,points):p.co=(*v,1)
 sp.use_cyclic_u=closed;o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(material);return o
def cut(wall,tool):
 bpy.context.view_layer.objects.active=wall;mo=wall.modifiers.new('Opening','BOOLEAN');mo.operation='DIFFERENCE';mo.object=tool;bpy.ops.object.modifier_apply(modifier=mo.name);bpy.data.objects.remove(tool,do_unlink=True)
def beam(name,a,b,width=.11,material=wood):
 a,b=Vector(a),Vector(b);o=box(name,(a+b)/2,(width,width,(b-a).length),material);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
# Entire enclosure: six metres square, 2.7 m eaves, 3.5 m ridge.
box('Subfloor',(0,0,-.10),(6.3,6.3,.18),wood)
for i in range(24):box('Floor plank %02d'%i,(-2.875+i*.25,0,.005),(.244,6,.04),wood)
front=box('Front plaster wall',(0,3.07,1.75),(6.25,.18,3.5),plaster)
box('Rear plaster wall',(0,-3.07,1.75),(6.25,.18,3.5),plaster)
for x in [-3.07,3.07]:box('Side plaster wall',(x,0,1.36),(.18,6.3,2.72),plaster)
# Door: 1.0 m clear width, 2.2 m crown; true wall aperture.
cut(front,box('Door lower cutter',(0,3.07,.85),(1,.8,1.72),None))
cut(front,cyl('Door arch cutter',(0,3.07,1.7),.5,.8,None,(math.pi/2,0,0)))
arch=[(-.56,2.94,0),(-.56,2.94,1.70)]+[(.56*math.cos(t),2.94,1.7+.56*math.sin(t)) for t in [math.pi-i*math.pi/32 for i in range(33)]]+[(.56,2.94,0)]
line('Door timber arch',arch,.07)
# Two circular windows; all circles share the front-wall plane.
for x in [-1.15,1.15]:
 cut(front,cyl('Window cutter',(x,3.07,1.4),.425,.8,None,(math.pi/2,0,0)))
 points=[(x+.46*math.cos(i*math.tau/64),2.94,1.4+.46*math.sin(i*math.tau/64)) for i in range(64)]
 line('Circular window timber frame',points,.065,closed=True)
 for angle in [0,math.pi/2]:line('Window cross mullion',[(x+.41*math.cos(angle),2.935,1.4+.41*math.sin(angle)),(x-.41*math.cos(angle),2.935,1.4-.41*math.sin(angle))],.022)
 box('Window sill',(x,2.88,.9),(1.08,.31,.095),wood,.015)
# Open door: hinged on viewer-right, oriented 70 degrees outward.
pivot=bpy.data.objects.new('Door hinge',None);bpy.context.collection.objects.link(pivot);pivot.location=(.5,2.92,0);pivot.rotation_euler.z=math.radians(-70)
door=box('Open door lower',(-.0,0,.84),(1,.07,1.68),furn,.015);door.parent=pivot;door.location=(-.5,0,.84)
# Shaped upper semicircle in local door coordinates, using mesh extrusion.
verts=[]
outline=[(-1,1.67),(0,1.67)]+[(-.5+.5*math.cos(t),1.7+.5*math.sin(t)) for t in [i*math.pi/32 for i in range(33)]]
for y in [-.035,.035]:verts.extend([(x,y,z) for x,z in outline])
n=len(outline);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh=bpy.data.meshes.new('Arched door top');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Open arched door crown',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(furn);o.parent=pivot
knob=sphere('Door knob',(0,0,0),(.055,.055,.055),dark);knob.parent=pivot;knob.location=(-.86,-.085,1.0)
# Pitched ceiling and continuous timber ribs, no missing zenith.
for side in [-1,1]:
 verts=[(0,-3.16,3.5),(side*3.16,-3.16,2.657),(side*3.16,3.16,2.657),(0,3.16,3.5)]
 me=bpy.data.meshes.new('Ceiling slope');me.from_pydata(verts,[],[(0,1,2,3)]);me.update();o=bpy.data.objects.new('Clay vaulted ceiling',me);bpy.context.collection.objects.link(o);o.data.materials.append(plaster)
for y in [-2.95,-1.45,0,1.45,2.95]:
 for side in [-1,1]:beam('Roof rafter',(0,y,3.43),(side*2.99,y,2.64),.13)
beam('Ridge beam',(0,-3,3.42),(0,3,3.42),.14)
for x in [-2.97,2.97]:
 beam('Eaves beam',(x,-3,2.62),(x,3,2.62),.15)
 for y in [-2.97,0,2.97]:beam('Wall timber post',(x,y,0),(x,y,2.65),.14)
for x in [-2.5,-.65,.65,2.5]:beam('Front timber post',(x,2.95,.03),(x,2.95,2.67),.09)
# Kitchen on left wall, frontward. Counter and open storage.
box('Kitchen base',(-2.60,1.18,.43),(.68,2.48,.86),furn,.035)
box('Kitchen countertop',(-2.57,1.18,.91),(.82,2.58,.10),wood,.025)
for y in [.35,1.17,2.0]:
 box('Kitchen cabinet door',(-2.245,y,.44),(.025,.72,.67),wood,.014);sphere('Kitchen knob',(-2.20,y,.62),(.025,.03,.025),dark)
for z in [1.48,1.96]:
 box('Kitchen wall shelf',(-2.75,1.1,z),(.48,2.5,.07),wood,.015)
 for y in [.15,.65,1.25,1.85]:cyl('Simple storage jar',(-2.69,y,z+.13),.10,.21,light)
cyl('Counter bowl',(-2.50,1.50,1.01),.22,.16,light)
# Stove on front-right; bookcase farther to right along side wall.
box('Stove stone base',(2.16,2.35,.075),(.93,.84,.15),plaster,.04)
box('Stove body',(2.16,2.35,.58),(.65,.58,.80),dark,.07)
box('Stove door',(2.16,2.043,.60),(.47,.045,.47),furn,.05)
box('Stove cooking top',(2.16,2.35,1.015),(.79,.72,.09),dark,.03)
cyl('Stovepipe',(2.16,2.50,1.99),.095,1.92,dark)
sphere('Stove kettle',(2.14,2.20,1.17),(.17,.16,.14),light)
# Bookcase facing toward centre (-X).
box('Bookcase backing',(2.91,.60,1.07),(.10,1.38,2.14),wood,.015)
for y in [-.12,1.32]:box('Bookcase side',(2.67,y,1.1),(.54,.09,2.20),wood,.02)
for z in [.08,.62,1.18,1.73,2.20]:box('Bookcase shelf',(2.65,.60,z),(.59,1.5,.08),wood,.02)
for level,z in enumerate([.32,.89,1.45]):
 for j in range(6):box('Book volume',(2.57,.05+j*.20,z),(.30,.13,.36+(j%2)*.04),furn if j%2 else light,.009)
# Rear reading bench and table: complete back hemisphere across seam.
box('Rear bench seat',(0,-2.58,.46),(2.75,.65,.14),wood,.04)
box('Rear bench back',(0,-2.91,.88),(2.75,.12,.80),wood,.045)
for x in [-1.12,1.12]:
 for y in [-2.79,-2.37]:box('Bench leg',(x,y,.22),(.11,.11,.44),wood)
for x in [-.78,.0,.78]:box('Bench cushion',(x,-2.56,.58),(.72,.57,.15),light,.065)
box('Rear table top',(0,-1.62,.74),(1.65,.86,.11),wood,.04)
for x in [-.66,.66]:
 for y in [-1.91,-1.33]:box('Table leg',(x,y,.36),(.09,.09,.72),wood)
box('Book on table',(-.25,-1.60,.835),(.42,.31,.05),light,.005)
cyl('Table mug',(.41,-1.57,.89),.075,.18,light)
cyl('Centre circular rug',(0,0,.033),1.18,.014,rug,vertices=96)
# Additional simple rear-left chest avoids empty side hemisphere.
box('Rear storage chest',(-2.55,-1.85,.33),(.68,1.20,.66),furn,.04)
# Soft exterior and broad neutral daylight: no black dead room surfaces.
box('Exterior ground',(0,7,-.06),(22,14,.08),light)
box('Exterior backdrop',(0,12,3),(22,.1,6),light)
world=bpy.data.worlds.new('Neutral ambient world');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.7,.7,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
def area(name,loc,target,power,size):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Exterior daylight',(0,4.2,2.5),(0,0,1),650,4)
area('Soft ceiling bounce',(0,.2,3.2),(0,0,0),420,3.4)
area('Rear fill',(0,-2.4,2.4),(0,.5,1),170,2)
# Camera: local -Z points world +Y; local +Y points world +Z.
data=bpy.data.cameras.new('True equirectangular 360 camera');cam=bpy.data.objects.new('Camera',data);bpy.context.collection.objects.link(cam);cam.location=(0,0,1.15);cam.rotation_euler=(math.pi/2,0,0);data.type='PANO';data.panorama_type='EQUIRECTANGULAR';data.longitude_min=-math.pi;data.longitude_max=math.pi;data.latitude_min=-math.pi/2;data.latitude_max=math.pi/2
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=2048;scene.render.resolution_y=1024;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.view_settings.view_transform='AgX';scene.render.filepath=os.path.join(OUT,'room-blockout-equirectangular.png');scene.render.film_transparent=False
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'room-blockout.blend'))
bpy.ops.render.render(write_still=True)
with open(os.path.join(OUT,'scene-spec.json'),'w') as f:json.dump({'roomMeters':[6,6],'eavesHeight':2.7,'ridgeHeight':3.5,'cameraPosition':[0,0,1.15],'forwardWorldAxis':'+Y','frontUV':[.5,.5],'projection':'EQUIRECTANGULAR','longitudeRange':[-math.pi,math.pi],'latitudeRange':[-math.pi/2,math.pi/2],'resolution':[2048,1024],'windowCenters':[[-1.15,3,1.4],[1.15,3,1.4]],'windowDiameter':.85,'doorWidth':1,'doorCrownHeight':2.2,'renderSamples':48,'seed':scene.cycles.seed},f,indent=2)
print('BLOCKOUT_COMPLETE')
