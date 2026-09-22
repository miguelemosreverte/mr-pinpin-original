const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const root = path.resolve(__dirname, '../docs/storyboard');
const output = process.env.ATLAS_PRODUCTION_FACES_OUTPUT || '/tmp/atlas-production-faces';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function main() {
  fs.mkdirSync(output, {recursive:true});
  const inputs = Object.fromEntries(['family-production.json', 'family-production-blinks.json', 'family-faces.json', 'atlas-face-layer.js']
    .map(file => [file, fs.readFileSync(path.join(root,file))]));
  const manifest = JSON.parse(inputs['family-production.json']);
  const expressions = JSON.parse(inputs['family-production-blinks.json']);
  const landmarks = JSON.parse(inputs['family-faces.json']);
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://atlas-audit.local/**', async route => {
      const name = decodeURIComponent(new URL(route.request().url()).pathname).slice(1);
      if (!name) return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><title>Production face registration audit</title></head><body></body></html>'});
      const file = path.resolve(root,name);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({status:404,body:'Missing asset'});
      const type = file.endsWith('.webp') ? 'image/webp' : file.endsWith('.png') ? 'image/png' : 'application/octet-stream';
      return route.fulfill({contentType:type,body:fs.readFileSync(file)});
    });
    await page.goto('http://atlas-audit.local/');
    await page.addScriptTag({content:inputs['atlas-face-layer.js'].toString()});
    const result = await page.evaluate(async ({manifest,expressions,landmarks}) => {
      const images = new Map(), records = [], contacts = [];
      const load = async src => {
        if (!images.has(src)) {const image = new Image();image.src=src;await image.decode();images.set(src,image);}
        return images.get(src);
      };
      const canvas = (width,height) => {const c=document.createElement('canvas');c.width=width;c.height=height;return c;};
      const pixels = c => c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;
      const helper = AtlasFaceLayer.create({resolveImage:src=>images.get(src),maxEntries:4});
      const style = document.createElement('style');
      style.textContent='*{box-sizing:border-box}body{margin:0;background:#fff;color:#20242a;font:14px system-ui}section{width:1240px;padding:16px;margin:0 0 20px;background:#fff}h2{font-size:20px;margin:0 0 8px}p{margin:4px 0 10px}.heading{display:grid;grid-template-columns:104px repeat(4,272px);gap:4px;margin:4px 0;border-top:1px solid #c9cdd1;padding-top:5px}.label{padding:9px 0}.pair{width:272px;display:grid;grid-template-columns:136px 136px}.pair canvas{width:136px;height:112px;background:#d7e5df}.caption{grid-column:span 2;font-size:11px;line-height:16px;min-height:48px}.rejected{color:#aa2833}.partial{color:#865a09}.accepted{color:#16603c}';
      document.head.append(style);
      for (const character of manifest.characters) {
        const sections = {};
        for (const [mode,label] of [['runtime','runtime closed'],['authored','authored closed source']]) {
          const section=document.createElement('section');section.id=character.id+'-'+mode;
          const title=document.createElement('h2');title.textContent=character.name+' | open / '+label;section.append(title);
          const subtitle=document.createElement('p');subtitle.textContent='All front headings 0..180; columns are gait phases 0..3. Each pair uses the same source crop. Status is runtime registration, not visual approval.';section.append(subtitle);
          document.body.append(section);sections[mode]=section;contacts.push({id:character.id,mode,selector:'#'+section.id});
        }
        for (const direction of character.directions) {
          const src=direction.runtimeSrc||direction.src,image=await load(src);
          const expression=expressions.sheets.find(item=>item.characterId===character.id && item.angles.includes(direction.angle));
          const closedSource=expression ? await load(expression.runtimeSrc) : null;
          const rows = {};
          if (direction.angle>=0 && direction.angle<=180) for (const mode of ['runtime','authored']) {
            const row=document.createElement('div');row.className='heading';
            const label=document.createElement('div');label.className='label';label.textContent=direction.angle+' deg';row.append(label);sections[mode].append(row);rows[mode]=row;
          }
          for (const [phase,spec] of direction.frames.entries()) {
            const id=src+'#'+direction.angle+'#'+phase,face=landmarks.frames[id],frame={...spec,id,face};
            for (const eye of face?.eyes||[]) if (eye.blink?.src) await load(eye.blink.src);
            const entry=helper.prepare({image,frame});
            const render = blink => {
              const c=canvas(spec.rect[2],spec.rect[3]),ctx=c.getContext('2d');ctx.translate(...spec.anchor);
              c.auditApplied=helper.draw(ctx,entry,{blink,tiltDegrees:0});return c;
            };
            const open=render(false),closed=render(true),source=canvas(open.width,open.height);
            source.getContext('2d').drawImage(image,...spec.rect,0,0,open.width,open.height);
            const original=pixels(source),before=pixels(open),after=pixels(closed);
            const acceptedEyes=entry.capabilities.blink ? entry.eyes.filter(eye=>eye.blink).map(eye=>eye.bounds) : [];
            let changedPixels=0,changedOutsideEyes=0,alphaChanged=0,neutralChanged=0;
            for(let y=0;y<open.height;y++)for(let x=0;x<open.width;x++) {
              const i=(y*open.width+x)*4;
              const changed=before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2]||before[i+3]!==after[i+3];
              if(before[i]!==original[i]||before[i+1]!==original[i+1]||before[i+2]!==original[i+2]||before[i+3]!==original[i+3])neutralChanged++;
              if(before[i+3]!==after[i+3])alphaChanged++;
              if(changed){changedPixels++;if(!acceptedEyes.some(([ex,ey,ew,eh])=>x>=ex&&x<ex+ew&&y>=ey&&y<ey+eh))changedOutsideEyes++;}
            }
            const candidateEyes=(face?.eyes||[]).filter(eye=>eye.blink).length;
            const diagnostics=entry.diagnostics.map(item=>({...item}));
            const expectedEyes=face?.expectedEyes ?? (direction.angle>0 && direction.angle<180 ? 2 : 1);
            const registeredEyeCandidates=diagnostics.filter(d=>d.accepted && d.label.endsWith('.blink')).length;
            const coverageBlocked=face?.requireAllEyes===true && !entry.capabilities.blink &&
              (candidateEyes<expectedEyes || registeredEyeCandidates>0 && registeredEyeCandidates<expectedEyes);
            const status=!expression ? 'no-blink-source' : !candidateEyes ? 'no-eye-candidate' : coverageBlocked ? 'coverage-blocked' :
              acceptedEyes.length>=expectedEyes && changedPixels ? 'accepted' : acceptedEyes.length && changedPixels ? 'partial' : 'rejected';
            const measured=diagnostics.filter(d=>Number.isFinite(d.meanError));
            const samples=measured.reduce((n,d)=>n+d.samples,0);
            const meanError=samples ? measured.reduce((n,d)=>n+d.meanError*d.samples,0)/samples : null;
            const maxError=measured.length ? Math.max(...measured.map(d=>d.maxError)) : null;
            const coverageWarnings=[];
            if(acceptedEyes.length>0 && acceptedEyes.length<expectedEyes)coverageWarnings.push('runtime-partial-eye-coverage-wink-risk');
            if(candidateEyes<expectedEyes && expression)coverageWarnings.push('missing-required-eye-candidates');
            if(coverageBlocked)coverageWarnings.push('incomplete-coverage-disabled');
            records.push({id,characterId:character.id,angle:direction.angle,phase,status,hasBlinkSource:Boolean(expression),
              candidateEyes,expectedEyes,requireAllEyes:face?.requireAllEyes===true,registeredEyeCandidates,
              acceptedEyes:acceptedEyes.length,blinkRendered:Boolean(closed.auditApplied && changedPixels),capabilities:{...entry.capabilities},reason:entry.reason,
              headReason:entry.headReason,blinkReason:entry.blinkReason||null,blinkCoverage:entry.blinkCoverage||null,
              meanError,maxError,diagnostics,coverageWarnings,changedPixels,changedOutsideEyes,alphaChanged,neutralChanged});
            if (!rows.runtime) continue;
            const authored=canvas(open.width,open.height);
            if(closedSource)authored.getContext('2d').drawImage(closedSource,...spec.rect,0,0,authored.width,authored.height);
            else authored.getContext('2d').drawImage(open,0,0);
            const bounds=face?.bounds;
            // Include neighboring facial context so a missed far eye remains visible.
            const pad=40;
            const region=bounds ? [Math.max(0,bounds[0]-pad),Math.max(0,bounds[1]-pad),
              Math.min(open.width-Math.max(0,bounds[0]-pad),bounds[2]+pad*2),Math.min(open.height-Math.max(0,bounds[1]-pad),bounds[3]+pad*2)] : [0,0,open.width,open.height];
            for(const [mode,second]of[['runtime',closed],['authored',authored]]) {
              const pair=document.createElement('div');pair.className='pair';
              for(const c of [open,second]) {
                const tile=canvas(136,112),ctx=tile.getContext('2d');
                const scale=Math.min(128/region[2],104/region[3]);
                ctx.drawImage(c,...region,(136-region[2]*scale)/2,(112-region[3]*scale)/2,region[2]*scale,region[3]*scale);pair.append(tile);
              }
              const caption=document.createElement('div');caption.className='caption '+status;
              caption.textContent='F'+phase+' '+status+' '+acceptedEyes.length+'/'+expectedEyes+' required eyes; '+(meanError===null?'unmeasured':'mean '+meanError.toFixed(2)+' max '+maxError)+(coverageWarnings.length?' | coverage review':'');
              pair.append(caption);rows[mode].append(pair);
            }
          }
        }
      }
      return {frames:records,contacts,helperStats:helper.stats,decodedImages:images.size};
    },{manifest,expressions,landmarks});
    assert.equal(result.frames.length,manifest.characters.reduce((n,c)=>n+c.directions.reduce((n,d)=>n+d.frames.length,0),0));
    const summary = manifest.characters.map(character => {
      const frames=result.frames.filter(frame=>frame.characterId===character.id),counts={};
      for(const frame of frames)counts[frame.status]=(counts[frame.status]||0)+1;
      const diagnostics=frames.flatMap(frame=>frame.diagnostics),measured=diagnostics.filter(d=>Number.isFinite(d.meanError));
      const samples=measured.reduce((n,d)=>n+d.samples,0),reasons={};
      const errorStats=accepted=>{
        const items=measured.filter(d=>d.accepted===accepted),n=items.reduce((n,d)=>n+d.samples,0);
        return {eyes:items.length,meanError:n?items.reduce((n,d)=>n+d.meanError*d.samples,0)/n:null,
          maxError:items.length?Math.max(...items.map(d=>d.maxError)):null};
      };
      for(const d of diagnostics.filter(d=>!d.accepted))reasons[d.reason]=(reasons[d.reason]||0)+1;
      return {characterId:character.id,frames:frames.length,frontFrames:frames.filter(f=>f.angle<=180).length,counts,
        candidateEyes:frames.reduce((n,f)=>n+f.candidateEyes,0),acceptedEyes:frames.reduce((n,f)=>n+f.acceptedEyes,0),rejectionReasons:reasons,
        eyeCoverageWarningFrames:frames.filter(f=>f.coverageWarnings.length).length,
        runtimeWinkRiskFrames:frames.filter(f=>f.coverageWarnings.includes('runtime-partial-eye-coverage-wink-risk')).length,
        registrationErrors:{accepted:errorStats(true),rejected:errorStats(false)},
        meanError:samples?measured.reduce((n,d)=>n+d.meanError*d.samples,0)/samples:null,
        maxError:measured.length?Math.max(...measured.map(d=>d.maxError)):null,
        framesWithAlphaChanges:frames.filter(f=>f.alphaChanged).length,framesWithChangesOutsideEyes:frames.filter(f=>f.changedOutsideEyes).length};
    });
    for(const contact of result.contacts) await page.locator(contact.selector).screenshot({path:path.join(output,`${contact.id}-front-open-${contact.mode}-closed.png`)});
    const report={schemaVersion:1,reviewStatus:'browser-measurements-awaiting-visual-review',
      scope:'Blink-only registration and rendering. Full-head art, head tilt and gaze remain incomplete/unapproved.',
      inputs:Object.fromEntries(Object.entries(inputs).map(([name,bytes])=>[name,{sha256:hash(bytes)}])),
      allAvailableFramesChecked:result.frames.length,frontHeadingConvention:'0 through 180 inclusive, 15-degree bins, all four gait phases',
      summary,errors,...result};
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
    const pages=result.contacts.map(c=>`<h2>${c.id}: open / ${c.mode} closed</h2><img style="max-width:100%" src="${c.id}-front-open-${c.mode}-closed.png" alt="${c.id} ${c.mode} contact sheet">`).join('\n');
    fs.writeFileSync(path.join(output,'index.html'),'<!doctype html><meta charset="utf-8"><title>Production face audit</title><h1>Production face audit</h1><p><a href="report.json">All-frame diagnostics</a></p>'+pages+'\n');
    console.log(JSON.stringify({frames:result.frames.length,summary,output},null,2));
    assert.deepEqual(errors,[],'Browser page errors');
    assert(result.frames.every(frame=>!frame.neutralChanged),'Neutral helper render differs from source');
    assert(result.frames.every(frame=>!frame.alphaChanged),'Blink changed body alpha');
    assert(result.frames.every(frame=>!frame.changedOutsideEyes),'Blink changed pixels outside accepted eye bounds');
  } finally {await browser.close();}
}

if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={main};
