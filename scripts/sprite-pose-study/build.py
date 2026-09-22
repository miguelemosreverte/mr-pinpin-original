"""Run with Blender 4.5 --background --python build.py -- --output NEW_DIR."""
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from gait import DUTY, LIFT, LINK, OFFSETS, SOLE, STRIDE, sample


def material(name, color, roughness=.7):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    return mat


def skin(obj, bone, rig, mat):
    obj.data.materials.append(mat)
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new("Control armature", "ARMATURE")
    modifier.object = rig
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def ellipsoid(name, center, scale, mat, rig, bone="root"):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return skin(obj, bone, rig, mat)


def segment(name, a, b, radius, mat, rig, bone):
    a, b = Vector(a), Vector(b)
    obj = ellipsoid(name, (a + b) / 2, (radius, (b-a).length / 2 + radius, radius), mat, rig, bone)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = (b-a).to_track_quat("Y", "Z")
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return obj


def make_rig(params):
    armature = bpy.data.armatures.new("Four named limb chains")
    rig = bpy.data.objects.new("NeutralControlRig", armature)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    def bone(name, a, b, parent=None):
        value = armature.edit_bones.new(name)
        value.head, value.tail = a, b
        if parent:
            value.parent = armature.edit_bones[parent]
        return value

    bone("root", (0, 0, .4), (0, 0, 1.1))
    head = params["head_center"]
    bone("head", head, (head[0], head[1]-.4, head[2]), "root")
    for side, sign in [("L", 1), ("R", -1)]:
        eye = (sign*params["eye_x"], params["eye_y"], params["eye_z"])
        bone("eye_"+side, eye, (eye[0], eye[1]-.1, eye[2]), "head")
    rest = sample(0, params)
    for name, limb in rest["limbs"].items():
        bone(name+"_upper", limb["hip"], limb["knee"], "root")
        bone(name+"_lower", limb["knee"], limb["foot"], name+"_upper")
        foot = limb["foot"]
        bone(name+"_foot", foot, (foot[0], foot[1], foot[2]+.15), name+"_lower")
    bpy.ops.object.mode_set(mode="OBJECT")
    rig.show_in_front = True
    return rig, rest


def point_matrix(a, b):
    return Matrix.Translation(Vector(a)) @ (Vector(b)-Vector(a)).to_track_quat("Y", "Z").to_matrix().to_4x4()


def pose(rig, state):
    for name, limb in state["limbs"].items():
        foot = limb["foot"]
        points = [("upper", limb["hip"], limb["knee"]),
                  ("lower", limb["knee"], foot),
                  ("foot", foot, (foot[0], foot[1], foot[2]+.15))]
        for suffix, a, b in points:
            rig.pose.bones[name+"_"+suffix].matrix = point_matrix(a, b)
            bpy.context.view_layer.update()
    head = rig.pose.bones["head"]
    head.rotation_mode = "XYZ"
    head.rotation_euler.x = .035 * math.sin(2*math.pi*state["t"])
    bpy.context.view_layer.update()


