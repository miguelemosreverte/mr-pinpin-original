"""Stage a bounded source-frame trial checkpoint on the mini; never delete media.

Run beside the mini production pack. Upload the resulting manifest with the
repository's verified tools/assets/hf_store.py adapter, not with this script.
"""
import hashlib
import json
import os
from pathlib import Path


def main():
    pack = Path(__file__).resolve().parent
    stage = pack / "archive-source-lock-stage"
    prefix = Path("docs/storyboard/production/tractor-stops-20260924")
    selected = list(pack.glob("stops/stop-*/source-display.png"))
    for relative in (
        "stops/stop-04/pilot-static-v1",
        "stops/stop-04/bridge-static-v2",
        "browser-check/static-anchor",
        "browser-check/static-anchor-fitted",
        "browser-check/static-gpu-integration",
        "browser-check/static-video-integration",
        "browser-check/static-perimeter",
    ):
        selected.extend((pack / relative).rglob("*"))
    entries = []
    for source in sorted(set(selected)):
        if source.is_symlink() or not source.is_file():
            continue
        if source.suffix.lower() not in {".png", ".jpg", ".webp", ".mp4"}:
            continue
        # Individual video-frame dumps are reproducible from preserved clips.
        if "frames" in source.relative_to(pack).parts:
            continue
        data = source.read_bytes()
        sha = hashlib.sha256(data).hexdigest()
        relative = prefix / source.relative_to(pack)
        target = stage / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            if hashlib.sha256(target.read_bytes()).hexdigest() != sha:
                raise ValueError(f"Refusing conflicting checkpoint: {relative}")
        else:
            os.link(source, target)
        entries.append({"path": str(relative), "role": "archive",
                        "bytes": len(data), "sha256": sha,
                        "object": f"sha256/{sha[:2]}/{sha}/{source.name}"})
    manifest = {"version": 1, "bucket": "miguelemosreverte/mr-pinpin-archive",
                "assets": entries}
    output = stage / "assets/tractor-stops-source-lock.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"files": len(entries), "bytes": sum(e["bytes"] for e in entries),
                      "manifest": str(output)}))


if __name__ == "__main__":
    main()
