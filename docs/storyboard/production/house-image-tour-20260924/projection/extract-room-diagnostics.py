from pathlib import Path
import subprocess,sys,concurrent.futures
root=Path(__file__).resolve().parents[1]
jobs=[(room,name,yaw,pitch) for room in ['bath','bedroom'] for name,yaw,pitch in [('up',0,90),('down',0,-90),('rear',180,0)]]+[('bath','front',0,0)]
def run(job):
 room,name,yaw,pitch=job
 subprocess.run([sys.executable,str(root/'projection/project.py'),'extract','--input',str(root/room/'panorama-v1.png'),'--output',str(root/room/(name+'-before.png')),'--yaw',str(yaw),'--pitch',str(pitch),'--fov','110','--size','1254'],check=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(run,jobs))
