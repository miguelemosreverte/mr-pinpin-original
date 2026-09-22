"""Render two fixed-camera phase-zero guides from an existing control study."""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import checksum, material, pose
from gait import sample


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-study", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    source, output = args.source_study.resolve(), args.output.absolute()
    original = json.loads((source/"study.json").read_text())
    if checksum(source/"control-study.blend") != original["blend_sha256"]:
        raise ValueError("Source blend checksum mismatch")
    output.mkdir(parents=True, exist_ok=False)
    bpy.ops.wm.open_mainfile(filepath=str(source/"control-study.blend"))
    scene = bpy.context.scene
    scene.frame_set(1)
    rig = bpy.data.objects["NeutralControlRig"]
    state = sample(0, original["proportions"])
    pose(rig, state)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0))
    ground = bpy.context.object
    ground.name = "Shared level ground z=0"
    ground.data.materials.append(material("Neutral ground", (.78, .78, .78)))
    camera = scene.camera
    camera.data.type, camera.data.ortho_scale = "ORTHO", 4.8
    target = Vector((0, -.12, 1))
    scene.render.resolution_x = scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    record = {"version": 1, "source_study": str(source), "source_blend_sha256": original["blend_sha256"],
              "script_sha256": checksum(Path(__file__)), "phase": 0, "cycle_seconds": 1,
              "angle_convention": "Degrees around +Z: 0 camera on -Y (front), 90 on +X (left side), 105/120 toward +Y (rearward). Anatomical front=-Y; L=+X.",
              "camera_elevation_degrees": 30, "orthographic_scale": 4.8, "camera_target": list(target),
              "ground_z": 0, "pose": state, "anchors": [],
              "instruction": "Separate fixed-camera cycles. Same phase-zero pose at both boundaries. Switch angle only between complete one-second cycles, not an orbit inside either video. In-place body; virtual forward anchors follow original study convention.",
              "limitation": "Neutral pose proxy only; use true book reference for appearance. This does not prove video temporal closure or final identity."}
    pieces = []
    for angle in [105, 120]:
        theta = math.radians(angle)
        camera.location = target + Vector((6*math.sin(theta), -6*math.cos(theta), 6*math.tan(math.radians(30))))
        camera.rotation_euler = (target-camera.location).to_track_quat("-Z", "Y").to_euler()
        bpy.context.view_layer.update()
        evaluated = rig.evaluated_get(bpy.context.evaluated_depsgraph_get())
        bones = {b.name: {"head": list(b.head), "tail": list(b.tail)} for b in evaluated.pose.bones}
        for name, limb in state["limbs"].items():
            assert (Vector(bones[name+"_foot"]["head"])-Vector(limb["foot"])).length < 1e-4
        filename = f"boundary-phase0-angle{angle}.png"
        scene.render.filepath = str(output/filename)
        bpy.ops.render.render(write_still=True)
        image = bpy.data.images.load(str(output/filename), check_existing=False)
        pixels = list(image.pixels[:])
        assert max(pixels[0::4])-min(pixels[0::4]) > .1, "Blank guide"
        pieces.append(pixels)
        record["anchors"].append({"path": filename, "sha256": checksum(output/filename),
                                   "angle_degrees": angle, "camera_location": list(camera.location),
                                   "camera_matrix": [list(row) for row in camera.matrix_world], "bones": bones})
    assert record["anchors"][0]["bones"] == record["anchors"][1]["bones"], "Boundary poses differ"
    sheet = bpy.data.images.new("Shared phase zero: left 105 degrees, right 120 degrees", width=1024, height=512, alpha=True)
    pixels = [0.0]*(1024*512*4)
    for panel, piece in enumerate(pieces):
        for row in range(512):
            start = (row*1024+panel*512)*4
            pixels[start:start+512*4] = piece[row*512*4:(row+1)*512*4]
    sheet.pixels.foreach_set(pixels)
    sheet.filepath_raw = str(output/"boundary-phase0-105-120.png")
    sheet.file_format = "PNG"
    sheet.save()
    record["sheet"] = {"path": "boundary-phase0-105-120.png", "order": "left=105, right=120; both phase 0",
                       "sha256": checksum(output/"boundary-phase0-105-120.png")}
    bpy.ops.wm.save_as_mainfile(filepath=str(output/"boundary-anchors.blend"))
    record["blend_sha256"] = checksum(output/"boundary-anchors.blend")
    (output/"boundary-anchors.json").write_text(json.dumps(record, indent=2)+"\n")
    print("BOUNDARY_ANCHORS_READY", output)


if __name__ == "__main__":
    main()
