// Atlas field (sprite-trial sandbox): walkable ground, ground depth and light, baked into one texture by
// scripts/atlas-field/build-field.py. R = walkable, G = ground depth (black near), B = light (128 neutral).
// An optional second texture holds the tone of the light (RGB, 128 = white, luma-normalized).
// Optional opaque RG16 SDF replaces collision masks only: distance = (R*256 + G - bias) / scale.
(function() {
  function createField(rgba,width,height,toneRgba=null,walkRgba=null,bodyRgba=null,sdfSpec=null) {
    const clearance=sdfSpec?.clearance ?? 3,softRange=sdfSpec?.softRange ?? 18;
    let distances=null;
    if(sdfSpec) {
      const {dataRGBA,scale=16,bias=32768}=sdfSpec;
      if(!Number.isInteger(width) || !Number.isInteger(height) || width<1 || height<1 ||
          dataRGBA?.length!==width*height*4 || !Number.isFinite(scale) || scale<=0 ||
          !Number.isFinite(bias) || !Number.isFinite(clearance) || clearance<0 ||
          !Number.isFinite(softRange) || softRange<=0)throw new Error('Invalid atlas SDF specification');
      distances=new Float32Array(width*height);
      for(let i=0;i<distances.length;i++) {
        const p=i*4;
        if(dataRGBA[p+2]!==0 || dataRGBA[p+3]!==255)throw new Error('Atlas SDF must be opaque RG16 with B=0');
        distances[i]=(dataRGBA[p]*256+dataRGBA[p+1]-bias)/scale;
      }
    }
    const inside=(x,y) => Number.isFinite(x) && Number.isFinite(y) && x>=0 && y>=0 && x<=width-1 && y<=height-1;
    function signedDistance(x,y) {
      if(!distances || !inside(x,y))return -Infinity;
      const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(x0+1,width-1),y1=Math.min(y0+1,height-1);
      const tx=x-x0,ty=y-y0;
      return (distances[y0*width+x0]*(1-tx)+distances[y0*width+x1]*tx)*(1-ty)+
        (distances[y1*width+x0]*(1-tx)+distances[y1*width+x1]*tx)*ty;
    }
    function distanceGradient(x,y,h=1) {
      if(!inside(x,y) || !Number.isFinite(h) || h<=0)return [0,0];
      const left=Math.max(0,x-h),right=Math.min(width-1,x+h),top=Math.max(0,y-h),bottom=Math.min(height-1,y+h);
      return [right>left ? (signedDistance(right,y)-signedDistance(left,y))/(right-left) : 0,
        bottom>top ? (signedDistance(x,bottom)-signedDistance(x,top))/(bottom-top) : 0];
    }
    // Along a segment, bilinear distance is quadratic within each pixel. Split at pixel edges and
    // quadratic extrema so a narrow dip cannot be skipped, even when both endpoints are clear.
    function sweepFraction(from,to,margin) {
      const x=from[0],y=from[1],dx=to[0]-x,dy=to[1]-y;
      if(!inside(x,y) || !Number.isFinite(dx) || !Number.isFinite(dy))return 0;
      if(!dx && !dy)return signedDistance(x,y)>=margin ? 1 : 0;
      let limit=1;
      if(dx>0)limit=Math.min(limit,(width-1-x)/dx);else if(dx<0)limit=Math.min(limit,-x/dx);
      if(dy>0)limit=Math.min(limit,(height-1-y)/dy);else if(dy<0)limit=Math.min(limit,-y/dy);
      let edgeX=dx>0 ? Math.floor(x)+1 : Math.ceil(x)-1,edgeY=dy>0 ? Math.floor(y)+1 : Math.ceil(y)-1;
      let t=0;
      while(t<limit) {
        const tx=dx ? (edgeX-x)/dx : Infinity,ty=dy ? (edgeY-y)/dy : Infinity;
        const end=Math.min(limit,tx,ty),span=end-t;
        const v0=signedDistance(x+dx*t,y+dy*t),v1=signedDistance(x+dx*end,y+dy*end);
        const middle=t+span/2,vm=signedDistance(x+dx*middle,y+dy*middle);
        const a=2*(v0+v1-2*vm),b=v1-v0-a,vertex=a ? -b/(2*a) : -1;
        let lo=0;
        for(let part=0;part<2;part++) {
          const hi=part===0 && vertex>0 && vertex<1 ? vertex : 1;
          const startValue=v0+lo*(b+a*lo),endValue=v0+hi*(b+a*hi);
          if(startValue<margin && endValue<=startValue)return t+span*lo;
          if(startValue>=margin && endValue<margin) {
            let safe=lo,blocked=hi;
            for(let i=0;i<32;i++) {
              const m=(safe+blocked)/2;
              if(v0+m*(b+a*m)>=margin)safe=m;else blocked=m;
            }
            return t+span*safe;
          }
          if(hi===1)break;
          lo=hi;
        }
        t=end;
        if(tx<=end)edgeX+=Math.sign(dx);
        if(ty<=end)edgeY+=Math.sign(dy);
      }
      return limit;
    }
    function sweep(from,to,margin=clearance) {
      if(!Number.isFinite(margin) || margin<0)throw new Error('Invalid atlas SDF clearance');
      const fraction=sweepFraction(from,to,margin);
      return {point:[from[0]+(to[0]-from[0])*fraction,from[1]+(to[1]-from[1])*fraction],fraction,blocked:fraction<1};
    }
    function recoverInitialPoint(from,maxRadius=64) {
      if(!inside(...from))return null;
      if(signedDistance(...from)>=clearance)return from.slice();
      const cx=Math.round(from[0]),cy=Math.round(from[1]);let best=null,bestDistance=Infinity;
      // One-time bounded initialization, never a substitute for collision during travel.
      for(let radius=0;radius<=maxRadius && radius-1<=bestDistance;radius++) {
        for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++) {
          if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
          const x=cx+dx,y=cy+dy,d=Math.hypot(x-from[0],y-from[1]);
          if(d>=bestDistance || signedDistance(x,y)<clearance)continue;
          const candidate=[x,y];
          if(sweepFraction(from,candidate,clearance)===1) {best=candidate;bestDistance=d;}
        }
      }
      return best;
    }
    const at=(x,y,channel) => {
      const px=Math.max(0,Math.min(width-1,Math.round(x))),py=Math.max(0,Math.min(height-1,Math.round(y)));
      return rgba[(py*width+px)*4+channel];
    };
    const smooth=(x,y,channel,source=rgba) => {
      // Bilinear: size and light drift smoothly under the feet.
      const fx=Math.max(0,Math.min(width-1.001,x)),fy=Math.max(0,Math.min(height-1.001,y));
      const x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0;
      const v=(xx,yy) => source[(yy*width+xx)*4+channel];
      return (v(x0,y0)*(1-tx)+v(x0+1,y0)*tx)*(1-ty)+(v(x0,y0+1)*(1-tx)+v(x0+1,y0+1)*tx)*ty;
    };
    // SDF nodes use the clearest pixel in each small cell; links, not cell corners, prove clearance.
    const CELL=distances ? 3 : 6;
    const cols=Math.ceil(width/CELL),rows=Math.ceil(height/CELL);
    let open=null,nodeX=null,nodeY=null,nodeClearance=null,knownLinks=null,clearLinks=null;
    const neighbourDirections=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
    function prepareGrid() {
      if(open)return;
      open=new Uint8Array(cols*rows);
      if(distances) {nodeX=new Float32Array(open.length);nodeY=new Float32Array(open.length);nodeClearance=new Float32Array(open.length);
        knownLinks=new Uint8Array(open.length);clearLinks=new Uint8Array(open.length);}
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++) {
        const x=c*CELL,y=r*CELL,e=CELL-1;
        if(distances) {
          const i=r*cols+c;let best=-Infinity,bx=x,by=y;
          for(let py=y;py<Math.min(y+CELL,height);py++)for(let px=x;px<Math.min(x+CELL,width);px++) {
            const d=distances[py*width+px];
            if(d>best) {best=d;bx=px;by=py;}
          }
          nodeX[i]=bx;nodeY[i]=by;nodeClearance[i]=best;open[i]=best>=clearance ? 1 : 0;continue;
        }
        open[r*cols+c]=[[x+CELL/2,y+CELL/2],[x,y],[x+e,y],[x,y+e],[x+e,y+e]].every(([px,py]) =>
          distances ? signedDistance(Math.min(px,width-1),Math.min(py,height-1))>=clearance : at(px,py,0)>127) ? 1 : 0;
      }
    }
    const cellOf=([x,y]) => [Math.max(0,Math.min(cols-1,Math.floor(x/CELL))),Math.max(0,Math.min(rows-1,Math.floor(y/CELL)))];
    const isOpen=(c,r) => c>=0 && r>=0 && c<cols && r<rows && open[r*cols+c]===1;
    const centre=(c,r) => distances ? [nodeX[r*cols+c],nodeY[r*cols+c]] :
      [Math.min(width-1,(c+.5)*CELL),Math.min(height-1,(r+.5)*CELL)];
    function nearestOpen([c,r],limit=60) {
      if(isOpen(c,r))return [c,r];
      for(let radius=1;radius<=limit;radius++) {
        let best=null,bestD=Infinity;
        for(let dc=-radius;dc<=radius;dc++)for(const dr of [-radius,radius]) {
          for(const [cc,rr] of [[c+dc,r+dr],[c+dr,r+dc]])if(isOpen(cc,rr)) {
            const d=Math.hypot(cc-c,rr-r);if(d<bestD) {bestD=d;best=[cc,rr];}
          }
        }
        if(best)return best;
      }
      return null;
    }
    function visible(a,b) {
      if(!inside(...a) || !inside(...b))return false;
      if(distances)return signedDistance(...a)>=clearance && sweepFraction(a,b,clearance)===1;
      let [c,r]=cellOf(a);const [endC,endR]=cellOf(b),dx=b[0]-a[0],dy=b[1]-a[1];
      const sx=Math.sign(dx),sy=Math.sign(dy),stepX=dx ? CELL/Math.abs(dx) : Infinity,stepY=dy ? CELL/Math.abs(dy) : Infinity;
      let tx=dx ? ((c+(sx>0 ? 1 : 0))*CELL-a[0])/dx : Infinity;
      let ty=dy ? ((r+(sy>0 ? 1 : 0))*CELL-a[1])/dy : Infinity;
      if(!isOpen(c,r))return false;
      while(c!==endC || r!==endR) {
        if(Math.abs(tx-ty)<1e-10) {
          if(!isOpen(c+sx,r) || !isOpen(c,r+sy))return false;
          c+=sx;r+=sy;tx+=stepX;ty+=stepY;
        } else if(tx<ty) {c+=sx;tx+=stepX;}else {r+=sy;ty+=stepY;}
        if(!isOpen(c,r))return false;
      }
      return true;
    }
    // Grid A* (8-neighbour, no corner cutting), then string-pulled into a few straight legs.
    function linked(i,j,direction) {
      const bit=1<<direction;
      if(!(knownLinks[i]&bit)) {
        const reverse=1<<(7-direction),valid=sweepFraction([nodeX[i],nodeY[i]],[nodeX[j],nodeY[j]],clearance)===1;
        knownLinks[i]|=bit;knownLinks[j]|=reverse;
        if(valid) {clearLinks[i]|=bit;clearLinks[j]|=reverse;}
      }
      return Boolean(clearLinks[i]&bit);
    }
    function plan(from,to,options={}) {
      if(!inside(...from) || !inside(...to))return null;
      if(distances && visible(from,to))return [from.slice(),to.slice()];
      prepareGrid();
      let start=nearestOpen(cellOf(from),8),goal=nearestOpen(cellOf(to));
      if(!start || !goal)return null;
      if(distances) {
        if(signedDistance(...from)<clearance)return null;
        const [c,r]=cellOf(from);let best=Infinity;start=null;
        for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++)if(isOpen(c+dc,r+dr)) {
          const p=centre(c+dc,r+dr),d=Math.hypot(p[0]-from[0],p[1]-from[1]);
          if(d<best && visible(from,p)) {best=d;start=[c+dc,r+dr];}
        }
        if(!start)return null;
      } else if(!isOpen(...cellOf(from)))return null;
      const goalPoint=(distances ? signedDistance(...to)>=clearance && visible(centre(...goal),to) : isOpen(...cellOf(to))) ? to.slice() : centre(...goal);
      if(visible(from,goalPoint))return [from.slice(),goalPoint];
      const n=cols*rows,g=new Float32Array(n).fill(Infinity),came=new Int32Array(n).fill(-1),closed=new Uint8Array(n);
      const s=start[1]*cols+start[0],t=goal[1]*cols+goal[0],heap=[];
      const h=i => distances ? Math.hypot(nodeX[i]-goalPoint[0],nodeY[i]-goalPoint[1])/CELL :
        Math.hypot(i%cols-goal[0],Math.floor(i/cols)-goal[1]);
      const push=(i,f) => {heap.push([f,i]);let k=heap.length-1;while(k>0) {const p=(k-1)>>1;if(heap[p][0]<=heap[k][0])break;[heap[p],heap[k]]=[heap[k],heap[p]];k=p;}};
      const pop=() => {const top=heap[0],last=heap.pop();if(heap.length) {heap[0]=last;let k=0;for(;;) {const l=2*k+1,r=l+1;let m=k;
        if(l<heap.length && heap[l][0]<heap[m][0])m=l;if(r<heap.length && heap[r][0]<heap[m][0])m=r;if(m===k)break;[heap[m],heap[k]]=[heap[k],heap[m]];k=m;}}return top;};
      g[s]=0;push(s,h(s));let best=s;
      while(heap.length) {
        const [,i]=pop();if(closed[i])continue;closed[i]=1;if(h(i)<h(best))best=i;if(i===t)break;
        const c=i%cols,r=Math.floor(i/cols);
        for(let direction=0;direction<8;direction++) {
          const [dc,dr]=neighbourDirections[direction];
          const cc=c+dc,rr=r+dr;
          if(!isOpen(cc,rr) || (!distances && dc && dr && (!isOpen(c+dc,r) || !isOpen(c,r+dr))))continue;
          const j=rr*cols+cc;
          if(distances && !linked(i,j,direction))continue;
          let step=dc && dr ? Math.SQRT2 : 1;
          if(distances) {
            const dx=nodeX[j]-nodeX[i],dy=nodeY[j]-nodeY[i],length=Math.hypot(dx,dy),previous=came[i];
            const angle=Number.isFinite(options.heading) ? options.heading*Math.PI/180 : null;
            const px=previous>=0 ? nodeX[i]-nodeX[previous] : angle===null ? dx : Math.cos(angle);
            const py=previous>=0 ? nodeY[i]-nodeY[previous] : angle===null ? dy : Math.sin(angle);
            const bend=1-(px*dx+py*dy)/(Math.hypot(px,py)*length || 1);
            const soft=1-Math.min(1,Math.max(0,(Math.min(nodeClearance[i],nodeClearance[j])-clearance)/softRange));
            step=length/CELL*(1+(options.clearanceWeight ?? .65)*soft)+(options.headingWeight ?? .3)*bend;
          }
          const cost=g[i]+step;
          if(cost<g[j]) {g[j]=cost;came[j]=i;push(j,cost+h(j));}
        }
      }
      // Unreachable goal (an island): walk to the closest ground he can reach instead.
      const end=closed[t] ? t : best;
      if(end===s)return null;
      const cells=[];for(let i=end;i!==-1;i=came[i])cells.unshift(centre(i%cols,Math.floor(i/cols)));
      if(end===t)cells[cells.length-1]=goalPoint;
      const path=[from.slice()];let k=0;const all=[from.slice(),...cells];
      while(k<all.length-1) {
        let far=k+1;for(let m=all.length-1;m>k+1;m--)if(visible(all[k],all[m])) {far=m;break;}
        if(!visible(all[k],all[far]))return null;
        path.push(all[far]);k=far;
      }
      return path;
    }
    // Soft walkability (0..1) for continuous steering: the optional soft texture (walkRgba, grey), else the binary
    // walkable channel, blurred (three box passes, ~6 px sigma) so edges become gentle slopes, never hard steps.
    const soft=distances ? null : new Float32Array(width*height);
    if(soft) {
      for(let i=0;i<width*height;i++)soft[i]=(walkRgba || rgba)[i*4]/255;
      const tmp=new Float32Array(width*height),R=6;
      const pass=(src,dst,n,count,stride,line) => {
        for(let l=0;l<count;l++) {
          const base=l*line;let sum=0;
          for(let k=-R;k<=R;k++)sum+=src[base+Math.max(0,Math.min(n-1,k))*stride];
          for(let k=0;k<n;k++) {
            dst[base+k*stride]=sum/(2*R+1);
            sum+=src[base+Math.min(n-1,k+R+1)*stride]-src[base+Math.max(0,k-R)*stride];
          }
        }
      };
      for(let p=0;p<3;p++) {pass(soft,tmp,width,height,1,width);pass(tmp,soft,height,width,width,1);}
    }
    const ground=(x,y) => {
      const fx=Math.max(0,Math.min(width-1.001,x)),fy=Math.max(0,Math.min(height-1.001,y));
      const x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0,i=y0*width+x0;
      return (soft[i]*(1-tx)+soft[i+1]*tx)*(1-ty)+(soft[i+width]*(1-tx)+soft[i+width+1]*tx)*ty;
    };
    // Body field (scripts/atlas-field/build-body-field.py): his whole silhouette per heading (0,45..315), so he never
    // sinks into a wall or wheel or slips behind the trailer; side-on he is wider than facing north. Headings between
    // two layers blend continuously.
    const bodyLayer=(layer,x,y) => {
      const rgba=layer<4 ? bodyRgba[0] : bodyRgba[1],c=layer%4;
      const fx=Math.max(0,Math.min(width-1.001,x)),fy=Math.max(0,Math.min(height-1.001,y));
      const x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0,i=(y0*width+x0)*4+c,w4=width*4;
      return ((rgba[i]*(1-tx)+rgba[i+4]*tx)*(1-ty)+(rgba[i+w4]*(1-tx)+rgba[i+w4+4]*tx)*ty)/255;
    };
    const walkability=(x,y,heading) => {
      if(distances) {
        const t=Math.max(0,Math.min(1,(signedDistance(x,y)-clearance)/softRange));
        return t*t*(3-2*t);
      }
      if(!bodyRgba || !Number.isFinite(heading))return ground(x,y);
      const h=((heading%360)+360)%360/45,l=Math.floor(h)%8,t=h-Math.floor(h);
      return bodyLayer(l,x,y)*(1-t)+bodyLayer((l+1)%8,x,y)*t;
    };
    // Points toward more walkable ground; its length is the slope (per pixel).
    const walkGradient=(x,y,heading,h=4) => [(walkability(x+h,y,heading)-walkability(x-h,y,heading))/(2*h),
      (walkability(x,y+h,heading)-walkability(x,y-h,heading))/(2*h)];
    const walkable=(x,y) => {
      if(distances)return signedDistance(x,y)>=clearance;
      prepareGrid();return inside(x,y) && isOpen(...cellOf([x,y]));
    };
    const api={width,height,plan,walkability,walkGradient,walkable,
      ...(distances ? {signedDistance,distanceGradient,sweep,recoverInitialPoint} : {}),
      ...(distances && window.AtlasGroundPlanner ? {createNavigator:options=>window.AtlasGroundPlanner.create(api,options)} : {}),
      groundDepth:(x,y) => smooth(x,y,1)/255,light:(x,y) => smooth(x,y,2)/128,
      tone:toneRgba ? (x,y) => [0,1,2].map(c => smooth(x,y,c,toneRgba)/128) : null};
    return api;
  }
  function pixels(src) {
    const image=new Image();image.src=src;
    return image.decode().then(() => {
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
      return {data:ctx.getImageData(0,0,canvas.width,canvas.height).data,width:canvas.width,height:canvas.height};
    });
  }
  function load(src,toneSrc,walkSrc,bodySrcs,sdfSpec=null) {
    // The tone is optional: without it he is only brightened or darkened. The soft walk map and body field are too.
    const same=(f,t) => t && t.width===f.width && t.height===f.height ? t.data : null;
    const optional=value => value ? pixels(value).catch(() => null) : null;
    if(sdfSpec) {
      if(!sdfSpec.src)return Promise.reject(new Error('Atlas SDF source is required'));
      return Promise.all([pixels(src),optional(toneSrc),pixels(sdfSpec.src),
        window.AtlasGroundPlanner ? null : import('./atlas-ground-planner.js')]).then(([f,t,s]) => {
        if(!same(f,s))throw new Error('Atlas SDF dimensions must match the base field');
        return createField(f.data,f.width,f.height,same(f,t),null,null,{...sdfSpec,dataRGBA:s.data});
      });
    }
    return Promise.all([pixels(src),optional(toneSrc),optional(walkSrc),optional(bodySrcs?.[0]),optional(bodySrcs?.[1])])
      .then(([f,t,w,a,b]) => {
        const body=same(f,a) && same(f,b) ? [a.data,b.data] : null;
        return createField(f.data,f.width,f.height,same(f,t),same(f,w),body);
      });
  }
  window.AtlasField={createField,load};
})();
