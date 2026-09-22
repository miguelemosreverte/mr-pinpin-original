#!/usr/bin/env python3
"""Register the approved atlas loop, encode browser assets, and audit landmarks.

Requires Python, numpy, OpenCV, ffmpeg and ffprobe. Run from any directory.
No provider calls; frames stream directly to FFmpeg without intermediate video.
"""

import argparse
import hashlib
import json
from pathlib import Path
import struct
import subprocess

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
STORY = ROOT / "docs/storyboard"
SOURCE = STORY / "videos/shire-seedance1-pingpong-v1.mp4"
BASE = STORY / "images/atlas/shire-v1.png"
WORLD = (1536, 1024)
SAMPLES = [0, 12, 24, 48, 72, 96, 120, 144, 168, 192, 216, 239]
LANDMARKS = {
    "cottage-door": (300, 676), "chimney": (177, 626),
    "dock": (864, 304), "bridge": (972, 602),
    "tree-door": (1210, 192), "left-shore-rock": (385, 385),
    "right-shore-rock": (929, 458), "picnic": (1155, 622),
    "tractor": (1340, 760), "bottom-rock": (622, 966),
    "top-rock": (300, 89),
}


def sha256(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def probe(path):
    return json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_streams", "-show_format",
        "-of", "json", str(path),
    ]))


def summary(errors):
    return dict(zip(["median", "p95", "max"],
                    [round(float(n), 4) for n in np.percentile(errors, [50, 95, 100])]))


def fit_registration(reference, first):
    sift = cv2.SIFT_create(nfeatures=6000)
    kr, dr = sift.detectAndCompute(cv2.cvtColor(reference, cv2.COLOR_BGR2GRAY), None)
    ks, ds = sift.detectAndCompute(cv2.cvtColor(first, cv2.COLOR_BGR2GRAY), None)
    matches = [a for a, b in cv2.BFMatcher().knnMatch(ds, dr, k=2)
               if a.distance < 0.7 * b.distance]
    src = np.float32([ks[m.queryIdx].pt for m in matches])
    dst = np.float32([kr[m.trainIdx].pt for m in matches])
    matrix, mask = cv2.estimateAffine2D(src, dst, method=cv2.RANSAC,
                                      ransacReprojThreshold=3)
    if matrix is None or int(mask.sum()) < 1000:
        raise RuntimeError("Insufficient reference registration evidence")
    keep = mask.ravel().astype(bool)
    models = {
        "fittedAffine": matrix,
        "blindFullWorldStretch": np.array([[1536 / 1664, 0, 0], [0, 1024 / 1248, 0]]),
        "idealCenteredFourByThreeCrop": np.array([[1024 / 1248, 0, (1536 - 1664 * 1024 / 1248) / 2],
                                                 [0, 1024 / 1248, 0]]),
    }
    evidence = {}
    for name, model in models.items():
        predicted = cv2.transform(src[:, None, :], model)[:, 0]
        evidence[name] = summary(np.linalg.norm(predicted[keep] - dst[keep], axis=1))
    return matrix, {"matches": len(matches), "inliers": int(mask.sum()),
                    "modelsWorldPixelError": evidence}


def measure_landmarks(reference, frame):
    ref = cv2.cvtColor(reference, cv2.COLOR_BGR2GRAY)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    results = {}
    # Independent local template searches retain residual source motion in the audit.
    for name, (x, y) in LANDMARKS.items():
        radius, search = 20, 18
        template = ref[y-radius:y+radius+1, x-radius:x+radius+1]
        area = gray[y-radius-search:y+radius+search+1, x-radius-search:x+radius+search+1]
        response = cv2.matchTemplate(area, template, cv2.TM_CCOEFF_NORMED)
        _, score, _, point = cv2.minMaxLoc(response)
        dx, dy = point[0] - search, point[1] - search
        results[name] = {"dx": dx, "dy": dy, "error": round(float(np.hypot(dx, dy)), 4),
                         "correlation": round(score, 4)}
        if score < 0.65 or np.hypot(dx, dy) > 10:
            raise RuntimeError(f"Landmark requires review: {name}: {results[name]}")
    return results


