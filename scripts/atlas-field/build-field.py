#!/usr/bin/env python3
"""Build the Atlas field texture (sprite-trial sandbox) from the existing map layers.

  R  walkable (255) / blocked (0)
  G  ground depth under the feet (scene depth of walkable ground, filled under canopies); black near, white far
  B  light at the feet: 128 = neutral; shadows below, sunlit patches above
A second RGB texture (--tone) holds the tone of the light at the feet (L0 irradiance colour, luma-normalized: 128 = white).

Sources: shire-v1.webp (art), shire-depth-v1.webp (depth), shire-regions-v2.png (lake/home/elder/bridge),
the route graph edges (dumped from the page: motion.navigation.edges) and the ground-depth curve in gpu/occlusion.js.
"""
import argparse, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

GROUND=[(205,111),(400,125),(575,101),(640,91),(740,66),(845,66),(905,63)]
W,H=1536,1024

def ground_curve():
  ys=np.arange(H)+.5
  return np.interp(ys,[y for y,_ in GROUND],[d for _,d in GROUND])[:,None]*np.ones((1,W))

def img(a): return Image.fromarray(np.clip(a,0,255).astype(np.uint8))
def arr(im): return np.asarray(im).astype(np.float32)
def dilate(mask,size): return arr(img(mask*255).filter(ImageFilter.MaxFilter(size)))>127
def erode(mask,size): return arr(img(mask*255).filter(ImageFilter.MinFilter(size)))>127
def hclose(a,s):
  # Row-wise grey closing: the ground at the same row, with objects nearer than it removed.
  n=s//2;p=np.pad(a,((0,0),(n,n)),mode='edge');m=np.max(np.stack([p[:,i:i+a.shape[1]] for i in range(s)]),0)
  p=np.pad(m,((0,0),(n,n)),mode='edge');return np.min(np.stack([p[:,i:i+a.shape[1]] for i in range(s)]),0)
# The route line runs along the bridge's back railing; the deck he walks on is ~10 px lower (measured on the art).
DECK=[(866,610),(905,614),(960,607),(1005,600),(1040,595),(1062,583)]
BRIDGE=(875,560,1050,650)
def fblur(a,r):
  # Separable float Gaussian (PIL only blurs 8-bit images).
  k=np.arange(-int(3*r)-1,int(3*r)+2);k=np.exp(-k*k/(2*r*r));k/=k.sum();n=len(k)//2
  a=np.pad(a.astype(np.float32),n,mode='edge')
  a=sum(k[i]*a[i:i+a.shape[0]-2*n,:] for i in range(len(k)))
  return sum(k[i]*a[:,i:i+a.shape[1]-2*n] for i in range(len(k)))

