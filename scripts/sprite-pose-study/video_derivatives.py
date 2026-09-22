"""Small, non-destructive derivatives of two native fixed-camera trial clips."""
import argparse
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess


def run(command):
    return subprocess.run([str(p) for p in command], check=True, capture_output=True, text=True).stdout


def identity(path):
    checksum = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024*1024), b""):
            checksum.update(block)
    return {"bytes": path.stat().st_size, "sha256": checksum.hexdigest()}


def probe(path, executable):
    data = json.loads(run([executable, "-v", "error", "-select_streams", "v:0",
                           "-show_streams", "-show_frames", "-show_entries",
                           "stream=width,height,avg_frame_rate,duration:frame=best_effort_timestamp_time",
                           "-of", "json", path]))
    stream = data["streams"][0]
    fps = float(Fraction(stream["avg_frame_rate"]))
    timestamps = [float(frame["best_effort_timestamp_time"]) for frame in data["frames"]]
    duration = float(stream.get("duration", timestamps[-1]-timestamps[0]+1/fps))
    if not 2 <= len(timestamps) <= 1000 or not 0 < duration <= 30:
        raise ValueError("Expected a small native clip: 2..1000 frames, at most 30 seconds")
    if not all(math.isfinite(v) for v in timestamps+[fps, duration]) or fps <= 0:
        raise ValueError("Invalid video timing")
    return {"width": stream["width"], "height": stream["height"], "fps": fps,
            "duration_seconds": duration, "decoded_frames": len(timestamps),
            "frame_timestamps_seconds": timestamps}


def sample_indices(count, samples):
    if count < samples:
        raise ValueError("Fewer native frames than requested visual samples")
    return [round(k*(count-1)/(samples-1)) for k in range(samples)]


def sheet(ffmpeg, source, target, indices, columns, size):
    select = "+".join(f"eq(n\\,{i})" for i in indices)
    rows = math.ceil(len(indices)/columns)
    filters = (f"select={select},scale={size}:{size}:force_original_aspect_ratio=decrease,"
               f"pad={size}:{size}:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1,"
               f"tile={columns}x{rows}:nb_frames={len(indices)}:color=white")
    run([ffmpeg, "-v", "error", "-n", "-i", source, "-an", "-vf", filters,
         "-frames:v", "1", "-update", "1", target])
    return {"path": target.name, **identity(target), "frame_indices": indices,
            "grid": [columns, rows], "cell_pixels": size, "order": "row-major"}


def extract(args):
    inputs = [(105, args.angle105.resolve()), (120, args.angle120.resolve())]
    if inputs[0][1] == inputs[1][1]:
        raise ValueError("Two distinct native clips are required")
    observed = [(angle, path, identity(path), probe(path, args.ffprobe)) for angle, path in inputs]
    output = args.output.absolute()
    output.mkdir(parents=True, exist_ok=False)
    manifest = {"version": 1, "status": "diagnostic_derivatives_review_pending",
                "archive_ready": False, "source_files_untouched": True,
                "cycle_count_policy": "Unknown until visual review; one-second whole-clip retiming does not establish one gait cycle.",
                "tool": run([args.ffmpeg, "-version"]).splitlines()[0], "clips": []}
    for angle, source, before, native in observed:
        stem = f"angle{angle}"
        timed = output/(stem+"-diagnostic-whole-clip-1s.mp4")
        filters = (f"setpts=(PTS-STARTPTS)/{native['duration_seconds']:.12g},"
                   "fps=24,trim=duration=1,setpts=PTS-STARTPTS,"
                   "scale=512:512:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1")
        run([args.ffmpeg, "-v", "error", "-n", "-i", source, "-map", "0:v:0", "-an",
             "-vf", filters, "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", timed])
        retimed = probe(timed, args.ffprobe)
        if retimed["decoded_frames"] != 24 or abs(retimed["duration_seconds"]-1) > .001:
            raise ValueError("Retime did not produce exactly 24 frames / one second")
        picks = sample_indices(native["decoded_frames"], args.samples)
        contacts = sheet(args.ffmpeg, source, output/(stem+"-native-samples.png"), picks, 3, args.sample_size)
        contacts["timestamps_seconds"] = [native["frame_timestamps_seconds"][i] for i in picks]
        endpoints = [0, native["decoded_frames"]-1]
        closure = sheet(args.ffmpeg, source, output/(stem+"-native-first-last.png"), endpoints, 2, args.sample_size)
        closure["timestamps_seconds"] = [native["frame_timestamps_seconds"][i] for i in endpoints]
        sprite = None
        if args.sprites:
            sprite = sheet(args.ffmpeg, timed, output/(stem+"-sprites24.png"), list(range(24)), 6, 256)
            sprite["timestamps_seconds"] = [i/24 for i in range(24)]
        if identity(source) != before:
            raise ValueError("Native file changed during extraction")
        manifest["clips"].append({"intended_angle_degrees": angle,
                                  "native": {"path": str(source), **before, **native},
                                  "retimed": {"path": timed.name, "diagnostic": True, **identity(timed), **retimed,
                                              "interpretation": "Entire observed clip compressed to one second, audio omitted; not a certified gait cycle"},
                                  "visual_samples": contacts, "first_last": closure, "sprites": sprite,
                                  "review": {"observed_gait_cycles": None, "loop_closure": "unreviewed",
                                             "fixed_camera": "unreviewed", "identity": "unreviewed",
                                             "foot_contacts": "unreviewed"}})
    target = output/"video-derivatives-manifest.json"
    target.write_text(json.dumps(manifest, indent=2)+"\n")
    print(target)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--angle105", type=Path, required=True)
    parser.add_argument("--angle120", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--samples", type=int, choices=[6, 12], default=6)
    parser.add_argument("--sample-size", type=int, choices=[256, 384], default=384)
    parser.add_argument("--sprites", action="store_true", help="Also create two 24-frame 256px tile sheets")
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg")
    parser.add_argument("--ffprobe", default=shutil.which("ffprobe") or "/opt/homebrew/bin/ffprobe")
    extract(parser.parse_args())


if __name__ == "__main__":
    main()
