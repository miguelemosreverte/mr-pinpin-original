// Independent depth mesh math. World coordinates and UVs share a top-left origin.
export const WIDTH = 1536, HEIGHT = 1024, COLS = 64, ROWS = 44;
export function createMesh(depth) {
  const count=(COLS+1)*(ROWS+1), source=new Float32Array(count*5), indices=[];
  for(let j=0;j<=ROWS;j++)for(let i=0;i<=COLS;i++){
    const k=(j*(COLS+1)+i)*5;
    source.set([i*WIDTH/COLS,j*HEIGHT/ROWS,i/COLS,j/ROWS,depth[j*(COLS+1)+i]],k);
    if(i<COLS&&j<ROWS){const a=j*(COLS+1)+i,b=a+1,c=a+COLS+1,d=c+1;indices.push(a,b,c,b,d,c);}
  }
  return {source,vertices:new Float32Array(source),indices:new Uint16Array(indices)};
}
export function projectMesh(mesh,camera) {
  const vx=(camera.x-WIDTH/2)/(WIDTH/2),vy=(camera.y-HEIGHT/2)/(HEIGHT/2);
  const originalArea=WIDTH/COLS*HEIGHT/ROWS;
  // A fixed outer boundary prevents exposed edges; reject excessive local folding.
  for(let strength=1;strength>=.0625;strength/=2){
    for(let k=0;k<mesh.source.length;k+=5){
      const [x,y,,,d]=mesh.source.subarray(k,k+5);
      const edge=Math.min(1,x/120,(WIDTH-x)/120,y/100,(HEIGHT-y)/100);
      const z=d-.28, gain=edge*strength;
      mesh.vertices[k]=x+gain*(-vx*52*z+vy*5*z*(x/WIDTH-.5));
      mesh.vertices[k+1]=y+gain*(-vy*36*z+vx*7*z*(y/HEIGHT-.5));
    }
    let safe=true;
    for(let i=0;i<mesh.indices.length;i+=3){
      const a=mesh.indices[i]*5,b=mesh.indices[i+1]*5,c=mesh.indices[i+2]*5,v=mesh.vertices;
      if((v[b]-v[a])*(v[c+1]-v[a+1])-(v[b+1]-v[a+1])*(v[c]-v[a])<originalArea*.3){safe=false;break;}
    }
    if(safe)return;
  }
  mesh.vertices.set(mesh.source);
}
export function projectPoint(mesh,x,y) {
  const gx=Math.max(0,Math.min(COLS,x/WIDTH*COLS)),gy=Math.max(0,Math.min(ROWS,y/HEIGHT*ROWS));
  const i=Math.min(COLS-1,Math.floor(gx)),j=Math.min(ROWS-1,Math.floor(gy)),u=gx-i,v=gy-j;
  const a=j*(COLS+1)+i,b=a+1,c=a+COLS+1,d=c+1;
  const ids=u+v<=1?[a,b,c]:[d,c,b],weights=u+v<=1?[1-u-v,u,v]:[u+v-1,1-u,1-v];
  return [0,1,4].map(axis=>ids.reduce((value,id,n)=>value+mesh.vertices[id*5+axis]*weights[n],0));
}