def checksum(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--frames", type=int, choices=[4, 8, 16, 30, 60], default=4)
    parser.add_argument("--angles", type=float, nargs="+", default=[105])
    parser.add_argument("--size", type=int, default=512)
    parser.add_argument("--config", type=Path, default=HERE.parent / "blender-pinpin/config.py")
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    if not 64 <= args.size <= 2048 or not all(math.isfinite(a) for a in args.angles):
        parser.error("size must be 64..2048 and angles finite")
    if len(set(args.angles)) != len(args.angles):
        parser.error("angles must be unique")
    output = args.output.expanduser().absolute()
    output.mkdir(parents=True, exist_ok=False)
    spec = importlib.util.spec_from_file_location("proportions", args.config)
    config = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(config)
    params = config.PARAMS
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    rig, rest = make_rig(params)
    neutral = material("Neutral grey control, NOT final character", (.48, .51, .53))
    dark = material("Dorsal control markers", (.20, .24, .27))
    eye_mat = material("Eye guide", (.035, .045, .05))
    ellipsoid("Body proportions", params["body_center"], params["body_radii"], neutral, rig)
    ellipsoid("Independent head", params["head_center"], params["head_radii"], neutral, rig, "head")
    segment("Simple muzzle", (0, -1.19, 1.18), (0, -1.91, 1.12), .15, neutral, rig, "head")
    ellipsoid("Nose guide", (0, -1.96, 1.12), (.10, .07, .075), eye_mat, rig, "head")
    for side, sign in [("L", 1), ("R", -1)]:
        ellipsoid("Eye "+side, (sign*params["eye_x"], params["eye_y"], params["eye_z"]),
                  (.11, .07, .12), eye_mat, rig, "eye_"+side)
        ellipsoid("Ear "+side, (sign*params["ear_x"], params["ear_y"], params["ear_z"]),
                  (.13, .08, .16), neutral, rig, "head")
    for row in range(5):
        y = -.35 + row*.35
        for col in range(7):
            x = (col-3)*.20
            surface = max(.05, 1-(x/.83)**2-((y-.32)/1.28)**2)
            z = 1+.77*math.sqrt(surface)
            bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=.065, radius2=0, depth=.24, location=(x, y, z+.09))
            obj = bpy.context.object
            obj.name = "Sparse dorsal guide"
            skin(obj, "root", rig, dark)
    for name, limb in rest["limbs"].items():
        mat = neutral
        segment(name+" upper", limb["hip"], limb["knee"], .085, mat, rig, name+"_upper")
        segment(name+" lower", limb["knee"], limb["foot"], .065, mat, rig, name+"_lower")
        ellipsoid(name+" foot", limb["foot"], (.12, .17, SOLE), mat, rig, name+"_foot")
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.cycles.seed = 210926
    scene.render.resolution_x = scene.render.resolution_y = args.size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.world.color = (.35, .35, .35)
    scene.render.fps = args.frames
    scene.frame_start, scene.frame_end = 1, args.frames
    for location, energy, size in [((4,-4,6), 650, 5), ((-3,1,4), 400, 4)]:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy, light.data.shape, light.data.size = energy, "DISK", size
        light.rotation_euler = (Vector((0,0,1))-light.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.name = "Consistent orthographic control camera"
    camera.data.type, camera.data.ortho_scale = "ORTHO", 4.8
    scene.camera = camera
    poses = []
    for k in range(args.frames):
        scene.frame_set(k+1)
        state = sample(k/args.frames, params)
        pose(rig, state)
        for bone in rig.pose.bones:
            bone.keyframe_insert("location", frame=k+1)
            bone.keyframe_insert("rotation_quaternion" if bone.rotation_mode=="QUATERNION" else "rotation_euler", frame=k+1)
            bone.keyframe_insert("scale", frame=k+1)
        evaluated = rig.evaluated_get(bpy.context.evaluated_depsgraph_get())
        state["evaluated_feet"] = {name: list(evaluated.pose.bones[name+"_foot"].head) for name in OFFSETS}
        for name in OFFSETS:
            if (Vector(state["evaluated_feet"][name])-Vector(state["limbs"][name]["foot"])).length > 1e-4:
                raise RuntimeError("Evaluated rig target mismatch: "+name)
        poses.append(state)
    evidence = {"version": 1, "description": "Neutral articulated CONTROL proxy, not final art or a physical simulation; existing v3 is static and was not rigged",
                "blender": bpy.app.version_string, "config_sha256": checksum(args.config), "proportions": params,
                "source_sha256": {p.name: checksum(p) for p in [Path(__file__), HERE/"gait.py"]},
                "coordinates": "Authored proportion units, front=-Y, up=Z, L=+X; multiply by scale_to_meters for nominal meters",
                "scale_to_meters": config.SCALE,
                "motion": "In-place camera-stabilized rendering; root_motion_world defines virtual forward travel. Ground anchors constant during each stance, not across steps.",
                "gait": {"duty": DUTY, "stride": STRIDE, "lift": LIFT, "link_length": LINK, "offsets": OFFSETS},
                "frames": args.frames, "size": args.size, "angles": args.angles, "poses": poses, "renders": []}
    for angle_index, angle in enumerate(args.angles):
        theta = math.radians(angle)
        target = Vector((0,-.12,1.0))
        camera.location = target + Vector((6*math.sin(theta), -6*math.cos(theta), 6*math.tan(math.radians(30))))
        camera.rotation_euler = (target-camera.location).to_track_quat("-Z", "Y").to_euler()
        for k, state in enumerate(poses):
            scene.frame_set(k+1)
            pose(rig, state)
            name = f"angle-{angle_index:02d}_frame-{k:03d}.png"
            scene.render.filepath = str(output/name)
            bpy.ops.render.render(write_still=True)
            evidence["renders"].append({"path": name, "frame": k, "t": state["t"], "angle_degrees": angle,
                                        "sha256": checksum(output/name), "bytes": (output/name).stat().st_size,
                                        "camera": {"location": list(camera.location), "target": list(target),
                                                   "ortho_scale": camera.data.ortho_scale, "matrix_world": [list(row) for row in camera.matrix_world]}})
    scene.frame_set(1)
    pose(rig, poses[0])
    bpy.ops.wm.save_as_mainfile(filepath=str(output/"control-study.blend"))
    evidence["blend_sha256"] = checksum(output/"control-study.blend")
    (output/"study.json").write_text(json.dumps(evidence, indent=2)+"\n")
    print("CONTROL_STUDY_COMPLETE", output)


if __name__ == "__main__":
    main()
