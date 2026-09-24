// Isolated rectangular source-frustum overlay. No generated pixels are rewritten.
export function tractorPanoramaAnchor(canvas, panorama, source, anchor={yaw:0,pitch:0,fov:65,aspect:16/9,featherStart:.94}) {
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});
 if(!gl)throw Error('WebGL unavailable');
 const shaders=[];
 function compile(type,text){const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));shaders.push(s);return s;}
 const program=gl.createProgram();
 gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 aPosition;varying vec2 p;void main(){p=aPosition;gl_Position=vec4(p,0.,1.);}'));
 gl.attachShader(program,compile(gl.FRAGMENT_SHADER,`precision highp float;
 varying vec2 p;uniform sampler2D uPanorama,uSource;uniform vec4 uCamera,uAnchor;uniform float uAspect,uFeather,uEnabled;
 void main(){
  vec3 r=normalize(vec3(p.x*uCamera.w*uCamera.z,p.y*uCamera.z,1.));
  float cy=cos(uCamera.x),sy=sin(uCamera.x),cp=cos(uCamera.y),sp=sin(uCamera.y);
  float y=r.y*cp+r.z*sp,z=r.z*cp-r.y*sp;
  vec3 world=vec3(r.x*cy+z*sy,y,z*cy-r.x*sy);
  vec2 uv=vec2(fract(.5+atan(world.x,world.z)/6.28318530718),.5-asin(clamp(world.y,-1.,1.))/3.14159265359);
  vec3 color=texture2D(uPanorama,uv).rgb;
  float ac=cos(uAnchor.x),as=sin(uAnchor.x),pc=cos(uAnchor.y),ps=sin(uAnchor.y);
  float ax=world.x*ac-world.z*as,az=world.x*as+world.z*ac;
  vec3 local=vec3(ax,world.y*pc-az*ps,world.y*ps+az*pc);
  if(uEnabled>.5&&local.z>0.){
   vec2 q=vec2(local.x/(local.z*uAnchor.z*uAspect),local.y/(local.z*uAnchor.z));
   float edge=max(abs(q.x),abs(q.y));
   if(edge<1.){
    float weight=1.-smoothstep(uFeather,1.,edge);
    color=mix(color,texture2D(uSource,vec2(.5+.5*q.x,.5-.5*q.y)).rgb,weight);
   }
  }
  gl_FragColor=vec4(color,1.);
 }`));
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const pos=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 const textures=[panorama,source].map((image,i)=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);return t;});
 gl.uniform1i(gl.getUniformLocation(program,'uPanorama'),0);gl.uniform1i(gl.getUniformLocation(program,'uSource'),1);
 gl.uniform4f(gl.getUniformLocation(program,'uAnchor'),anchor.yaw,anchor.pitch,Math.tan(anchor.fov*Math.PI/360),1);
 gl.uniform1f(gl.getUniformLocation(program,'uAspect'),anchor.aspect);gl.uniform1f(gl.getUniformLocation(program,'uFeather'),anchor.featherStart);
 const camera=gl.getUniformLocation(program,'uCamera'),enabled=gl.getUniformLocation(program,'uEnabled');let active=true;
 return {setSource(source){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,textures[1]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);},setEnabled(value){active=Boolean(value);},draw(s){const ratio=s.pixelRatio??Math.min(devicePixelRatio||1,1.5),w=Math.round(s.width*ratio),h=Math.round(s.height*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);gl.uniform4f(camera,s.yaw,s.pitch,Math.tan(s.fov*Math.PI/360),s.width/s.height);gl.uniform1f(enabled,active?1:0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);},readPixels(){const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;},destroy(){textures.forEach(t=>gl.deleteTexture(t));shaders.forEach(s=>gl.deleteShader(s));gl.deleteBuffer(buffer);gl.deleteProgram(program);}};
}
