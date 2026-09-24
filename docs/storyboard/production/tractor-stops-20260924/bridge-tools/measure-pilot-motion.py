import cv2,numpy as np,json,sys
from pathlib import Path
p=Path(sys.argv[1])
files=sorted((p/"check").glob("raw-*.png"));seeds=np.float32([[270,475],[535,450],[925,475],[1075,475]]).reshape(-1,1,2);points=seeds.copy();prev=cv2.imread(str(files[0]),0);rows=[]
for n,f in enumerate(files):
 img=cv2.imread(str(f),0)
 if n:
  points,status,error=cv2.calcOpticalFlowPyrLK(prev,img,points,None,winSize=(41,41),maxLevel=3,criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,40,.001))
 else:status=np.ones((4,1));error=np.zeros((4,1))
 rows.append({"frame":n,"seconds":n/24,"centers":points.reshape(-1,2).tolist(),"displacementFromFirstPixels":(points-seeds).reshape(-1,2).tolist(),"trackingStatus":status.ravel().tolist(),"trackingError":error.ravel().tolist()});prev=img
trajectory=np.array([r["centers"] for r in rows]);lo=np.minimum(trajectory[0],trajectory[-1]);hi=np.maximum(trajectory[0],trajectory[-1]);outside=np.maximum(np.maximum(lo-trajectory,trajectory-hi),0);overshoot=np.linalg.norm(outside,axis=2).max(axis=0);span=trajectory[:,3,0]-trajectory[:,0,0]
summary={"maxEndpointBoxOvershootPixels":overshoot.tolist(),"horizontalOuterHubSpanFirst":float(span[0]),"horizontalOuterHubSpanLast":float(span[-1]),"horizontalOuterHubSpanMin":float(span.min()),"horizontalOuterHubSpanMax":float(span.max()),"spanOvershootBeyondEndpoints":float(max(span.max()-max(span[0],span[-1]),min(span[0],span[-1])-span.min(),0))}
out={"summary":summary,"method":"Manually seeded visible wheel hubs; pyramidal Lucas-Kanade image-space tracking,41px window. This estimates hub motion, not measured 3D motion or wheel rotation. Coordinates1280x720.","order":["tractorFront","tractorRear","trailerFront","trailerRear"],"frames":rows};(p/"wheel-motion.json").write_text(json.dumps(out,indent=2)+"\n");print(json.dumps({"summary":summary,"first":rows[0],"middle":rows[len(rows)//2],"last":rows[-1]}))
