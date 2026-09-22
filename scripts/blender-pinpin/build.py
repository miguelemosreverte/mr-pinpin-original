"""Run with Blender --background --python build.py -- --output /TB4/..."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import time
from datetime import datetime, timezone
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import PARAMS, SCALE, SEED
from geometry import material
from anatomy import build_skin
from face import build_face
from groom import build_quills, build_fur, build_undercoat
from render import studio, render_views


def main():
    started = time.perf_counter()
    started_at = datetime.now(timezone.utc).isoformat()
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--views", default="three-quarter,face-closeup")
    parser.add_argument("--size", type=int, default=768)
    parser.add_argument("--samples", type=int, default=32)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    output = Path(args.output).resolve()
    if not str(output).startswith("/Volumes/TB4/"):
        raise ValueError("Heavy artifacts must remain on TB4")
    output.mkdir(parents=True, exist_ok=True)
    if (output / "model.glb").exists() or (output / "pinpin.blend").exists():
        raise ValueError("Use a new pass directory; previous artifacts are immutable")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    print("BUILD continuous skin", flush=True)
    mat = material("Skin vertex color", (1, 1, 1), 0.73)
    color = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    color.layer_name = "Color"
    mat.node_tree.links.new(color.outputs["Color"], mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
    parts, skin_proof = build_skin(mat)
    print("BUILD eyes, ears, nose, smile", flush=True)
    build_face()
    print("BUILD dorsal quills", flush=True)
    build_undercoat(parts)
    quill_proof = build_quills()
    print("BUILD short fur", flush=True)
    build_fur(parts)
    character = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    root = bpy.data.objects.new("PinPin_Static_Prototype", None)
    bpy.context.collection.objects.link(root)
    root["generator"] = "Code-authored bpy; no imported reconstruction"
    root["rigged"] = False
    root["seed"] = SEED
    for obj in character:
        obj.parent = root
    root.scale = (SCALE,) * 3
    bpy.context.view_layer.update()
    scene = studio()
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1
    names = [obj.name for obj in character]
    proof = {
        "schemaVersion": 1, "kind": "code-authored-static-prototype", "seed": SEED,
        "generatedAt": datetime.now(timezone.utc).isoformat(), "blenderVersion": bpy.app.version_string,
        "startedAt": started_at, "commandArguments": sys.argv,
        "renderSettings": {"views": args.views.split(","), "size": args.size, "samples": args.samples},
        "params": PARAMS, "metersPerWorkingUnit": SCALE,
        "noseToRumpMeters": PARAMS["nose_to_rump_m"],
        "headMeshes": [n for n in names if n == "Head"],
        "limbMeshes": sorted(n for n in names if n.startswith("Limb_")),
        "pawMeshes": sorted(n for n in names if n.startswith("Paw_")),
        "separateEyeMeshes": sorted(n for n in names if n.startswith("Eye_")),
        "armatures": [o.name for o in bpy.data.objects if o.type == "ARMATURE"],
        "animations": len(bpy.data.actions), "skin": skin_proof, "quills": quill_proof,
        "sourceModules": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in Path(__file__).parent.glob("*.py")},
        "parts": [{"name": obj.name, "vertices": len(obj.data.vertices), "polygons": len(obj.data.polygons)} for obj in character],
        "claims": {"staticOnly": True, "rigged": False, "independentEyeGeometry": True,
                   "imageGenerationUsed": False, "paidModelUsed": False, "importedTripoGeometry": False,
                   "visualApproval": False, "riggingReadyTopology": False},
    }
    assert len(proof["headMeshes"]) == 1 and len(proof["limbMeshes"]) == 4 and len(proof["pawMeshes"]) == 4
    assert all("Eye_" + side + "_" + part in names for side in ["L", "R"] for part in ["Sclera", "Iris", "Pupil"])
    (output / "structure.json").write_text(json.dumps(proof, indent=2) + "\n")
    bpy.ops.wm.save_as_mainfile(filepath=str(output / "pinpin.blend"))
    render_views(output / "renders", args.views.split(","), args.size, args.samples)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in character + [root]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(output / "model.glb"), export_format="GLB", use_selection=True,
                              export_animations=False, export_extras=True, export_yup=True)
    data = (output / "model.glb").read_bytes()
    proof["glb"] = {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
    proof["claims"]["gazeReady"] = False
    proof["elapsedSecondsThroughExport"] = round(time.perf_counter() - started, 3)
    proof["exportCompletedAt"] = datetime.now(timezone.utc).isoformat()
    (output / "structure.json").write_text(json.dumps(proof, indent=2) + "\n")
    bpy.ops.wm.save_as_mainfile(filepath=str(output / "pinpin.blend"))
    print("BUILD_READY " + str(output), flush=True)


if __name__ == "__main__":
    main()
