#!/usr/bin/env python3
"""Compile an authored binary canopy gate; never infer canopy from depth or ID0."""
import argparse
import copy
import json
from pathlib import Path

import numpy as np
from PIL import Image

from compile_instances import digest, exclusive_png, read_rgb
from validate_textures import validate


def canopy_gate(proposal, max_color_fraction=0.01):
    if proposal.ndim != 3 or proposal.shape[2] != 3 or proposal.dtype != np.uint8:
        raise ValueError("Expected RGB8 canopy proposal")
    spread = np.ptp(proposal.astype(np.int16), axis=2)
    colored_fraction = float((spread > 8).mean())
    if colored_fraction > max_color_fraction:
        raise ValueError("Proposal is not a near-grayscale binary annotation")
    intensity = proposal.astype(float).mean(axis=2)
    return intensity >= 127.5, {"threshold": 127.5, "intensity": "mean RGB8",
                               "coloredPixelFraction": colored_fraction,
                               "intermediatePixelFraction": float(((intensity > 8) & (intensity < 247)).mean())}


def apply_canopy(base, gate, protected_ids):
    if base.ndim != 3 or base.shape[2] != 4 or base.dtype != np.uint8 or gate.shape != base.shape[:2]:
        raise ValueError("RGBA8 base and registered binary gate required")
    if gate.dtype != bool or np.any(base[:, :, 2]) or np.any(base[:, :, 3] != 255):
        raise ValueError("Base must use opaque B0 instance-profile encoding")
    if not protected_ids or any(type(i) is not int or not 1 <= i <= 255 for i in protected_ids):
        raise ValueError("Explicit nonempty protected hard-object ID list required")
    protected = np.isin(base[:, :, 0], protected_ids)
    vetoed = gate & protected
    effective = gate & ~protected
    result = base.copy()
    result[effective, 1] = 255
    result[effective, 2] = 1
    if not np.array_equal(result[:, :, 0], base[:, :, 0]):
        raise AssertionError("Instance IDs changed")
    if not np.array_equal(result[~effective], base[~effective]):
        raise AssertionError("Pixels outside canopy changed")
    if not np.array_equal(result[protected], base[protected]):
        raise AssertionError("Protected solid pixels changed")
    stats = {"rawCanopyPixels": int(gate.sum()), "canopyPixels": int(effective.sum()),
             "protectedVetoPixels": int(vetoed.sum()), "protectedIds": protected_ids,
             "previouslyOpenCanopyPixels": int((effective & (base[:, :, 0] == 0)).sum()),
             "idsUnchanged": True, "outsideGateByteIdentical": True, "protectedPixelsByteIdentical": True,
             "vetoById": {str(i): int((vetoed & (base[:, :, 0] == i)).sum()) for i in protected_ids}}
    return result, effective, stats


def compile_gate(base_path, proposal_path, spec_path, output, diagnostics, prompt_path=None):
    metadata = json.loads(Path(base_path).read_text())
    spec = json.loads(Path(spec_path).read_text())
    _, base, _ = validate(base_path)
    proposal = read_rgb(proposal_path, metadata["world"])
    gate, quantization = canopy_gate(proposal, spec.get("maxColoredFraction", 0.01))
    result, effective, stats = apply_canopy(base, gate, spec["protectedIds"])
    output, diagnostics = Path(output), Path(diagnostics)
    output.mkdir(parents=True, exist_ok=True)
    diagnostics.mkdir(parents=True, exist_ok=True)
    instance_path = output / "shire-object-instances-v2.png"
    sidecar_path = output / "shire-object-occlusion-v3.json"
    if instance_path.exists() or sidecar_path.exists():
        raise ValueError("Refusing to overwrite versioned canopy output")
    with Image.open(metadata["inputs"]["map"]["path"]) as image:
        scene = np.asarray(image.convert("RGB")).copy()
    scene[effective] = np.rint(scene[effective] * .6 + np.array([0, 220, 255]) * .4).astype(np.uint8)
    exclusive_png(diagnostics / "canopy-effective-overlay.png", scene)
    exclusive_png(diagnostics / "canopy-effective-binary.png", effective.astype(np.uint8) * 255)
    for name, box in spec.get("diagnosticCrops", {}).items():
        crop = Image.fromarray(scene).crop(box)
        exclusive_png(diagnostics / f"canopy-{name}.png", np.asarray(crop.resize(
            (crop.width * 3, crop.height * 3), Image.Resampling.NEAREST)))
    exclusive_png(instance_path, result)
    updated = copy.deepcopy(metadata)
    updated["schema"] = "atlas-instance-profile-canopy-v1"
    updated["status"] = "candidate-canopy-gate-awaiting-visual-and-runtime-acceptance"
    updated["outputs"]["instances"] = {"path": str(instance_path), "sha256": digest(instance_path)}
    updated["encoding"]["instances"] = "RGBA8: R=unchanged instance ID; B0=profile,G=original coverage; B1=canopy,G=255; A255"
    updated["canopyRevision"] = {**stats, "quantization": quantization,
                                  "limitations": spec.get("limitations", []),
                                  "protectedIdMeaning": spec.get("protectedIdMeaning", {}),
                                  "baseSidecarSha256": digest(base_path),
                                  "method": "Authored binary mask threshold then hard-ID veto; no depth/ID0 inference, morphology or coordinate exceptions",
                                  "groundUnchanged": True, "groundSha256": metadata["outputs"]["ground"]["sha256"]}
    for name, path in {"canopyProposal": proposal_path, "canopySpec": spec_path, "canopyCompiler": __file__}.items():
        updated["inputs"][name] = {"path": str(path), "sha256": digest(path)}
    if prompt_path:
        updated["inputs"]["canopyPrompt"] = {"path": str(prompt_path), "sha256": digest(prompt_path)}
    with sidecar_path.open("x") as stream:
        json.dump(updated, stream, indent=2, allow_nan=False)
        stream.write("\n")
    return updated


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("base", "proposal", "spec", "output", "diagnostics"):
        parser.add_argument("--" + name, required=True)
    parser.add_argument("--prompt")
    args = parser.parse_args()
    result = compile_gate(args.base, args.proposal, args.spec, args.output, args.diagnostics, args.prompt)
    print(json.dumps({"outputs": result["outputs"], "canopy": result["canopyRevision"]}))


if __name__ == "__main__":
    main()
