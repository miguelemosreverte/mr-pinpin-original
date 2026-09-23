'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{exactPrompt}=require('./build.cjs');
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function greenSection(manifest,out){
  manifest=fs.realpathSync(manifest);const root=path.dirname(manifest),spec=JSON.parse(fs.readFileSync(manifest,'utf8'));
  const resolve=name=>{assert(typeof name==='string'&&!path.isAbsolute(name)&&name.split('/').every(p=>p&&p!=='.'&&p!=='..'),'Invalid green source path');const file=fs.realpathSync(path.join(root,name));assert(file.startsWith(root+path.sep)&&fs.statSync(file).isFile(),'Green source escapes trial');return file;};
  const input=resolve(spec.input),video=resolve(spec.video),record=JSON.parse(fs.readFileSync(resolve(spec.record),'utf8'));
  assert(record.status==='complete'&&record.sourceHash===sha(input)&&record.metadata.sha256===sha(video),'Green input or video hash differs');
  assert(record.input.first_image_url&&record.input.first_image_url===record.input.end_image_url,'Green first/end stills must match');
  const imagePrompt=exactPrompt(fs.readFileSync(resolve(spec.imagePromptRecord),'utf8'));
  const files=[];fs.mkdirSync(path.join(out,'green-assets'));
  function asset(name){
    const prior=files.find(a=>a.source===name);if(prior)return prior.output;
    const file=resolve(name),ext=path.extname(file);assert(['.png','.mp4','.md','.json'].includes(ext),'Unsupported green review asset');
    const output=`green-assets/${String(files.length).padStart(3,'0')}${ext}`,hash=sha(file);
    fs.copyFileSync(file,path.join(out,output),fs.constants.COPYFILE_EXCL);assert(sha(path.join(out,output))===hash,'Green asset changed during copy');
    files.push({source:name,output,sha256:hash});return output;
  }
  const player=(file,label)=>{const keyed=file===spec.keyedVideo,poster=keyed?spec.keyedPoster:spec.nativePoster;if(keyed)label=spec.keyedLabel||label;return `<figure><figcaption>${esc(label)}</figcaption><video controls loop muted playsinline preload="metadata" ${poster?`poster="${asset(poster)}"`:''} aria-label="${esc(label)}" src="${asset(file)}"></video></figure>`;};
  const params=Object.fromEntries(['duration','resolution','aspect_ratio','generate_audio_switch','generate_multi_clip_switch','thinking_type','seed'].filter(k=>k in record.input).map(k=>[k,record.input[k]]));
  const html=`<section id="green-trial"><h2>Green-key comparison</h2><p>The actual test is green; the working directory retains its earlier purple-key name. One video request, recorded estimate USD ${esc(record.priceEstimate.amount)}, not verified billing.</p><figure><figcaption>Actual green input / same image supplied as first and end frame</figcaption><img src="${asset(spec.input)}" alt="Actual opaque green reference"></figure><p>Lineage: approved opaque 000 reference -> AI background edit -> this green still -> native video -> local software keying. The background edit used only the prior 000 still. No rig, new angle or prior alpha mask was supplied.</p><p>Requested #00FF00 was not literal: measured input border spans R 1-20, G 239-251, B 1-16. The software must tolerate this variation.</p><div class="pair">${player(spec.video,'Original green native video')}${player(spec.keyedVideo,'Software-keyed comparison')}</div><p class="status">${esc(spec.findings)}</p>${spec.noseViews.map(v=>`<figure><figcaption>${esc(v.label)}</figcaption><img src="${asset(v.path)}" alt="${esc(v.label)}"></figure>`).join('')}<h3>Exact background-edit prompt</h3><pre class="green-image-prompt">${esc(imagePrompt)}</pre><h3>Exact green video prompt</h3><pre class="green-video-prompt">${esc(record.input.prompt)}</pre><pre>${esc(JSON.stringify(params,null,2))}</pre><p>${esc(record.model)}. Native ${record.metadata.width}x${record.metadata.height}, ${record.metadata.frameCount} frames at ${esc(record.metadata.avg_frame_rate)} fps, ${record.metadata.duration} seconds. The comparison retains its recorded sampling; no loop repair is claimed.</p><p><a href="${asset(spec.imagePromptRecord)}">Image-edit provenance</a> / <a href="${asset(spec.auditRecord)}">Keying and nose assessment</a> / <a href="green-provenance.json">Copied asset hashes</a></p></section>`;
  if(spec.posterRecord)asset(spec.posterRecord);
  const proof={version:1,assets:files,inputSha256:sha(input),videoSha256:sha(video),model:record.model,parameters:params,videoPrompt:record.input.prompt,imagePrompt,findings:spec.findings};
  fs.writeFileSync(path.join(out,'green-provenance.json'),JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
  return html;
}
module.exports={greenSection};
