"""Small studio and fixed anatomical inspection views (+Y is rear, Z is up)."""
import argparse
from pathlib import Path
import sys
import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import SCALE
from geometry import material

VIEWS = {
    "three-quarter": ((3.8, -6.2, 2.35), (0, -0.1, 0.99), 3.70),
    "face-closeup": ((0, -6.5, 1.53), (0, -1.12, 1.33), 1.95),
    "front": ((0, -7, 1.58), (0, -0.1, 1.05), 2.60),
    "side": ((6.8, -0.15, 2.45), (0, -0.12, 0.95), 4.25),
    "rear": ((0, 7, 2.8), (0, 0.25, 1.0), 3.65),
    "underside": ((2.5, -4, -4.5), (0, -0.12, 0.65), 4.4),
}


def studio():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for device in prefs.devices:
            device.use = device.type == "METAL"
        scene.cycles.device = "GPU" if any(d.type == "METAL" for d in prefs.devices) else "CPU"
    except Exception:
        scene.cycles.device = "CPU"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs[0].default_value = (0.72, 0.72, 0.72, 1)
    background.inputs[1].default_value = 0.42
    bpy.ops.mesh.primitive_plane_add(size=200 * SCALE, location=(0, 0, -0.008 * SCALE))
    floor = bpy.context.object
    floor.name = "Studio_Floor"
    floor.data.materials.append(material("Studio neutral light gray", (0.53, 0.53, 0.53), 0.9))
    for name, pos, energy, size, color in [
        ("Key", (-3.5, -4.5, 6), 650, 4, (1, 0.93, 0.83)),
        ("Fill", (4, -2.8, 3.3), 420, 3.5, (0.84, 0.91, 1)),
        ("Rim", (0.5, 4, 5), 750, 3, (1, 0.93, 0.85)),
        ("Eye_Catchlight", (-1.8, -4.2, 3.4), 65, 0.70, (1, 0.96, 0.90)),
    ]:
        bpy.ops.object.light_add(type="AREA", location=Vector(pos) * SCALE)
        obj = bpy.context.object
        obj.name = "Studio_" + name
        obj.data.energy = energy * SCALE * SCALE
        obj.data.shape = "DISK"
        obj.data.size = size * SCALE
        obj.data.color = color
        obj.data.specular_factor = 1.0 if name == "Eye_Catchlight" else 0.12
        obj.rotation_euler = (Vector((0, 0, 0.95)) * SCALE - obj.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.name = "Studio_Camera"
    camera.data.type = "ORTHO"
    camera.data.clip_start = 0.001
    camera.data.clip_end = 100
    scene.camera = camera
    scene.view_settings.view_transform = "AgX"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    return scene


def render_views(output, names, size=768, samples=32):
    scene = bpy.context.scene
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.cycles.samples = samples
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    for name in names:
        pos, target, scale = VIEWS[name]
        scene.camera.location = Vector(pos) * SCALE
        scene.camera.rotation_euler = (Vector(target) * SCALE - scene.camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.camera.data.ortho_scale = scale * SCALE
        bpy.data.objects["Studio_Floor"].hide_render = name == "underside"
        scene.render.filepath = str(output / (name + ".png"))
        print("RENDER_START " + name, flush=True)
        bpy.ops.render.render(write_still=True)
        print("RENDER_READY " + scene.render.filepath, flush=True)
    bpy.data.objects["Studio_Floor"].hide_render = False


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--views", default=",".join(VIEWS))
    parser.add_argument("--size", type=int, default=900)
    parser.add_argument("--samples", type=int, default=48)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    render_views(args.output, args.views.split(","), args.size, args.samples)
