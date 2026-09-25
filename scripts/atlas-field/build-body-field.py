#!/usr/bin/env python3
"""Bake the Atlas body field (sprite-trial sandbox): 2.5D collision for Mr. PinPin's whole body, per heading.

For every ground point and each of 8 headings, his walk-loop silhouette (alpha union over the 24 frames, the real
sheet, sized by ground depth like the runtime) is placed with its feet on that point. A silhouette pixel collides when
the scene there stands up from the ground (scene depth nearer than the ground beneath it) and that object is not
clearly behind him. Front/behind comes from where the object meets the ground (its base, the first ground pixel below
it on screen), not from its painted depth, which is artistic (the tractor reads nearer than the road in front of it).
An object whose base is below or level with his feet would hide him or he would sink into it (a wall, a door, a wheel). Walkability fades smoothly with
the colliding fraction and is multiplied by the (blurred) walkable ground of the field texture.

Output: two RGBA textures, 4 headings each (a: 0/45/90/135, b: 180/225/270/315), 255 = free, 0 = blocked.
"""
import argparse, json
import numpy as np, importlib.util, os
from PIL import Image, ImageDraw
_s=importlib.util.spec_from_file_location('bf',os.path.join(os.path.dirname(__file__),'build-field.py'));bf=importlib.util.module_from_spec(_s);_s.loader.exec_module(bf)

HEADINGS=[0,45,90,135,180,225,270,315]

def fblur(a,r):
  k=np.arange(-int(3*r)-1,int(3*r)+2);k=np.exp(-k*k/(2*r*r));k/=k.sum();n=len(k)//2
  a=np.pad(a.astype(np.float32),n,mode='edge')
  a=sum(k[i]*a[i:i+a.shape[0]-2*n,:] for i in range(len(k)))
  return sum(k[i]*a[:,i:i+a.shape[1]-2*n] for i in range(len(k)))

def smoothstep(a,b,x):
  t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)

def chamfer(mask,cap=64):
  """Distance (px, 3-4 chamfer) from every pixel to the nearest True pixel of mask, capped."""
  d=np.where(mask,0,cap).astype(np.float32);big=np.float32(cap)
  for _ in range(cap):
    p=np.pad(d,1,constant_values=big);n=np.minimum.reduce([p[1:-1,:-2]+1,p[1:-1,2:]+1,p[:-2,1:-1]+1,p[2:,1:-1]+1,
      p[:-2,:-2]+1.414,p[:-2,2:]+1.414,p[2:,:-2]+1.414,p[2:,2:]+1.414,d])
    if (n==d).all():break
    d=n
  return d

def signed_distance(walk,cap=64):
  """Signed distance to the walk/blocked boundary: positive on walkable ground, negative inside obstacles."""
  return chamfer(~walk,cap)-chamfer(walk,cap)

def silhouette(sheet,clip,grounding,body,step):
  """World-pixel offsets (at size 1) of the loop's alpha union, sampled every `step` world px."""
  im=np.asarray(Image.open(sheet).convert('RGBA'))[...,3]
  union=np.zeros(tuple(clip['frameSize'][::-1]),bool)
  for x,y,w,h in clip['frames']:union|=im[y:y+h,x:x+w]>=128
  scale=body/grounding['referenceWidth'];ys,xs=np.nonzero(union)
  wx=(xs+.5-grounding['anchor'][0])*scale;wy=(ys+.5-grounding['anchor'][1])*scale
  # Unique world grid cells; each keeps its height above the feet (0 at the feet).
  cells=np.unique(np.stack([np.round(wx/step),np.round(wy/step)],1).astype(int),axis=0)*step
  return cells.astype(np.float32)

