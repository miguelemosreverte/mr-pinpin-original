import {SCENE} from './home-scene.js?v=expanded-20260922';
// Small WebGL renderer; no external rendering runtime or borrowed shaders.
const vertex=`attribute vec2 aPosition;attribute vec2 aUV;attribute float aDepth;
uniform vec2 uSize;uniform vec2 uCenter;uniform float uScale;
varying vec2 vUV;varying float vDepth;
void main(){vec2 p=(aPosition-uCenter)*uScale+uSize*.5;gl_Position=vec4(p.x/uSize.x*2.-1.,1.-p.y/uSize.y*2.,0.,1.);vUV=aUV;vDepth=aDepth;}`;
const fragment=`precision mediump float;
uniform sampler2D uColor;uniform sampler2D uDepth;uniform vec2 uRadius;uniform float uFocus;
varying vec2 vUV;varying float vDepth;
void main(){
 float blur=smoothstep(.10,.65,abs(vDepth-uFocus));
 vec2 r=uRadius*blur;vec4 sum=texture2D(uColor,vUV)*4.;float total=4.;
 for(int i=0;i<8;i++){
  float angle=float(i)*.7853981634;vec2 uv=clamp(vUV+vec2(cos(angle),sin(angle))*r,vec2(0.),vec2(1.));
  float weight=1.-smoothstep(.06,.24,abs(texture2D(uDepth,uv).r-vDepth));
  sum+=texture2D(uColor,uv)*weight;total+=weight;
 }
 gl_FragColor=vec4((sum/total).rgb,1.);
}`;
export function createRenderer(canvas,color,depth,mesh){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false});
 if(!gl)throw Error('WebGL unavailable');
 const shaders=[];
 function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Room shader unavailable');shaders.push(shader);return shader;}
 const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Room renderer unavailable');
 gl.useProgram(program);
 const vertices=gl.createBuffer(),indices=gl.createBuffer();
 gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.DYNAMIC_DRAW);
 for(const [name,size,offset]of [['aPosition',2,0],['aUV',2,8],['aDepth',1,16]]){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,20,offset);}
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);
 const textures=[color,depth].map((image,i)=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);return t;});
 const uniform=name=>gl.getUniformLocation(program,name);
 gl.uniform1i(uniform('uColor'),0);gl.uniform1i(uniform('uDepth'),1);
 const size=uniform('uSize'),center=uniform('uCenter'),scale=uniform('uScale'),radius=uniform('uRadius'),focus=uniform('uFocus');
 return {
  draw(camera,focusDepth,geometryDirty){
   const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(2000000/(camera.width*camera.height)));
   const w=Math.round(camera.width*ratio),h=Math.round(camera.height*ratio);
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   gl.viewport(0,0,w,h);gl.useProgram(program);
   if(geometryDirty){gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferSubData(gl.ARRAY_BUFFER,0,mesh.vertices);}
   gl.uniform2f(size,camera.width,camera.height);gl.uniform2f(center,camera.x,camera.y);gl.uniform1f(scale,camera.scale);
   gl.uniform2f(radius,3.2/(camera.scale*SCENE.width),3.2/(camera.scale*SCENE.height));gl.uniform1f(focus,focusDepth);
   gl.drawElements(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0);
  },
  destroy(){gl.deleteBuffer(vertices);gl.deleteBuffer(indices);textures.forEach(t=>gl.deleteTexture(t));shaders.forEach(s=>gl.deleteShader(s));gl.deleteProgram(program);}
 };
}
