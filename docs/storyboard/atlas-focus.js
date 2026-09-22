(() => {
  'use strict';
  const fieldFormat=Object.freeze({version:1,format:'atlas-focus-rg8-v1',channels:2,
    confidenceGapPixels:24,encoding:Object.freeze({
      label:'uint8: 0 unknown; 1..255 index into geometry.regions + 1',
      confidence:'uint8: bits 0..6 geometric separation percentage (0..100); bit 7 direct mask hit'
    })});
  function distanceTransform(pixels,width,height,label,nearestX,visit) {
    for (let y=0;y<height;y++) {
      const offset=y*width;
      let left=-1,right=-1;
      for (let x=0;x<width;x++) {
        if (pixels[offset+x] && (!label || pixels[offset+x]===label)) left=x;
        nearestX[offset+x]=left;
      }
      for (let x=width-1;x>=0;x--) {
        if (pixels[offset+x] && (!label || pixels[offset+x]===label)) right=x;
        const previous=nearestX[offset+x];
        if (right>=0 && (previous<0 || right-x<x-previous)) nearestX[offset+x]=right;
      }
    }
    // Lower envelopes of squared-distance parabolas complete the exact 2D
    // Euclidean transform. Each row enters/leaves the envelope at most once.
    const rows=new Int32Array(height),starts=new Float64Array(height);
    for (let x=0;x<width;x++) {
      let count=0;
      for (let y=0;y<height;y++) {
        const seedX=nearestX[y*width+x];
        if (seedX<0) continue;
        const cost=(x-seedX)**2;
        let start=-Infinity;
        while (count) {
          const previous=rows[count-1],previousX=nearestX[previous*width+x];
          start=(cost+y*y-(x-previousX)**2-previous*previous)/(2*(y-previous));
          if (start>starts[count-1]) break;
          count--;
        }
        rows[count]=y; starts[count]=count ? start : -Infinity; count++;
      }
      if (!count) continue;
      let row=0;
      for (let y=0;y<height;y++) {
        // Exact ties prefer the upper row (then the left pixel within a row).
        while (row+1<count && starts[row+1]<y) row++;
        const offset=rows[row]*width;
        const seedX=nearestX[offset+x];
        visit(y*width+x,pixels[offset+seedX],(x-seedX)**2+(y-rows[row])**2);
      }
    }
  }
  async function prepareField(geometry) {
    const {width,height} = geometry;
    const image = new Image(); image.src = geometry.mask; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width=width; canvas.height=height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0,width,height);
    return compileField(geometry,ctx.getImageData(0,0,width,height).data);
  }
  function compileField(geometry,rgba) {
    const {width,height,regions}=geometry;
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width<1 || height<1 ||
        rgba.length!==width*height*4) throw new RangeError('Invalid focus source dimensions');
    if (regions.length>255) throw new RangeError('Atlas focus supports at most 255 region labels');
    const pixels=new Uint8Array(width*height);
    for (let i=0;i<pixels.length;i++) {
      const p=i*4; if (rgba[p+3]<128 || Math.max(rgba[p],rgba[p+1],rgba[p+2])<100) continue;
      let distance=75*75;
      regions.forEach((region,index) => {
        const d=region.color.reduce((sum,c,j) => sum+(c-rgba[p+j])**2,0);
        if (d<distance) { distance=d; pixels[i]=index+1; }
      });
    }
    const field=new Uint8Array(pixels.length*2),nearestX=new Int32Array(pixels.length);
    const first=new Float64Array(pixels.length),second=new Float64Array(pixels.length).fill(Infinity);
    distanceTransform(pixels,width,height,0,nearestX,(offset,label,distance) => {
      field[offset*2]=label; first[offset]=distance;
    });
    // One exact transform per distinct region avoids treating two pixels of the
    // same region as competitors. All transforms run only during preparation.
    for (const label of new Set(pixels)) {
      if (!label) continue;
      distanceTransform(pixels,width,height,label,nearestX,(offset,id,distance) => {
        if (field[offset*2]!==id && distance<second[offset]) second[offset]=distance;
      });
    }
    for (let i=0;i<pixels.length;i++) {
      // Confidence is a geometric margin, not a probability: 24 source pixels
      // of advantage over the closest OTHER region gives 100%; ties give 0%.
      // Without a known competing region there is no evidence for confidence.
      const confidence=Number.isFinite(second[i]) ?
        Math.round(Math.min(1,(Math.sqrt(second[i])-Math.sqrt(first[i]))/fieldFormat.confidenceGapPixels)*100) : 0;
      field[i*2+1]=confidence | (pixels[i] ? 128 : 0);
    }
    // Interleaved bytes: nearest label, then 7-bit percentage + direct-hit bit.
    // 1536x1024 uses 3 MiB persistently; pixel/distance work arrays are released.
    // Preparation is O((R+1)*width*height); runtime sampling is one O(1) lookup.
    return field;
  }
  async function loadField(geometry) {
    if (!geometry.focusField) return null;
    try {
      const manifestURL=new URL(geometry.focusField,document.baseURI);
      const response=await fetch(manifestURL);
      if (!response.ok) return null;
      const manifest=await response.json(),{width,height,regions}=geometry;
      const palette=regions.map(({id,color}) => ({id,color}));
      if (manifest.version!==fieldFormat.version || manifest.format!==fieldFormat.format ||
          manifest.width!==width || manifest.height!==height || manifest.channels!==2 ||
          manifest.byteLength!==width*height*2 || manifest.sourceMask!==geometry.mask ||
          manifest.confidenceGapPixels!==fieldFormat.confidenceGapPixels ||
          manifest.encoding?.label!==fieldFormat.encoding.label ||
          manifest.encoding?.confidence!==fieldFormat.encoding.confidence ||
          JSON.stringify(manifest.regions)!==JSON.stringify(palette) ||
          !/^[a-f0-9]{64}$/.test(manifest.sourceSha256) || !/^[a-f0-9]{64}$/.test(manifest.sha256) ||
          typeof manifest.data!=='string' || !/^[a-zA-Z0-9_-]+\.bin$/.test(manifest.data)) return null;
      async function readField(data,gzip=false) {
        try {
          const binary=await fetch(new URL(data,manifestURL));
          if (!binary.ok) return null;
          let field=new Uint8Array(await binary.arrayBuffer());
          // Fetch may already decode Content-Encoding: gzip. Inspect the bytes
          // so both static .gz files and automatically decoded delivery work.
          if (gzip && field[0]===31 && field[1]===139) {
            if (field.byteLength!==manifest.gzip.byteLength) return null;
            const stream=new Response(field).body.pipeThrough(new DecompressionStream('gzip'));
            field=new Uint8Array(await new Response(stream).arrayBuffer());
          }
          if (field.byteLength!==manifest.byteLength) return null;
          // Validate once, including LAN HTTP without SubtleCrypto. The build
          // --check binds both delivery formats to the exact source/compiler.
          for (let i=0;i<field.length;i+=2) {
            if (field[i]>regions.length || (field[i+1]&127)>100 || (!field[i] && field[i+1])) return null;
          }
          if (globalThis.crypto?.subtle) {
            const digest=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',field));
            const hash=Array.from(digest,byte => byte.toString(16).padStart(2,'0')).join('');
            if (hash!==manifest.sha256) return null;
          }
          return field;
        } catch {
          return null;
        }
      }
      const gzip=manifest.gzip;
      if (typeof DecompressionStream==='function' && typeof Response==='function' &&
          gzip && typeof gzip.data==='string' && /^[a-zA-Z0-9_-]+\.bin\.gz$/.test(gzip.data) &&
          Number.isSafeInteger(gzip.byteLength) && gzip.byteLength>0) {
        const field=await readField(gzip.data,true);
        if (field) return field;
      }
      return await readField(manifest.data);
    } catch {
      return null;
    }
  }
  window.AtlasFocus = {compileField,fieldFormat,async create(geometry) {
    const {width,height,regions}=geometry,prebuilt=await loadField(geometry);
    const field=prebuilt || await prepareField(geometry);
    const fieldMetadata=Object.freeze({...fieldFormat,width,height,byteLength:field.byteLength,
      source:prebuilt ? 'prebuilt' : 'decoded-mask'});
    const valid=point => Array.isArray(point) && point.length===2 && point.every(Number.isFinite) &&
      point[0]>=0 && point[1]>=0 && point[0]<1 && point[1]<1;
    const directAt=offset => field[offset*2+1]&128 ? field[offset*2] : 0;
    const sample=point => valid(point) ? directAt(Math.floor(point[1]*height)*width+Math.floor(point[0]*width)) : 0;
    // Use the same full-resolution pixel coordinates as regionAt. Callers pass
    // the character's actual normalized position; camera/target state is unused.
    function sampleRegion(point) {
      if (!valid(point)) return {id:null,confidence:0};
      const offset=Math.floor(point[1]*height)*width+Math.floor(point[0]*width);
      const label=field[offset*2];
      return {id:label ? regions[label-1].id : null,confidence:field[offset*2+1]&127};
    }
    const nearestRegionAt=point => sampleRegion(point).id;
    function regionMatch(point,{nearby=false}={}) {
      if (!valid(point)) return {id:null};
      const direct=sample(point);
      if (direct) return {id:regions[direct-1].id};
      if (!nearby) return {id:null};
      const x=point[0]*width,y=point[1]*height,distances=regions.map(() => Infinity),radius=48;
      for (let py=Math.max(0,Math.ceil(y-radius));py<=Math.min(height-1,Math.floor(y+radius));py++) {
        for (let px=Math.max(0,Math.ceil(x-radius));px<=Math.min(width-1,Math.floor(x+radius));px++) {
          const distance=Math.hypot(px-x,py-y),index=directAt(py*width+px);
          if (index && distance<=radius) distances[index-1]=Math.min(distances[index-1],distance);
        }
      }
      const nearest=distances.map((distance,index) => ({distance,index})).sort((a,b) => a.distance-b.distance);
      const first=nearest[0],second=nearest[1]?.distance ?? Infinity;
      // Shared shores need a clear distance advantage, not a region-size vote.
      const clear=first && first.distance<=radius && first.distance+12<second && first.distance*1.5<second;
      return {id:clear ? regions[first.index].id : null,ambiguous:!clear && second<=radius};
    }
    const regionAt=(point,options) => regionMatch(point,options).id;
    let previous=null, diagnostic={id:null};
    return {
      regionAt,
      nearestRegionAt,
      sampleRegion,
      fieldMetadata,
      evaluate(map,fitZoom,fromLatLng) {
        const size=map.getSize(), counts=regions.map(() => 0),nearest=regions.map(() => Infinity);
        let total=0;
        // Measure proximity in viewport fractions; coverage alone favors the large lake.
        for (let iy=-8;iy<=8;iy++) for (let ix=-8;ix<=8;ix++) {
          const weight=Math.exp(-(ix*ix+iy*iy)/40);
          const p=map.containerPointToLatLng([size.x*(.5+ix*.026),size.y*(.5+iy*.026)]);
          const index=sample(fromLatLng(p));
          if (index) {
            counts[index-1]+=weight;
            nearest[index-1]=Math.min(nearest[index-1],Math.hypot(ix*.026,iy*.026));
          }
          total+=weight;
        }
        const point=fromLatLng(map.getCenter()),center=regionAt(point);
        const close=regionMatch(point,{nearby:true});
        const sorted=nearest.map((distance,index) => ({id:regions[index].id,index,distance}))
          .sort((a,b) => a.distance-b.distance);
        const first=sorted[0],second=sorted[1]?.distance ?? Infinity;
        const clear=first && first.distance<=.16 && first.distance+.04<second && first.distance*1.5<second;
        const candidate=close.id || (!close.ambiguous && clear ? first.id : null);
        const index=regions.findIndex(region => region.id===candidate);
        const covered=counts.reduce((a,b) => a+b,0),count=counts[index] || 0;
        const dominance=covered ? count/covered : 0,coverage=count/total;
        const retaining=previous!==null && previous===candidate;
        const relativeZoom=map.getZoom()-fitZoom;
        const id=relativeZoom>=(retaining ? .35 : .5) && coverage>=(retaining ? .015 : .025) ? candidate : null;
        previous=id;
        diagnostic={id,center:center || null,relativeZoom,dominance,coverage,
          coverageByRegion:Object.fromEntries(counts.map((count,i) => [regions[i].id,count/total]))};
        return id;
      },
      get diagnostic() { return structuredClone(diagnostic); }
    };
  }};
})();