def main():
  ap=argparse.ArgumentParser();ap.add_argument('--atlas',required=True);ap.add_argument('--edges',required=True)
  ap.add_argument('--out',required=True);ap.add_argument('--preview');ap.add_argument('--tone');o=ap.parse_args()
  art=arr(Image.open(f'{o.atlas}/shire-v1.webp').convert('RGB'))
  depth=arr(Image.open(f'{o.atlas}/shire-depth-v1.webp').convert('RGB'))[...,0]
  regions=arr(Image.open(f'{o.atlas}/shire-regions-v2.png').convert('RGB'))
  r,g,b=art[...,0],art[...,1],art[...,2]
  near=lambda c:np.abs(regions-np.array(c)).max(-1)<60
  lake,home,elder=near((255,0,0)),near((0,255,0)),near((128,0,255))
  # The lake region has holes where reflections were painted dark; everything it encloses is water.
  outside=img(lake*255).copy();ImageDraw.floodfill(outside,(0,0),128);lake=arr(outside)!=128

  # Road corridors: the old routes say where walking is expected; they also carve doorways and the bridge.
  road=Image.new('L',(W,H));draw=ImageDraw.Draw(road)
  for a,bb in json.load(open(o.edges)):draw.line([tuple(a),tuple(bb)],fill=255,width=26)
  for a,bb in json.load(open(o.edges)):
    for p in (a,bb):draw.ellipse([p[0]-13,p[1]-13,p[0]+13,p[1]+13],fill=255)
  road=arr(road)>127
  core=Image.new('L',(W,H));draw=ImageDraw.Draw(core)
  for a,bb in json.load(open(o.edges)):draw.line([tuple(a),tuple(bb)],fill=255,width=14)
  core=arr(core)>127
  bx0,by0,bx1,by1=BRIDGE;bridge=np.zeros((H,W),bool);bridge[by0:by1,bx0:bx1]=True
  deck=Image.new('L',(W,H));ImageDraw.Draw(deck).line(DECK,fill=255,width=16);deck=arr(deck)>127
  road&=~bridge;core&=~bridge

  # Standing objects: scene depth clearly nearer than the ground curve at that row (trees, houses, tractor).
  d=fblur(depth,1.5);raised=d<ground_curve()-14
  # Trees, bushes and rocks too small or far for the curve test: nearer than the ground beside them on the same row.
  local=np.maximum(hclose(d,41),hclose(d,91))-d>8
  raised|=dilate(erode(local,5),5)&~core
  # Water: turquoise/blue art pixels plus the lake region; foam is bright and blue-leaning.
  water=((b>r+18)&(g>r+8))|lake
  # Stream and falls: dense grey-blue-white foam (scattered white flowers stay below the density threshold).
  mx,mn=art.max(-1),art.min(-1)
  foam=(b>=r-4)&(mx-mn<70)&(.299*r+.587*g+.114*b>105)
  water|=fblur(foam.astype(np.float32),6)>.42
  water=erode(dilate(water,7),5)
  # Buildings: the home and elder regions are solid, except where a road leads to the door.
  building=(home|elder)&~dilate(road,3)
  # The tractor stands on its road: block its raised silhouette even there.
  tractor=np.zeros((H,W),bool);tractor[715:805,1300:1480]=True;tractor&=raised
  walk=((~raised&~water)|road)&~building&~dilate(tractor,9)
  walk=dilate(erode(walk,5),5)
  # On the bridge only the deck is ground (railings and the stream are not).
  walk=(walk&~bridge)|deck
  # Keep only ground connected to the road network (drops islands inside forests and on roofs).
  im=img(walk*128).copy();ys,xs=np.nonzero(road&walk)
  for i in range(0,len(xs),97):
    if im.getpixel((int(xs[i]),int(ys[i])))==128:ImageDraw.floodfill(im,(int(xs[i]),int(ys[i])),255)
  walk=arr(im)>200

  # Ground depth under the feet: scene depth of walkable ground, normalized-convolution fill elsewhere.
  # Heavy smoothing: size must drift with the terrain, never flicker with texture.
  wf=walk.astype(np.float32);num=fblur(d*wf,24);den=fblur(wf,24)
  groundDepth=np.where(den>.02,num/np.maximum(den,1e-3),ground_curve())
  groundDepth=fblur(groundDepth,8)

  # Light: local luminance against the bright envelope of its neighbourhood (sun level), so paint color matters less.
  L=.299*r+.587*g+.114*b
  env=fblur(arr(img(L).filter(ImageFilter.MaxFilter(31))),30)
  env=fblur(arr(img(L).filter(ImageFilter.MaxFilter(61))),40)
  light=np.clip(fblur(L,12)/np.maximum(env,1),0,1.6)
  light=np.clip(128*light/np.percentile(light[walk],80),0,255)

  if o.tone:
    # Tone of the light: colour of the neighbourhood (sun warmth, canopy and grass bounce) relative to the
    # map's walkable average, so painted albedo largely cancels; luma-normalized, so B keeps the brightness.
    # Water is excluded: its blue is paint, not light, and he never stands in it.
    dry=(~water).astype(np.float32);den=np.maximum(fblur(dry,18),1e-3)
    env=np.stack([fblur(art[...,c]*dry,18)/den for c in range(3)],-1)
    env/=env[walk].mean(0);env[fblur(dry,18)<.05]=1
    env/=np.maximum((.299*env[...,0]+.587*env[...,1]+.114*env[...,2])[...,None],1e-3)
    tone=np.clip(128*np.clip(env,.8,1.25),0,255)
    img(tone).save(o.tone,optimize=True)
    print('tone p5/p95 per channel',[[round(float(v)) for v in np.percentile(tone[...,c][walk],[5,95])] for c in range(3)])
  out=np.stack([walk*255,groundDepth,light],-1)
  img(out).save(o.out,optimize=True)
  if o.preview:
    tint=art.copy();tint[~walk]=tint[~walk]*.35+np.array([200,30,30])*.65
    lv=np.repeat(light[...,None],3,-1)
    dv=np.repeat(np.clip((groundDepth-50)*3,0,255)[...,None],3,-1)
    top=np.concatenate([tint,dv],1);bot=np.concatenate([lv,art*np.clip(light/128,.3,1.3)[...,None]],1)
    img(np.concatenate([top,bot],0)).resize((W,H)).save(o.preview)
  print('walkable',round(float(walk.mean()),3),'light p5/p50/p95',[round(float(v)) for v in np.percentile(light[walk],[5,50,95])])

if __name__=='__main__':main()
