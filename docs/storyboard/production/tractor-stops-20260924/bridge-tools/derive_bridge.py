import subprocess,json,hashlib,sys
from pathlib import Path
import cv2
import numpy as np
p=Path(sys.argv[1]); config=json.loads((p/"config.json").read_text()); raw=Path(config["output"]); version=raw.stem.rsplit("-",1)[1]; (p/"check").mkdir(exist_ok=True); ff="/opt/homebrew/bin/ffmpeg"
def run(args): subprocess.run([ff,"-hide_banner","-loglevel","error",*args],check=True)
run(["-i",str(raw),"-vsync","0","-y",str(p/"check/raw-%03d.png")])
frames=sorted((p/"check").glob("raw-*.png"))
metrics={}
for name,frame,ref in [("start",frames[0],Path(config["sourceImage"])),("end",frames[-1],Path(config["endImage"]))]:
 a=cv2.imread(str(frame)).astype(float);b=cv2.imread(str(ref)).astype(float);e=np.abs(a-b);metrics[name]={"meanAbsoluteRGBError":float(e.mean()),"p95AbsoluteRGBError":float(np.percentile(e,95)),"referenceSha256":hashlib.sha256(ref.read_bytes()).hexdigest()}
for name,vf in [("in",None),("out","reverse")]:
 args=["-i",str(raw)]
 if vf:args += ["-vf",vf]
 run(args+["-an","-c:v","libx264","-crf","16","-preset","fast","-g","1","-keyint_min","1","-pix_fmt","yuv420p","-movflags","+faststart","-y",str(p/f"bridge-{name}-{version}.mp4")])
metrics["note"]="Generated raw frames preserved; no endpoint replacement or crossfade. Forward and reverse are local all-intra encodings of the same decoded sequence; lossy codec differences remain."
(p/"endpoint-check.json").write_text(json.dumps(metrics,indent=2)+"\n")
print(json.dumps(metrics))
