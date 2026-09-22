const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../docs/storyboard');
const cache=new Map();
function image(src) {
  if(!cache.has(src)) {
    const file=path.join(root,src),size=execFileSync('magick',['identify','-format','%w %h',file],{encoding:'utf8'}).split(' ').map(Number);
    cache.set(src,{width:size[0],height:size[1],data:execFileSync('magick',[file,'-depth','8','rgba:-'],{maxBuffer:32*1024*1024})});
  }
  return cache.get(src);
}
function opaque(im,crop,rect) {
  for(let y=rect[1];y<rect[1]+rect[3];y++)for(let x=rect[0];x<rect[0]+rect[2];x++) {
    if(x<0 || y<0 || x>=crop[2] || y>=crop[3] || im.data[((y+crop[1])*im.width+x+crop[0])*4+3]<245)return false;
  }
  return true;
}
function borderError(open,closed,crop,bounds,feather) {
  let sum=0,max=0,count=0;
  const [x0,y0,w,h]=bounds;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    if(Math.min(x,y,w-1-x,h-1-y)>feather)continue;
    const p=((y+y0+crop[1])*open.width+x+x0+crop[0])*4;
    const q=((y+y0+crop[1])*closed.width+x+x0+crop[0])*4;
    for(let c=0;c<3;c++){const delta=Math.abs(open.data[p+c]-closed.data[q+c]);sum+=delta;max=Math.max(max,delta);count++;}
  }
  return {mean:sum/count,max};
}
function detect(open,closed,frame,angle) {
  if(angle>195)return [];
  const [ox,oy,w,h]=frame.rect,mask=new Uint8Array(w*h),mirror=angle>90;
  const front=Math.min(angle,180-angle),x0=front<30?.6:front<60?.4:.14;
  const y0=front<30?.15:front<60?.32:.48,y1=front<30?.72:.89;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const fx=mirror ? 1-x/w : x/w;
    if(fx<x0 || fx>.98 || y/h<y0 || y/h>y1)continue;
    const p=((y+oy)*open.width+x+ox)*4,q=((y+oy)*closed.width+x+ox)*4;
    const a=(open.data[p]+open.data[p+1]+open.data[p+2])/3,b=(closed.data[q]+closed.data[q+1]+closed.data[q+2])/3;
    if(open.data[p+3]>=245 && closed.data[q+3]>=245 && a<145 && b>120 && b-a>55)mask[y*w+x]=1;
  }
  const groups=[];
  for(let i=0;i<mask.length;i++)if(mask[i]) {
    const queue=[i];mask[i]=0;let minX=w,minY=h,maxX=0,maxY=0;
    for(let j=0;j<queue.length;j++) {
      const p=queue[j],x=p%w,y=Math.floor(p/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]]) {
        const nx=x+dx,ny=y+dy,k=ny*w+nx;
        if(nx>=0 && nx<w && ny>=0 && ny<h && mask[k]){mask[k]=0;queue.push(k);}
      }
    }
    if(queue.length>=12 && maxX-minX>=4 && maxY-minY>=4 && maxX-minX<45 && maxY-minY<45)
      groups.push({rect:[minX,minY,maxX-minX+1,maxY-minY+1],area:queue.length});
  }
  const selected=groups.sort((a,b)=>b.area-a.area).slice(0,front<30 ? 1 : 2);
  return selected.flatMap(({rect})=>{
    const candidates=[];
    for(let p=5;p<=18;p++) {
      const bounds=[rect[0]-p,rect[1]-p,rect[2]+2*p,rect[3]+2*p];
      if(opaque(open,frame.rect,bounds) && opaque(closed,frame.rect,bounds)) {
        const error=borderError(open,closed,frame.rect,bounds,4);
        candidates.push({bounds,features:rect,feather:4,error});
      }
    }
    // Keep the eyelid interior intact while finding the quietest surrounding fur.
    candidates.sort((a,b)=>Number(b.error.mean<=12 && b.error.max<=60)-Number(a.error.mean<=12 && a.error.max<=60)
      || (a.error.mean+a.error.max*.05)-(b.error.mean+b.error.max*.05));
    return candidates.slice(0,1);
  });
}
function main() {
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'family-production.json'))),frames={},report=[];
  for(const character of manifest.characters)for(const direction of character.directions) {
    const src=direction.runtimeSrc,blink=src.replace(/-v1\.webp$/,'-blink-v1.webp');
    if(!fs.existsSync(path.join(root,blink)))continue;
    const open=image(src),closed=image(blink);
    if(open.width!==closed.width || open.height!==closed.height){report.push({src,issue:'dimensions'});continue;}
    direction.frames.forEach((frame,index)=>{
      const eyes=detect(open,closed,frame,direction.angle);if(!eyes.length)return;
      const id=src+'#'+direction.angle+'#'+index;
      const l=Math.min(...eyes.map(e=>e.bounds[0])),t=Math.min(...eyes.map(e=>e.bounds[1]));
      const r=Math.max(...eyes.map(e=>e.bounds[0]+e.bounds[2])),b=Math.max(...eyes.map(e=>e.bounds[1]+e.bounds[3]));
      const bounds=[l,t,r-l,b-t];
      frames[id]={enabled:true,registration:id,requireAllEyes:true,expectedEyes:direction.angle>0 && direction.angle<180 ? 2 : 1,
        bounds,pivot:[(l+r)/2,(t+b)/2],features:[l+4,t+4,r-l-8,b-t-8],
        maxTiltDegrees:0,feather:2,eyes:eyes.map(e=>({...e,blink:{src:blink,rect:frame.rect,registration:id,
          registrationTolerance:{meanError:12,maxError:60}}})),
        reviewStatus:'measured-eye-candidates-awaiting-visual-review'};
      if(character.id==='mama' && direction.angle===105) {
        frames[id].enabled=false;
        frames[id].reviewStatus='rejected-visible-tonal-boundary';
      }
      report.push({id,eyes:eyes.length,bounds});
    });
  }
  const result={version:1,reviewStatus:'measured-candidates',method:'Open-to-closed brightness components within heading-specific face search windows',frames};
  fs.writeFileSync(path.join(root,'family-faces.json'),JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync('/tmp/atlas-face-landmarks.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({frames:Object.keys(frames).length,eyes:report.reduce((n,r)=>n+(r.eyes||0),0)}));
}
if(require.main===module)main();
module.exports={detect,opaque};
