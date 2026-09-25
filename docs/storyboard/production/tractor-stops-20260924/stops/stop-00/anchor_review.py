#!/usr/bin/env python3
"""Render a fixed nine-view perimeter review; no art edits."""
import argparse,subprocess,concurrent.futures,cv2,numpy as np
from pathlib import Path
a=argparse.ArgumentParser();a.add_argument('--root',required=True);a.add_argument('--stop',required=True,type=int);a.add_argument('--panorama',default='panorama-source-locked-v1.png');a.add_argument('--label',default='anchor-review-v1');args=a.parse_args()
assert args.stop in {0,1,2,3,5,10,11,12}
b=Path(args.root);s=b/f'stops/stop-{args.stop:02d}';p=s/args.label;p.mkdir(exist_ok=True)
tool='/Volumes/TB4/mac-mini-storage/shared/pinpin-story-worlds-20260924/projection/project.py'
views=[('front',0,0),('left30',-30,0),('right30',30,0),('left60',-60,0),('right60',60,0),('down',0,-40),('up',0,35),('leftdown',-40,-35),('rightdown',40,-35)]
def run(v):
 name,yaw,pitch=v
 subprocess.run([str(b/'fit-env/bin/python'),tool,'extract','--input',str(s/args.panorama),'--output',str(p/(name+'.png')),'--yaw',str(yaw),'--pitch',str(pitch),'--fov','80','--size','900'],check=True,stdout=subprocess.DEVNULL)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as e:list(e.map(run,views))
out=np.full((1560,1500,3),255,np.uint8)
for i,(name,_,_) in enumerate(views):
 im=cv2.resize(cv2.imread(str(p/(name+'.png'))),(500,500));x=(i%3)*500;y=(i//3)*520;out[y+20:y+520,x:x+500]=im;cv2.putText(out,name,(x+5,y+16),cv2.FONT_HERSHEY_SIMPLEX,.5,(0,0,0),1)
cv2.imwrite(str(p/'contact.jpg'),out);print(str(p/'contact.jpg'))