def faststart(path):
    boxes = []
    with path.open("rb") as file:
        while header := file.read(8):
            size, kind = struct.unpack(">I4s", header)
            header_size = 8
            if size == 1:
                size = struct.unpack(">Q", file.read(8))[0]
                header_size = 16
            boxes.append(kind.decode("ascii"))
            if size == 0:
                break
            file.seek(size - header_size, 1)
    return boxes.index("moov") < boxes.index("mdat")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--crf", type=int, default=26)
    parser.add_argument("--analyze-only", action="store_true")
    args = parser.parse_args()
    cv2.setNumThreads(2)
    cv2.setRNGSeed(0)
    reference = cv2.imread(str(BASE))
    assert reference.shape[:2] == (1024, 1536)
    metadata = probe(SOURCE)
    source_stream = metadata["streams"][0]
    assert (source_stream["width"], source_stream["height"], int(source_stream["nb_frames"])) == (1664, 1248, 240)
    assert source_stream["avg_frame_rate"] == "24/1"
    source_hash, base_hash = sha256(SOURCE), sha256(BASE)
    capture = cv2.VideoCapture(str(SOURCE))
    ok, first = capture.read()
    assert ok
    matrix, evidence = fit_registration(reference, first)
    coverage = cv2.warpAffine(np.ones(first.shape[:2], np.float32), matrix, WORLD)
    valid = coverage > 0.999

    def registered(frame):
        warped = cv2.warpAffine(frame, matrix, WORLD, flags=cv2.INTER_LINEAR)
        warped[~valid] = reference[~valid]
        return warped

    expected = {}
    source_landmarks = {}
    for index in SAMPLES:
        capture.set(cv2.CAP_PROP_POS_FRAMES, index)
        ok, frame = capture.read()
        assert ok
        expected[index] = registered(frame)
        source_landmarks[str(index)] = measure_landmarks(reference, expected[index])
    corners = cv2.transform(np.float32([[[0, 0], [1664, 0], [1664, 1248], [0, 1248]]]), matrix)[0]
    registration = {
        "baked": True, "method": "fixed-affine-from-frame-zero-sift-ransac",
        "source": "videos/shire-seedance1-pingpong-v1.mp4", "sourceSize": [1664, 1248],
        "reference": "images/atlas/shire-v1.png", "sourceToWorld": matrix.tolist(),
        "sourceCornersInWorld": corners.tolist(),
        "interpretation": "Horizontal crop with small anisotropic resampling; not full-world squeeze",
        "borderFill": "original reference pixels outside fixed source coverage",
        "staticFillPercent": round(100 * (1 - float(valid.mean())), 4),
        "temporalBlend": False, "perFrameStabilization": False, "motionGain": 1,
        "landmarkToleranceWorldPixels": 10, "sampleFrames": SAMPLES,
        "sourceLandmarkErrorWorldPixels": summary([item["error"] for row in source_landmarks.values() for item in row.values()]),
    }
    print(json.dumps({"registration": registration, "evidence": evidence}), flush=True)
    if args.analyze_only:
        return

    variants = []
    audits = {}
    for name, width, height in [("mobile", 1152, 768), ("desktop", 1536, 1024)]:
        path = STORY / f"videos/shire-atlas-loop-{name}-v1.mp4"
        command = ["ffmpeg", "-hide_banner", "-loglevel", "warning", "-y",
                   "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{width}x{height}",
                   "-r", "24", "-i", "pipe:0", "-an", "-c:v", "libx264",
                   "-preset", "medium", "-crf", str(args.crf), "-threads", "2",
                   "-pix_fmt", "yuv420p", "-vf", "setsar=1", "-frames:v", "240",
                   "-movflags", "+faststart", str(path)]
        encoder = subprocess.Popen(command, stdin=subprocess.PIPE)
        try:
            capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
            for index in range(240):
                ok, frame = capture.read()
                assert ok
                frame = registered(frame)
                if name == "mobile":
                    frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
                encoder.stdin.write(frame.tobytes())
                if index % 60 == 0:
                    print(f"Encoding {name}: {index}/240", flush=True)
        finally:
            encoder.stdin.close()
            result = encoder.wait()
        if result:
            raise RuntimeError(f"FFmpeg exited {result}")
        info = probe(path)
        stream = info["streams"][0]
        assert len(info["streams"]) == 1 and stream["codec_name"] == "h264"
        assert stream["pix_fmt"] == "yuv420p" and stream["avg_frame_rate"] == "24/1"
        assert (stream["width"], stream["height"]) == (width, height)
        assert int(stream["nb_frames"]) == 240 and float(info["format"]["duration"]) == 10
        assert stream["sample_aspect_ratio"] == "1:1" and faststart(path)
        decoded = cv2.VideoCapture(str(path))
        landmarks, psnr = {}, {}
        count = 0
        while True:
            ok, frame = decoded.read()
            if not ok:
                break
            if count in expected:
                target = expected[count]
                if name == "mobile":
                    target = cv2.resize(target, (width, height), interpolation=cv2.INTER_AREA)
                psnr[str(count)] = round(cv2.PSNR(target, frame), 4)
                world_frame = cv2.resize(frame, WORLD, interpolation=cv2.INTER_LINEAR)
                landmarks[str(count)] = measure_landmarks(reference, world_frame)
                if count == 120:
                    cv2.imwrite(str(path.with_suffix(".jpg")), frame, [cv2.IMWRITE_JPEG_QUALITY, 92])
            count += 1
        decoded.release()
        assert count == 240
        errors = [item["error"] for row in landmarks.values() for item in row.values()]
        audit = {"version": 1, "source": registration["source"], "sourceSha256": source_hash,
                 "referenceSha256": base_hash, "outputSha256": sha256(path),
                 "registration": registration, "fitEvidence": evidence,
                 "landmarksWorld": LANDMARKS, "sourceLandmarks": source_landmarks,
                 "decodedLandmarks": landmarks, "decodedLandmarkErrorWorldPixels": summary(errors),
                 "measurement": "41x41 grayscale templates, +/-18 world pixel search, integer pixel offsets; mobile decoded frames resized to world for measurement",
                 "psnrBgrDbByFrame": psnr,
                 "encoding": {"codec": "libx264", "crf": args.crf, "preset": "medium", "threads": 2,
                              "pixelFormat": "yuv420p", "faststart": True, "audio": False},
                 "verified": {"width": width, "height": height, "duration": 10, "fps": 24,
                              "decodedFrames": count, "bytes": path.stat().st_size}}
        write_json(path.with_suffix(".json"), audit)
        path.with_suffix(".md").write_text(
            f"# Registered atlas loop: {name}\n\n"
            f"{width} x {height}; 240 frames / 24 fps / 10 seconds; silent H.264, "
            f"yuv420p, square pixels, faststart, CRF {args.crf}. {path.stat().st_size:,} bytes.\n\n"
            "Fixed measured affine registration with original-map fill outside source coverage. "
            "No temporal blend, per-frame stabilization, paid generation, or AI upscale. "
            "The approved forward/reverse frame order and full motion are retained.\n\n"
            f"Decoded landmark errors (world pixels): {json.dumps(summary(errors))}. "
            f"[Full audit]({path.with_suffix('.json').name}); "
            "[production notes](../production/atlas-video-assets-notes.md).\n\n"
            "Rebuild: `python3 scripts/build-atlas-video-assets.py` from repository root.\n")
        variants.append({"id": name, "src": f"videos/{path.name}", "width": width,
                         "height": height, "bytes": path.stat().st_size})
        audits[name] = audit
        print(f"Verified {name}: {path.stat().st_size} bytes, errors {summary(errors)}", flush=True)
    capture.release()
    assert sha256(SOURCE) == source_hash and sha256(BASE) == base_hash
    registration["decodedLandmarkErrorWorldPixels"] = {
        name: audit["decodedLandmarkErrorWorldPixels"] for name, audit in audits.items()}
    write_json(STORY / "atlas-video.json", {"version": 1, "duration": 10, "fps": 24,
                                          "world": list(WORLD), "variants": variants,
                                          "registration": registration})
    rows = []
    for name in LANDMARKS:
        values = [max(row[name]["error"] for row in sample.values()) for sample in
                  [source_landmarks, audits["mobile"]["decodedLandmarks"], audits["desktop"]["decodedLandmarks"]]]
        rows.append(f"| {name} | " + " | ".join(f"{value:.2f}" for value in values) + " |")
    report = [
        "# Atlas video asset alignment and encoding", "",
        "Approved source: `videos/shire-seedance1-pingpong-v1.mp4`. Originals preserved; SHA-256 checked before and after build. No paid tools or generation.", "",
        "## Alignment", "",
        "SIFT feature matching (0.7 ratio test) and affine RANSAC on frame 0 establish a predominantly horizontal crop, with a small anisotropic resampling component. The source covers approximately x=75..1460 of the 1536-pixel world. Filling the entire world by stretching the 4:3 video would be incorrect.", "",
        f"Frame-zero fit: {evidence['inliers']} inliers / {evidence['matches']} matches. Error summaries in world pixels: `{json.dumps(evidence['modelsWorldPixelError'])}`.", "",
        f"Source-to-world affine: `{json.dumps(matrix.tolist())}`. Fixed transform for all frames; {registration['staticFillPercent']}% of pixels use the original map as static border fill. No temporal crossfade or dynamic stabilization. Motion gain stays 1.", "",
        f"Measured frames: {SAMPLES}. Eleven 41x41 grayscale landmark templates searched +/-18 world pixels, independently of the SIFT fit. Integer-pixel displacement precision. All template correlations must exceed 0.65 and all offsets must stay within 10 world pixels or the builder fails. Mobile measurements decode the actual asset then resize to world coordinates. This is a sampled landmark audit, not proof of exact registration of every animated leaf or water pixel.", "",
        "Maximum displacement over sampled frames (world pixels):", "",
        "| Landmark | Registered source | Mobile decoded | Desktop decoded |",
        "| --- | ---: | ---: | ---: |", *rows, "",
        "## Delivery", "",
        *[f"- `{v['src']}`: {v['width']}x{v['height']}, {v['bytes']:,} bytes ({v['bytes']/1e6:.2f} MB)." for v in variants], "",
        f"Both: silent H.264 / yuv420p / square pixels / 24 fps / exactly 240 decoded frames / 10 seconds; libx264 medium CRF {args.crf}, two encoding threads. MP4 moov box verified before mdat for faststart. Original frame order preserved; no interpolation or change to ping-pong reversal.", "",
        "Per-variant JSON sidecars contain source/output hashes, actual landmark offsets and correlations for each sampled frame, PSNR against the registered uncompressed target, encoding settings and metadata. Corresponding JPEGs show the decoded turnaround frame (120) for visual inspection.", "",
        "## Reproduction and limits", "",
        "Run `python3 scripts/build-atlas-video-assets.py` (Python, numpy, OpenCV, FFmpeg and ffprobe). `--analyze-only` performs registration and source-landmark audit without encoding. Frames pipe directly into FFmpeg. The mini hostname was unavailable, so this bounded job ran locally with two OpenCV/encoding threads and no intermediate videos.", "",
        "Residual generated geometry changes remain visible: the fixed transform intentionally preserves source motion. The original map supplies about 75 world pixels at each side; motion ends at those static boundaries. The approved loop still reverses water flow at the turnaround. No renderer, scenery, depth, region or unrelated test files changed by this lane.", "",
    ]
    (STORY / "production/atlas-video-assets-notes.md").write_text("\n".join(report))


if __name__ == "__main__":
    main()
