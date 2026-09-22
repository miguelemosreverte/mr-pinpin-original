(() => {
  'use strict';
  const angles=[15,45,75,105], roles=['mama','pinpin','pompom'];
  const labels={mama:'Mama',pinpin:'Pinpin',pompom:'Mr. PomPom'}, widths={mama:84,pinpin:56,pompom:28};
  const images=new Map(), views=[], reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const play=document.getElementById('play'), status=document.getElementById('status');
  let characters=new Map(), frame=0, elapsed=0, last=null, request=0, paused=reduced.matches, retry=0, signature='';
  const sourceFor=(character,direction) => direction.runtimeSrc || direction.src || character.runtimeSrc || character.src;
  const assetUrl=src => new URL('../'+src,location.href).href;
  const sourceImage=(character,direction) => images.get(sourceFor(character,direction));
  const directionFor=(character,angle) => character?.directions?.find(direction=>direction.angle===angle);
  function characterRole(character) {
    const name=String(character.id || character.name || '').toLowerCase();
    if (/mama|mother/.test(name)) return 'mama';
    if (/pom.?pom|baby/.test(name)) return 'pompom';
    if (/pinpin|pin-pin/.test(name)) return 'pinpin';
    return null;
  }
  async function load(src) {
    if (images.has(src)) return;
    const image=new Image();image.src=assetUrl(src);await image.decode();images.set(src,image);
  }
  function bounds(character,angle,zoom) {
    const direction=directionFor(character,angle);
    const scale=character.worldWidth/(direction.referenceWidth || character.referenceWidth)*zoom;
    const frames=direction.frames;
    return {above:Math.max(...frames.map(f=>f.anchor[1]*scale)),below:Math.max(...frames.map(f=>(f.rect[3]-f.anchor[1])*scale)),
      left:Math.max(...frames.map(f=>f.anchor[0]*scale)),right:Math.max(...frames.map(f=>(f.rect[2]-f.anchor[0])*scale))};
  }
  function sprite(ctx,character,angle,index,zoom,x,y) {
    const direction=directionFor(character,angle),item=direction.frames[index];
    const scale=character.worldWidth/(direction.referenceWidth || character.referenceWidth)*zoom;
    ctx.drawImage(sourceImage(character,direction),...item.rect,x-item.anchor[0]*scale,y-item.anchor[1]*scale,
      item.rect[2]*scale,item.rect[3]*scale);
  }
  function draw(view) {
    const {canvas,angle,zoom,character}=view, width=canvas.clientWidth, height=canvas.clientHeight;
    if (!width || !height) return;
    const ratio=devicePixelRatio || 1;
    if (canvas.width!==Math.round(width*ratio) || canvas.height!==Math.round(height*ratio)) {
      canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    }
    const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    const index=view.frame ?? frame;
    ctx.strokeStyle='#c3cfc8';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(12,view.ground+.5);ctx.lineTo(width-12,view.ground+.5);ctx.stroke();
    if (view.family) {
      const span=Math.min(width,570),start=(width-span)/2;
      roles.forEach((role,i)=>{
        const character=characters.get(role),x=start+span*(i+.5)/3;
        if (character) sprite(ctx,character,angle,index,1,x,view.ground);
        else {ctx.font='13px system-ui';ctx.fillStyle='#596866';ctx.textAlign='center';ctx.fillText('Preparing',x,view.ground-16);}
      });
    } else {
      const extent=bounds(character,angle,zoom);
      sprite(ctx,character,angle,index,zoom,(width+extent.left-extent.right)/2,view.ground);
    }
    canvas.dataset.frame=String(index);canvas.dataset.zoom=String(zoom);
    canvas.dataset.angle=String(angle);canvas.dataset.ready='true';
  }
  const visibility=new IntersectionObserver(entries=>{
    for (const entry of entries) {
      const view=views.find(view=>view.canvas===entry.target);
      if (view) {view.visible=entry.isIntersecting;if(view.visible)draw(view);}
    }
  },{rootMargin:'100px'});
  const resize=new ResizeObserver(entries=>{
    for(const entry of entries){const view=views.find(view=>view.canvas===entry.target);if(view)draw(view);}
  });
  function register(canvas,options) {
    const members=options.family ? [...characters.values()] : [options.character];
    const extents=members.map(character=>bounds(character,options.angle,options.zoom));
    const above=Math.max(70,...extents.map(b=>b.above)),below=Math.max(8,...extents.map(b=>b.below));
    const ground=Math.ceil(above+16),height=Math.ceil(ground+below+12);
    canvas.style.height=height+'px';
    const view={canvas,...options,ground,visible:true};views.push(view);resize.observe(canvas);visibility.observe(canvas);draw(view);
  }
  function canvasFor(parent,options,label) {
    const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',label);parent.append(canvas);register(canvas,options);return canvas;
  }
  function element(tag,text,className) {
    const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;
  }
  function preview(parent,character,label) {
    const figure=element('figure',null,'preview');figure.append(element('h3',label));parent.append(figure);
    for(const zoom of [1,4]) {
      figure.append(element('p',zoom===1?'1\u00d7 map scale':'4\u00d7','scale-caption'));
      canvasFor(figure,{character,angle:45,zoom},`${label}, 45 degrees, ${zoom} times map scale`);
    }
  }
  function build() {
    resize.disconnect();visibility.disconnect();views.length=0;
    document.getElementById('headings').replaceChildren();document.getElementById('characters').replaceChildren();
    register(document.getElementById('lineup'),{family:true,angle:45,zoom:1});
    for(const angle of angles) {
      const row=element('div',null,'heading-row');row.append(element('h3',angle+'\u00b0'));
      document.getElementById('headings').append(row);
      canvasFor(row,{family:true,angle,zoom:1},`Family candidates at ${angle} degrees, actual map scale`);
    }
    for(const role of roles) {
      const character=characters.get(role);if(!character)continue;
      const section=element('section');section.id=role;section.dataset.character=role;
      const heading=element('div',null,'section-title');heading.append(element('h2',labels[role]),element('span',widths[role]+' world px'));
      section.append(heading);document.getElementById('characters').append(section);
      const comparison=element('div',null,role==='pinpin'?'comparison':'scale-pair');section.append(comparison);
      if(role==='pinpin') {
        const original={...window.atlasDirections,worldWidth:56};preview(comparison,original,'Current Pinpin');
        preview(comparison,character,'Candidate Pinpin');
      } else preview(comparison,character,'Candidate '+labels[role]);
      section.append(element('p','16 frames \u00b7 1\u00d7 map scale','character-intro'));
      const grid=element('div',null,'frame-grid');section.append(grid);
      for(const angle of angles)for(let frame=0;frame<4;frame++) {
        const figure=element('figure');grid.append(figure);
        canvasFor(figure,{character,angle,frame,zoom:1},`${labels[role]}, ${angle} degrees, gait frame ${frame+1}, actual map scale`);
        const caption=element('figcaption');caption.append(element('span',angle+'\u00b0'),element('span','Frame '+(frame+1)));figure.append(caption);
      }
      const links=element('div',null,'section-links');section.append(links);
      const sources=[...new Set(character.directions.map(d=>d.src || sourceFor(character,d)))];
      sources.forEach((src,index)=>{const link=element('a',sources.length>1?'Candidate sheet '+(index+1):'Candidate source sheet');link.href=assetUrl(src);links.append(link);});
    }
    play.disabled=false;controls();run();
  }
  function controls() {
    const label=paused?'Play animation':'Pause animation';play.setAttribute('aria-label',label);play.title=label;
    play.innerHTML='<i data-lucide="'+(paused?'play':'pause')+'" aria-hidden="true"></i>';
    window.lucide?.createIcons();
  }
  function tick(now) {
    request=0;if(paused || document.hidden)return;
    elapsed+=last===null?0:now-last;last=now;
    if(elapsed>=190) {
      frame=(frame+Math.floor(elapsed/190))%4;elapsed%=190;
      views.forEach(view=>{if(view.frame===undefined && view.visible)draw(view);});
      document.body.dataset.frame=String(frame);
    }
    request=requestAnimationFrame(tick);
  }
  function run() {
    cancelAnimationFrame(request);request=0;last=null;
    if(!paused && !document.hidden && views.length)request=requestAnimationFrame(tick);
  }
  async function refresh() {
    retry=0;
    try {
      const response=await fetch('../family-sprites.json',{cache:'no-store'});
      if(!response.ok)throw Error('Manifest pending');
      const manifest=await response.json(),nextSignature=JSON.stringify(manifest);
      if(nextSignature!==signature) {
        const next=new Map();
        for(const entry of manifest.characters || []) {
          const role=characterRole(entry);if(!role)continue;
          const character={...entry,worldWidth:widths[role]};
          if(!angles.every(angle=>{
            const direction=directionFor(character,angle);
            return direction?.frames?.length===4 && (direction.referenceWidth || character.referenceWidth)>0 &&
              direction.frames.every(frame=>frame.rect?.length===4 && frame.anchor?.length===2);
          }))continue;
          await Promise.all(character.directions.map(direction=>load(sourceFor(character,direction))));next.set(role,character);
        }
        if(next.size) {
          const original=directionFor(window.atlasDirections,45);await load(sourceFor(window.atlasDirections,original));
          characters=next;build();signature=nextSignature;
        }
      }
      const ready=characters.size===3;document.body.dataset.ready=String(ready);
      status.dataset.state=ready?'ready':'loading';
      status.textContent=ready?'Three candidate sheets \u00b7 48 frames \u00b7 pending review':
        characters.size?`${characters.size} of 3 candidate sheets ready.`:'Candidate sheets are being prepared.';
      if(!ready)retry=setTimeout(refresh,4000);
    } catch {
      status.dataset.state='loading';status.textContent='Candidate artwork is not available yet.';retry=setTimeout(refresh,4000);
    }
  }
  play.addEventListener('click',()=>{paused=!paused;controls();run();});
  reduced.addEventListener('change',event=>{if(event.matches){paused=true;controls();run();}});
  document.addEventListener('visibilitychange',run);
  addEventListener('pagehide',()=>{cancelAnimationFrame(request);clearTimeout(retry);});
  addEventListener('pageshow',event=>{if(event.persisted){refresh();run();}});
  controls();refresh();
})();
