"""Check newly rendered controls and assemble their optional four-sample plate."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def inspect(root):
    study = json.loads((root/"study.json").read_text())
    assert hashlib.sha256((root/"control-study.blend").read_bytes()).hexdigest() == study["blend_sha256"]
    bpy.ops.wm.open_mainfile(filepath=str(root/"control-study.blend"))
    maximum_error = 0.0
    for frame, state in enumerate(study["poses"]):
        bpy.context.scene.frame_set(frame+1)
        graph = bpy.context.evaluated_depsgraph_get()
        rig = bpy.data.objects["NeutralControlRig"].evaluated_get(graph)
        for name, limb in state["limbs"].items():
            foot = rig.pose.bones[name+"_foot"].head
            mesh = bpy.data.objects[name+" foot"].evaluated_get(graph)
            center = mesh.matrix_world @ (sum((Vector(c) for c in mesh.bound_box), Vector()) / 8)
            maximum_error = max(maximum_error, (foot-Vector(limb["foot"])).length,
                                (center-Vector(limb["foot"])).length)
    assert maximum_error < 1e-4, "Saved keyed rig or mesh disagrees with targets"
    summaries, images = [], []
    for record in study["renders"]:
        path = root/record["path"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == record["sha256"]
        image = bpy.data.images.load(str(path), check_existing=False)
        w, h = image.size
        pixels = list(image.pixels[:])
        visible = [i for i in range(w*h) if pixels[4*i+3] > .05]
        assert .015 < len(visible)/(w*h) < .8, "Blank or unframed render"
        xs, ys = [i%w for i in visible], [i//w for i in visible]
        bounds = [min(xs), min(ys), max(xs), max(ys)]
        assert min(bounds[:2]) > 2 and bounds[2] < w-3 and bounds[3] < h-3, "Clipped body"
        brightness = [sum(pixels[4*i:4*i+3])/3 for i in visible]
        assert max(brightness)-min(brightness) > .04, "Flat/blank image"
        summaries.append({"path": record["path"], "alpha_pixels": len(visible), "bounds": bounds})
        if record["angle_degrees"] == study["angles"][0]:
            images.append((record["frame"], pixels, w, h))
    assert len({r["sha256"] for r in study["renders"]}) == len(study["renders"]), "Repeated rendered frame"
    for limb in study["poses"][0]["limbs"]:
        targets = [p["evaluated_feet"][limb] for p in study["poses"]]
        assert max(math.dist(targets[0], p) for p in targets) > .05, "Frozen evaluated leg"
        assert any(p["limbs"][limb]["contact"] for p in study["poses"])
        assert any(not p["limbs"][limb]["contact"] for p in study["poses"])
    plate_record = None
    if study["frames"] == 4:
        w, h = images[0][2:]
        plate = bpy.data.images.new("Four control samples, t=0 .25 .5 .75", width=2*w, height=2*h, alpha=True)
        result = [0.0]*(2*w*2*h*4)
        for frame, pixels, _, _ in images:
            ox, oy = (frame%2)*w, (1-frame//2)*h
            for row in range(h):
                start = ((oy+row)*2*w+ox)*4
                result[start:start+w*4] = pixels[row*w*4:(row+1)*w*4]
        plate.pixels.foreach_set(result)
        plate.filepath_raw = str(root/"control-2x2.png")
        plate.file_format = "PNG"
        plate.save()
        plate_record = {"path": "control-2x2.png", "order": "top-left, top-right, bottom-left, bottom-right",
                        "sha256": hashlib.sha256((root/"control-2x2.png").read_bytes()).hexdigest()}
    report = {"passed": True, "checks": ["RGBA nonblank", "full-body bounds", "distinct frame hashes",
               "evaluated feet move", "each leg contact and swing", "saved keyed rig and mesh match targets"],
              "max_saved_rig_mesh_error": maximum_error, "renders": summaries, "plate": plate_record}
    (root/"verification.json").write_text(json.dumps(report, indent=2)+"\n")
    print("CONTROL_VERIFIED", root, json.dumps(report))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--study", type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    inspect(args.study.resolve())
