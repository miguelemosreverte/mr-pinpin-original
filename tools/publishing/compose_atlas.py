"""Compose a reviewed atlas overlay onto an immutable published artifact."""
import argparse
import json
from pathlib import Path
import re
import shutil

from materialize import extract
from package_release import inventory
from release_format import (BUCKET, canonical, clean_path, identity, load_release,
                            new_directory, read_json, relative, require, sha, write_new)


def reviewed_version(store, version_id):
    require(re.fullmatch(r"[a-f0-9]{64}", version_id), "Invalid freeze ID")
    version, _ = read_json(store / "versions" / (version_id + ".json"))
    body = {k: v for k, v in version.items() if k != "id"}
    raw = json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    require(version.get("id") == version_id == sha(raw), "Freeze identity mismatch")
    require(version.get("kind") == "frozen-server-source", "Not a source freeze")
    entries = {}
    for entry in version["files"]:
        name = relative(entry["path"])
        require(name not in entries, "Duplicate freeze path")
        require(re.fullmatch(r"[a-f0-9]{64}", entry["sha256"]), "Invalid object hash")
        entries[name] = entry
    return entries


def atlas_target(name):
    relative(name)
    return bool(re.fullmatch(
        r"storyboard/(?:atlas-[^/]+\.(?:js|css|html|json)|"
        r"sprite-turn-[^/]+\.mjs|gpu/[^/]+\.(?:js|wgsl)|"
        r"images/atlas/shire-[^/]+\.(?:png|webp|bin)|"
        r"images/atlas/walk/(?:manifest\.json|sheets/[a-z0-9]+\.webp))", name))


def walk_manifest(raw, frozen):
    data = json.loads(raw)
    require(isinstance(data.get("clips"), dict) and data["clips"], "Missing walk clips")
    for clip in data["clips"].values():
        sheet = clip["sheet"]
        require(isinstance(sheet, str) and sheet.startswith("/__sprite-trial/sheets/"), "Unexpected trial sheet URL")
        original = relative(sheet[1:])
        require(original in frozen, "Sheet missing from reviewed freeze")
        entry = frozen[original]
        require((clip["bytes"], clip["sha256"]) == (entry["bytes"], entry["sha256"]), "Walk sheet identity mismatch")
        clip["sheet"] = "./sheets/" + Path(original).name
        # Native-generation paths are provenance, not public playback dependencies.
        for key in ("generated", "regenerated"):
            if isinstance(clip.get(key), dict):
                clip[key].pop("native", None)
    return (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode()


def overlay_bytes(plan, store, overrides):
    frozen = reviewed_version(store, plan["freeze"])
    result, seen = [], set()
    for entry in plan["overlay"]:
        target = entry["target"]
        require(atlas_target(target) and target not in seen, "Unsafe, non-atlas or duplicate overlay target")
        seen.add(target)
        source = relative(entry["source"])
        if entry["kind"] in ("freeze", "walk-manifest"):
            require(source in frozen, "Source absent from reviewed freeze")
            record = frozen[source]
            file = store / "objects" / record["sha256"]
            require(identity(file) == (record["bytes"], record["sha256"]), "Frozen object bytes changed")
            raw = file.read_bytes()
            if entry["kind"] == "walk-manifest":
                require(source == "__sprite-trial/manifest.json" and target == "storyboard/images/atlas/walk/manifest.json", "Unexpected manifest mapping")
                raw = walk_manifest(raw, frozen)
        else:
            require(entry["kind"] == "activation", "Unknown overlay kind")
            require(target in ("storyboard/atlas-motion.js", "storyboard/atlas-webgpu.js", "storyboard/atlas-production.js"), "Unexpected activation target")
            file = clean_path(overrides / source)
            require(file.is_relative_to(overrides), "Override escaped root")
            raw = file.read_bytes()
        require((len(raw), sha(raw)) == (entry["bytes"], entry["sha256"]), "Overlay differs from reviewed plan: " + target)
        result.append((target, raw))
    require(result, "Empty overlay")
    return result


def verify_preservation(baseline, final, overlay):
    old = {e["path"]: (e["bytes"], e["sha256"]) for e in baseline["files"]}
    require(set(final) == set(old) | set(overlay), "Unplanned addition/removal")
    for name, expected in old.items():
        if name not in overlay:
            require(final[name] == expected, "Unrelated published bytes changed: " + name)
    return len(set(old) - set(overlay))


def compose(plan_path, baseline_manifest, baseline_archive, store, overrides, output):
    plan, plan_raw = read_json(plan_path)
    baseline, release = load_release(baseline_manifest, plan["baseline_release"])
    additions = overlay_bytes(plan, clean_path(store), clean_path(overrides))
    output = new_directory(output)
    try:
        source = output / "source"
        source.mkdir()
        extract(baseline_archive, baseline, source / "docs")
        for name, raw in additions:
            target = source / "docs" / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(raw)
        files = inventory(source / "docs")
        final = {name: identity(source / "docs" / name) for name in files}
        unchanged = verify_preservation(baseline, final, dict(additions))
        assets = []
        for name, (size, checksum) in sorted(final.items()):
            assets.append({"path": "docs/" + name, "bytes": size, "sha256": checksum,
                           "role": "production", "object": "sha256/" + checksum[:2] + "/" + checksum + "/" + Path(name).name})
        (source / "assets").mkdir()
        write_new(source / "assets/manifest.json", canonical({"version": 1, "bucket": BUCKET, "assets": assets}))
        summary = {"baseline_release": release, "freeze": plan["freeze"], "plan_sha256": sha(plan_raw),
                   "unchanged_baseline_files": unchanged, "files": len(final),
                   "bytes": sum(v[0] for v in final.values()), "overlay": plan["overlay"]}
        write_new(output / "composition.json", canonical(summary))
        write_new(output / "plan.json", plan_raw)
        return summary
    except BaseException:
        shutil.rmtree(output)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("plan", "baseline-manifest", "baseline-archive", "store", "overrides", "out"):
        parser.add_argument("--" + name, type=Path, required=True)
    args = parser.parse_args()
    result = compose(args.plan, args.baseline_manifest, args.baseline_archive, args.store, args.overrides, args.out)
    print(json.dumps({k: v for k, v in result.items() if k != "overlay"}, sort_keys=True))


if __name__ == "__main__":
    main()