def main():
  ap=argparse.ArgumentParser()
  ap.add_argument('--atlas',required=True);ap.add_argument('--sprites',required=True,help='preview-regen dir (manifest.json + sheets/)')
  ap.add_argument('--out-a',required=True);ap.add_argument('--out-b',required=True);ap.add_argument('--preview')
  ap.add_argument('--grid',type=int,default=2);ap.add_argument('--raise',type=float,default=22,dest='rise')
  ap.add_argument('--walk',help='generated walkability map (white walk, gray forest, black never): replaces the procedural classes');ap.add_argument('--margin',type=float,default=2,help='an object whose base is this far above the feet is behind him');ap.add_argument('--sdf-out',help='also save the signed distance (128 = edge, 4 levels per px, bright = walk)');ap.add_argument('--feet',type=float,default=4,help='ignore this many px above the feet')
  o=ap.parse_args()
  depth=np.asarray(Image.open(f'{o.atlas}/shire-depth-v1.webp').convert('RGB'))[...,0].astype(np.float32)
  field=np.asarray(Image.open(f'{o.atlas}/shire-field-v1.png').convert('RGB')).astype(np.float32)
  art=np.asarray(Image.open(f'{o.atlas}/shire-v1.webp').convert('RGB')).astype(np.float32)
  regions=np.asarray(Image.open(f'{o.atlas}/shire-regions-v2.png').convert('RGB')).astype(np.float32)
  H,W=depth.shape;d=fblur(depth,3);ground=field[...,1];walkable=field[...,0]>127
  near=lambda c:np.abs(regions-np.array(c)).max(-1)<60
  # Hard: water (as build-field.py finds it), the bridge outside its deck, the houses and the tractor + trailer.
  lake=near((255,0,0));outside=bf.img(lake*255).copy();ImageDraw.floodfill(outside,(0,0),128);lake=bf.arr(outside)!=128
  r,g,b=art[...,0],art[...,1],art[...,2];water=((b>r+18)&(g>r+8))|lake
  mx,mn=art.max(-1),art.min(-1);foam=(b>=r-4)&(mx-mn<70)&(.299*r+.587*g+.114*b>105)
  water|=fblur(foam.astype(np.float32),6)>.42;water=bf.erode(bf.dilate(water,7),5)&~walkable
  # Colour alone also finds stones, white flowers and blue shadows in the forest: keep only water that touches the
  # lake or forms a large body (the stream and falls).
  im=bf.img(water*1).copy();ys_,xs_=np.nonzero(water);keep=np.zeros((H,W),bool);tag=2
  for i in range(len(xs_)):
    x,y=int(xs_[i]),int(ys_[i])
    if im.getpixel((x,y))!=1:continue
    ImageDraw.floodfill(im,(x,y),tag);comp=np.asarray(im)==tag
    if comp.sum()>4000 or (comp&lake).any():keep|=comp
    tag=tag+1 if tag<250 else 2
  water=keep
  bx0,by0,bx1,by1=bf.BRIDGE;bridge=np.zeros((H,W),bool);bridge[by0:by1,bx0:bx1]=True
  # The deck is narrow at map scale: open it a few px wider so crossing is forgiving.
  walkable|=bf.dilate(walkable&bridge,7)&bridge;bridge&=~walkable
  houses=near((0,255,0))|near((128,0,255))
  # The home region runs down its stepping-stone path; below the front wall (y>738, right of the door) that is ground.
  houses[738:,335:]&=~near((0,255,0))[738:,335:]
  tractor=np.zeros((H,W),bool);tractor[715:788,1300:1470]=True;tractor&=d<ground-14
  # The house regions include the paths up to their doors: those stay ground (the body collision stops him at the door).
  hard=water|bridge|(houses&~walkable)|tractor
  # Solid objects his body collides with. Trees and bushes are not: they only hide him (forest is passable).
  raised=houses|tractor
  # Passable ground, soft: open ground 1, forest and brush .85 (walkable, he is hidden), hard 0.
  passable=np.where(walkable,1.,.85)
  # Soft falloff (~12 px) outside hard ground, so steering bends him along a wall before the hard stop; not on the
  # bridge, where the deck is narrow and flanked by railings and stream.
  box=np.zeros((H,W),bool);box[by0:by1,bx0:bx1]=True
  passable*=np.where(box,1,smoothstep(.02,.5,1-fblur(hard.astype(np.float32),3)*2))
  passable[hard]=0
  if o.walk:
    # The generated map is the source of truth: continuous passability, black is hard and solid for the body.
    gw=np.asarray(Image.open(o.walk).convert('L').resize((W,H),Image.BILINEAR)).astype(np.float32)/255
    # Signed distance field of the ground: walkability rises smoothly over the first ~16 px from an obstacle edge, so
    # steering feels the wall long before the hard stop; hard only inside obstacles.
    sdf=signed_distance(fblur(gw,1.5)>.5)
    if o.sdf_out:Image.fromarray(np.clip(128+sdf*4,0,255).astype(np.uint8),'L').save(o.sdf_out,optimize=True)
    hard=sdf<-.5;raised=hard.copy()
    passable=smoothstep(-.5,16,sdf)
  # Base of every solid pixel: scanning up from the bottom, the nearest non-solid row below it.
  base=np.empty((H,W),np.float32);row=np.full(W,H,np.float32)
  for y in range(H-1,-1,-1):
    row=np.where(raised[y],row,y);base[y]=row
  m=json.load(open(f'{o.sprites}/manifest.json'));g=m['grounding']
  body=m['normalization']['targetBodyWorldPx']
  ys,xs=np.mgrid[0:H:o.grid,0:W:o.grid].astype(np.float32)
  foot=ground[ys.astype(int),xs.astype(int)]
  # Same sizing as the runtime (depthRef .36, gain 1, clamp .72..1.22).
  size=np.clip(1+(.36-foot/255),.72,1.22)
  walk=fblur(passable,2)[ys.astype(int),xs.astype(int)]
  layers=[]
  for h in HEADINGS:
    cells=silhouette(f'{o.sprites}/sheets/loop{h:03d}.webp',m['clips'][f'loop{h:03d}'],g,body,2.0)
    cells=cells[cells[:,1]<-o.feet]  # the feet themselves touch the ground; grass at the toes is not a collision
    hit=np.zeros(xs.shape,np.float32)
    for cx,cy in cells:
      qx=np.clip((xs+cx*size).astype(int),0,W-1);qy=np.clip((ys+cy*size).astype(int),0,H-1)
      hit+=raised[qy,qx]&(base[qy,qx]>ys-o.margin*size)
    frac=hit/len(cells)
    free=walk*(1-smoothstep(.04,.18,frac))
    layers.append(free);print('heading',h,'cells',len(cells),'free>.5',round(float((free>.5).mean()),3))
  full=[np.asarray(Image.fromarray((np.clip(l,0,1)*255).astype(np.uint8)).resize((W,H),Image.BILINEAR)) for l in layers]
  full=[np.where(hard,0,np.clip(fblur(f,2),0,255)).astype(np.uint8) for f in full]
  Image.fromarray(np.stack(full[:4],-1),'RGBA').save(o.out_a,optimize=True)
  Image.fromarray(np.stack(full[4:],-1),'RGBA').save(o.out_b,optimize=True)
  if o.preview:
    art=np.asarray(Image.open(f'{o.atlas}/shire-v1.webp').convert('RGB')).astype(np.float32)
    tiles=[]
    for h,f in zip(HEADINGS,full):
      a=f[...,None]/255;tiles.append((art*(.35+.65*a)+np.array([200,30,30])*(1-a)*.5).clip(0,255))
    rows=[np.concatenate(tiles[i:i+4],1) for i in (0,4)]
    Image.fromarray(np.concatenate(rows,0).astype(np.uint8)).resize((W*2,H)).save(o.preview)

main()
