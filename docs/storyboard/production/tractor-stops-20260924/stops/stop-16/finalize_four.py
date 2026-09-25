import sys,json,hashlib,subprocess
from pathlib import Path
r=Path(__file__).resolve().parents[2]
project=Path("/Volumes/TB4/mac-mini-storage/shared/pinpin-story-worlds-20260924/projection/project.py")
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,x):p.write_text(json.dumps(x,indent=2)+"\n")
def run(*args):subprocess.run([sys.executable,*map(str,args)],check=True,stdout=subprocess.DEVNULL)
for i in map(int,sys.argv[1:]):
 assert i in range(16,20)
 d=r/"stops"/f"stop-{i:02d}"
 stack=json.loads((d/"after-rear-stack.json").read_text());stack["id"]=d.name
 for k in ["up","down"]:stack["inputs"][k]={"file":f"{k}-v1.png","sha256":sha(d/f"{k}-v1.png")};stack["repairs"]["assets"][k]=k
 write(d/"selected-stack.json",stack)
 c=json.loads((d/"fit-v1/fit.json").read_text())["camera"];camera={"yaw":c["yawRadians"],"pitch":c["pitchRadians"],"fov":c["verticalFovDegrees"]};write(d/"camera-v1.json",camera)
 cam=json.dumps(camera);b=d/"panorama-assembled-v1.png";s=d/"panorama-source-locked-v1.png";ex=d/"source-locked-exports-v1"
 if not b.exists():run(project,"assemble","--config",d/"selected-stack.json","--output",b,"--width",3072)
 print(i,"assembled",flush=True)
 if not s.exists():run(r/"source_anchor.py","--panorama",b,"--source",d/"source-display.png","--camera",cam,"--output",s,"--width",4096)
 print(i,"anchored",flush=True)
 if not (ex/"exports-v1.json").exists():run(project,"export","--input",s,"--output",ex,"--width",4096,"--face-size",1024)
 run(r/"extract_forward.py","--panorama",b,"--camera",cam,"--output",d/"forward.png","--helpers",r/"projection-tools")
 run(r/"extract_forward.py","--panorama",s,"--camera",cam,"--output",d/"forward-source-locked.png","--helpers",r/"projection-tools")
 run(r/"review_directions_13_23.py","--panorama",s,"--out",d/"review-final-v1","--camera",cam)
 run(r/"review_anchor_edges_c.py","--panorama",s,"--out",d/"review-edges-final-v1","--camera",cam)
 print(i,"exports and review ready",flush=True)
