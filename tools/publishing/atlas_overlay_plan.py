"""Record the bounded 57791 atlas overlay and explicit production activation."""
import argparse
import json
from pathlib import Path
from compose_atlas import reviewed_version, walk_manifest
from release_format import canonical, identity, load_release, new_directory, require, sha, write_new

FREEZE = "2012b39c412397a0475f0dba7f227b382804e7c0a1493485ddd7999da0c73f99"
BASELINE = "8173be499897de44cc916b1ad89d1a250bb2e40ff2497094acd6abce12940a3d"
FROZEN = [
    "atlas-debug.css", "atlas-debug.js", "atlas-field.js", "atlas-ground-planner.js",
    "atlas-video-sprite.js", "sprite-turn-profile.mjs", "sprite-turn-gait-regen.mjs",
    "sprite-turn-gait.mjs", "gpu/renderer.js", "gpu/world.wgsl", "gpu/object-occlusion.js",
    "images/atlas/shire-field-v1.png", "images/atlas/shire-tone-v1.png",
    "images/atlas/shire-ground-sdf-v4.png", "images/atlas/shire-object-instances-v2.png",
    "images/atlas/shire-object-ground-v2.png", "images/atlas/shire-walk-v1.png",
    "images/atlas/shire-body-v1a.png", "images/atlas/shire-body-v1b.png",
]
ACTIVATION = ["atlas-production.js", "atlas-motion.js", "atlas-webgpu.js"]


def plan(store, baseline_manifest, activation_root, output):
    frozen = reviewed_version(store, FREEZE)
    baseline, _ = load_release(baseline_manifest, BASELINE)
    old = {e["path"]: e for e in baseline["files"]}
    result = {"baseline_release": BASELINE, "freeze": FREEZE, "overlay": []}
    output = new_directory(output)
    (output / "activation").mkdir()

    def add(kind, source, target, raw):
        checksum = sha(raw)
        if target in old and (old[target]["bytes"], old[target]["sha256"]) == (len(raw), checksum):
            return
        result["overlay"].append({"kind": kind, "source": source, "target": target,
                                  "bytes": len(raw), "sha256": checksum})

    def object_bytes(name):
        entry = frozen[name]
        file = store / "objects" / entry["sha256"]
        require(identity(file) == (entry["bytes"], entry["sha256"]), "Frozen object mismatch")
        return file.read_bytes()

    for name in FROZEN:
        target = "storyboard/" + name
        add("freeze", target, target, object_bytes(target))
    for name in ACTIVATION:
        raw = (activation_root / name).read_bytes()
        write_new(output / "activation" / name, raw)
        add("activation", name, "storyboard/" + name, raw)
    for name in sorted(frozen):
        if name.startswith("__sprite-trial/sheets/"):
            add("freeze", name, "storyboard/images/atlas/walk/sheets/" + Path(name).name, object_bytes(name))
    source = "__sprite-trial/manifest.json"
    add("walk-manifest", source, "storyboard/images/atlas/walk/manifest.json", walk_manifest(object_bytes(source), frozen))
    result["overlay"].sort(key=lambda e: e["target"])
    write_new(output / "plan.json", canonical(result))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("store", "baseline-manifest", "activation-root", "out"):
        parser.add_argument("--" + name, type=Path, required=True)
    args = parser.parse_args()
    result = plan(args.store, args.baseline_manifest, args.activation_root, args.out)
    print(json.dumps({"overlay_files": len(result["overlay"]), "overlay_bytes": sum(e["bytes"] for e in result["overlay"])}))
