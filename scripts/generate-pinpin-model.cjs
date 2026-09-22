#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const {createHash, randomUUID} = require('node:crypto');
const {Readable} = require('node:stream');
const {pipeline} = require('node:stream/promises');
const {loadClient, redact, project} = require('./generate-atlas-video.cjs');
const MODEL = 'fal-ai/trellis-2';
const MULTIVIEW_MODEL = 'tripo3d/h3.1/multiview-to-3d';
const DEFAULT_PARAMS = Object.freeze({resolution:'1536', texture_size:'2048', decimation_target:200000, remesh:true, seed:210926});
const MULTIVIEW_PARAMS = Object.freeze({texture:true,pbr:true,texture_quality:'standard',geometry_quality:'standard',
  texture_alignment:'original_image',orientation:'default',quad:false});
const VIEWS = ['front','left','back'];
const PRICE_FIELDS = new Set(['amount','currency','unit','quantity','total','usd','rate','notes','basis','source']);
class RunnerError extends Error {}
const fail = message => { throw new RunnerError(message); };
const digest = value => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();

function readConfig(filename) {
  const configPath=path.resolve(filename), raw=JSON.parse(fs.readFileSync(configPath,'utf8'));
  const fields=new Set(['model','params','sourceImage','sourceImages','outputGLB','prompt','priceEstimate']);
  if(!raw || typeof raw!=='object' || Array.isArray(raw) || Object.keys(raw).some(k=>!fields.has(k))) fail('Invalid or unsupported config fields.');
  const model=raw.model || MODEL, multiview=model===MULTIVIEW_MODEL;
  if(![MODEL,MULTIVIEW_MODEL].includes(model)) fail('Unsupported model; expected Trellis 2 or Tripo H3.1 multiview.');
  if(raw.params!==undefined && (!raw.params || typeof raw.params!=='object' || Array.isArray(raw.params))) fail('params must be an object.');
  const defaults=multiview ? MULTIVIEW_PARAMS : DEFAULT_PARAMS;
  const paramFields=new Set([...Object.keys(defaults),...(multiview ? ['face_limit','model_seed','texture_seed','auto_size'] : [])]);
  if(Object.keys(raw.params || {}).some(k=>!paramFields.has(k))) fail('Unsupported model parameter; image URLs come from local references only.');
  const params={...defaults,...raw.params};
  if(!multiview && (!['512','1024','1536'].includes(params.resolution) || !['1024','2048','4096'].includes(params.texture_size)
    || !Number.isSafeInteger(params.decimation_target) || params.decimation_target<1 || typeof params.remesh!=='boolean'
    || !Number.isSafeInteger(params.seed))) fail('Invalid Trellis parameters; resolutions must be strings.');
  if(multiview) {
    for(const key of ['texture','pbr','quad','auto_size']) if(params[key]!==undefined && typeof params[key]!=='boolean') fail('Invalid Tripo boolean parameter.');
    for(const key of ['model_seed','texture_seed']) if(params[key]!==undefined && !Number.isSafeInteger(params[key])) fail('Invalid Tripo seed.');
    if(params.face_limit!==undefined && (!Number.isSafeInteger(params.face_limit) || params.face_limit<1)) fail('face_limit must be a positive integer.');
    if(!['standard','detailed'].includes(params.texture_quality) || !['standard','detailed'].includes(params.geometry_quality)
      || !['original_image','geometry'].includes(params.texture_alignment) || !['default','align_image'].includes(params.orientation)) fail('Invalid Tripo quality/alignment/orientation.');
    if(params.quad) fail('quad:true may produce FBX; this runner only collects GLB.');
    if(params.pbr && !params.texture) fail('PBR requires texture:true.');
  }
  function local(file, image=false) {
    if(typeof file!=='string' || !file.trim() || /^[a-z]+:\/\//i.test(file)) fail('Reference and output paths must be local.');
    const resolved=path.resolve(path.dirname(configPath),file);
    if(image && !/\.(png|jpe?g|webp)$/i.test(resolved)) fail('Expected PNG/JPEG/WebP reference.');
    return resolved;
  }
  let references;
  if(multiview) {
    let images=raw.sourceImages;
    if(Array.isArray(images)) {
      if(images.length!==3 || images.some(item=>!item || typeof item!=='object' || !VIEWS.includes(item.view)
        || Object.keys(item).some(key=>!['view','path'].includes(key))) || new Set(images.map(item=>item.view)).size!==3)
        fail('sourceImages requires exactly three {view,path} records: front, left and back.');
      images=Object.fromEntries(images.map(item=>[item.view,item.path]));
    }
    if(raw.sourceImage!==undefined || !images || typeof images!=='object'
      || Object.keys(images).length!==3 || Object.keys(images).some(view=>!VIEWS.includes(view))) fail('Multiview requires sourceImages with exactly front, left and back.');
    const sourceImages=Object.fromEntries(VIEWS.map(view=>[view,local(images[view],true)]));
    if(new Set(Object.values(sourceImages)).size!==3) fail('Front, left and back must use distinct reference files.');
    references={sourceImages};
  } else {
    if(raw.sourceImages!==undefined) fail('Trellis uses sourceImage, not sourceImages.');
    references={sourceImage:local(raw.sourceImage,true)};
  }
  const outputGLB=local(raw.outputGLB);
  if(!/\.glb$/i.test(outputGLB)) fail('Expected .glb output.');
  if(raw.prompt!==undefined && raw.prompt!==null && typeof raw.prompt!=='string') fail('prompt is provenance text only.');
  if(raw.priceEstimate!==undefined && raw.priceEstimate!==null &&
    (typeof raw.priceEstimate!=='object' || Array.isArray(raw.priceEstimate))) fail('priceEstimate must be an object or null.');
  const config={model,params,...references,outputGLB,prompt:raw.prompt ?? null,
    priceEstimate:raw.priceEstimate ? project(raw.priceEstimate,PRICE_FIELDS,'') : null};
  return {...config,configPath,configHash:digest(JSON.stringify(config))};
}

function sidecars(output) {
  const stem=output.slice(0,-4);
  return {json:stem+'.json',md:stem+'.md',lock:stem+'.collect.lock'};
}
async function writeAtomic(file, content, exclusive=false) {
  const temp=exclusive ? file : file+'.'+randomUUID()+'.tmp';
  let handle;
  try {
    handle=await fsp.open(temp,'wx',0o600);
    await handle.writeFile(content); await handle.sync(); await handle.close(); handle=null;
    if(!exclusive) await fsp.rename(temp,file);
  } finally {
    if(handle) await handle.close();
    if(!exclusive) await fsp.unlink(temp).catch(()=>{});
  }
}
async function save(state, output, key='', exclusive=false) {
  state.updatedAt=now();
  const json=JSON.stringify(state,(_key,value)=>typeof value==='string' ? redact(value,key) : value,2)+'\n';
  await writeAtomic(sidecars(output).json,json,exclusive);
  await writeAtomic(sidecars(output).md,'# Pinpin image-to-3D generation\n\nPrompt is provenance only; the selected endpoint receives reference images, not text.\nPrice estimate is not an invoice or verified charge.\n\n```json\n'+json+'```\n');
}
async function fileHash(file) {
  const hash=createHash('sha256');
  for await(const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function glbMetadata(file) {
  const handle=await fsp.open(file,'r');
  try {
    const stat=await handle.stat(), header=Buffer.alloc(12);
    await handle.read(header,0,12,0);
    if(!stat.isFile() || stat.size<20 || header.toString('ascii',0,4)!=='glTF' || header.readUInt32LE(4)!==2
      || header.readUInt32LE(8)!==stat.size) fail('Downloaded file is not a complete GLB 2 container.');
    let offset=12,chunks=0;
    while(offset<stat.size) {
      const chunk=Buffer.alloc(8), read=await handle.read(chunk,0,8,offset);
      const length=chunk.readUInt32LE(0);
      if(read.bytesRead!==8 || length%4 || offset+8+length>stat.size ||
        (chunks===0 && chunk.readUInt32LE(4)!==0x4e4f534a)) fail('Invalid GLB chunk boundaries.');
      offset+=8+length; chunks++;
    }
    return {bytes:stat.size,sha256:await fileHash(file),version:2,chunks,validation:'container-only-not-mesh-or-visual-approval'};
  } finally { await handle.close(); }
}
async function download(url, file, fetchImpl=globalThis.fetch) {
  const target=new URL(url);
  if(target.protocol!=='https:' || target.username || target.password) fail('Result URL must be credential-free HTTPS.');
  const response=await fetchImpl(target,{redirect:'error',signal:AbortSignal.timeout(600000)});
  if(!response.ok || !response.body) fail('GLB download failed.');
  await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(file,{flags:'wx',mode:0o600}));
  const handle=await fsp.open(file,'r+');
  try { await handle.sync(); } finally { await handle.close(); }
}

async function submit(config, deps) {
  const files=sidecars(config.outputGLB);
  await fsp.mkdir(path.dirname(config.outputGLB),{recursive:true});
  if([files.json,files.md,files.lock,config.outputGLB].some(f=>fs.existsSync(f))) fail('Output/state exists. Never resubmit; use collect or reconcile in fal dashboard.');
  const multiview=config.model===MULTIVIEW_MODEL;
  const sources=[];
  for(const [view,file] of (multiview ? Object.entries(config.sourceImages) : [['reference',config.sourceImage]])) {
    const bytes=await fsp.readFile(file);
    if(!bytes.length) fail('Source image is empty.');
    sources.push({view,file,bytes,sha256:digest(bytes)});
  }
  if(multiview && new Set(sources.map(s=>s.sha256)).size!==3) fail('Multiview references contain duplicate image bytes.');
  const {client,key=''}=deps;
  const references=multiview ? {sourceImages:config.sourceImages,viewOrder:VIEWS,
    referenceHashes:Object.fromEntries(sources.map(s=>[s.view,s.sha256]))} : {sourceImage:config.sourceImage,referenceHash:sources[0].sha256};
  const state={schemaVersion:1,status:'reserved',model:config.model,params:config.params,
    ...references,outputGLB:config.outputGLB,
    configHash:config.configHash,prompt:config.prompt,promptSentToModel:false,priceEstimate:config.priceEstimate,
    startedAt:now(),submittedAt:null,generationCompletedAt:null,endedAt:null,requestId:null};
  // Exclusive, synced creation is the durable cross-process guard before any paid POST.
  await save(state,config.outputGLB,key,true);
  try {
    const urls=[];
    for(const source of sources) {
      const ext=path.extname(source.file).toLowerCase();
      const type={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[ext];
      const imageURL=await client.storage.upload(new File([source.bytes],'pinpin-'+source.view+ext,{type}));
      const target=new URL(imageURL);
      if(target.protocol!=='https:' || target.username || target.password) fail('Unexpected upload URL.');
      urls.push(imageURL);
      if(multiview) {
        state.imageUrls ||= {}; state.imageUrls[source.view]=redact(imageURL,key);
        state.status='uploading'; await save(state,config.outputGLB,key);
      } else state.imageUrl=redact(imageURL,key);
    }
    state.status='submitting';
    await save(state,config.outputGLB,key);
    // loadClient's boundedFetch additionally guards SDK-level retries at the transport.
    const result=await client.queue.submit(config.model,{input:{...config.params,...(multiview ? {image_urls:urls} : {image_url:urls[0]})}});
    if(typeof result.request_id!=='string' || !/^[\w-]+$/.test(result.request_id)) fail('No valid request ID returned.');
    state.requestId=result.request_id; state.submittedAt=now(); state.status='submitted';
    await save(state,config.outputGLB,key);
    return state;
  } catch {
    state.status=state.requestId ? 'submission-save-failed' : 'submission-outcome-unknown';
    await save(state,config.outputGLB,key).catch(()=>{});
    fail('Submission did not finish cleanly. State retained; never resubmit. Reconcile request in fal dashboard.');
  }
}

function partPath(state, output) {
  const name=state.downloadPart;
  if(typeof name!=='string' || !name.startsWith(path.basename(output)+'.') || !/\.[a-f0-9-]{36}\.part$/.test(name)
    || path.basename(name)!==name) fail('Invalid saved partial-download filename.');
  return path.join(path.dirname(output),name);
}
async function verifyExisting(file, expected) {
  const actual=await glbMetadata(file);
  if(!expected || actual.sha256!==expected.sha256 || actual.bytes!==expected.bytes) fail('Existing GLB differs from saved verified download; refusing overwrite.');
  return actual;
}
function resultFile(data, model, params) {
  if(model===MODEL) return {field:'model_glb',file:data?.model_glb};
  const candidates=[...(params.pbr ? [['model_urls.pbr_model',data?.model_urls?.pbr_model]] : []),
    ['model_urls.glb',data?.model_urls?.glb],['model_mesh',data?.model_mesh],['model_urls.base_model',data?.model_urls?.base_model]];
  for(const [field,file] of candidates) {
    if(typeof file?.url!=='string' || !file.url) continue;
    let pathname;
    try { pathname=new URL(file.url).pathname; } catch { continue; }
    if(/fbx/i.test(file.content_type || '') || /\.fbx$/i.test(file.file_name || '') || /\.fbx$/i.test(pathname)) continue;
    return {field,file};
  }
  fail('Completed Tripo result has no eligible GLB model variant.');
}
async function publishVerified(temporary, output, link=fsp.link) {
  try { await link(temporary,output); }
  catch(error) {
    if(['ENOTSUP','EOPNOTSUPP','ENOSYS','EXDEV','EPERM'].includes(error.code))
      fail('Verified download retained; filesystem cannot publish a no-overwrite hard link. Run collect on the mini local SSD with the same config/paths; never resubmit.');
    throw error;
  }
}
async function collect(config, deps) {
  const files=sidecars(config.outputGLB), lock=await fsp.open(files.lock,'wx',0o600);
  let state, temporary;
  try {
    await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:now()})+'\n'); await lock.sync();
    state=JSON.parse(await fsp.readFile(files.json,'utf8'));
    if(state.configHash!==config.configHash || state.model!==config.model || state.outputGLB!==config.outputGLB) fail('Config differs from saved request. Restore original config for collect.');
    if(typeof state.requestId!=='string' || !/^[\w-]+$/.test(state.requestId)) fail('No saved request ID. Never resubmit; reconcile in fal dashboard.');
    if(fs.existsSync(config.outputGLB)) {
      await verifyExisting(config.outputGLB,state.metadata);
    } else if(state.metadata && state.downloadPart && fs.existsSync(partPath(state,config.outputGLB))) {
      temporary=partPath(state,config.outputGLB);
      await verifyExisting(temporary,state.metadata);
      await publishVerified(temporary,config.outputGLB,deps.link);
    } else {
      const status=await deps.client.queue.status(state.model,{requestId:state.requestId,logs:false});
      if(!['IN_QUEUE','IN_PROGRESS','COMPLETED'].includes(status.status)) fail('Unexpected queue status; inspect saved request.');
      state.queueStatus=status.status;
      if(status.status!=='COMPLETED') {
        state.status='pending'; await save(state,config.outputGLB,deps.key); return state;
      }
      state.generationCompletedAt ||= now();
      const result=await deps.client.queue.result(state.model,{requestId:state.requestId});
      const selected=resultFile(result.data,state.model,state.params), url=selected.file?.url;
      if(typeof url!=='string') fail('Completed result has no model_glb.url.');
      state.resultField=selected.field;
      if(state.downloadPart) await fsp.unlink(partPath(state,config.outputGLB)).catch(error=>{if(error.code!=='ENOENT') throw error;});
      state.downloadPart=path.basename(config.outputGLB)+'.'+randomUUID()+'.part';
      temporary=partPath(state,config.outputGLB); state.metadata=null; state.status='downloading';
      state.modelUrl=redact(url,deps.key || '');
      await save(state,config.outputGLB,deps.key);
      await (deps.download || download)(url,temporary);
      state.metadata=await glbMetadata(temporary); state.status='download-verified';
      // Persist the digest before publishing, so a crash after the link is recoverable.
      await save(state,config.outputGLB,deps.key);
      await publishVerified(temporary,config.outputGLB,deps.link);
    }
    if(temporary) { await fsp.unlink(temporary); temporary=null; }
    else if(state.downloadPart) await fsp.unlink(partPath(state,config.outputGLB)).catch(error=>{if(error.code!=='ENOENT') throw error;});
    state.status='complete'; state.endedAt ||= now(); state.downloadPart=null;
    await save(state,config.outputGLB,deps.key);
    return state;
  } catch(error) {
    if(state && !(error instanceof RunnerError)) fail('Collection failed locally or in transport. Retry collect only; request state is retained.');
    throw error;
  } finally {
    // Leave partial/verified downloads described by state for recovery on the next collect.
    await lock.close(); await fsp.unlink(files.lock);
  }
}
async function run(command, filename, deps) {
  if(!['submit','collect'].includes(command) || !filename) fail('Usage: node scripts/generate-pinpin-model.cjs submit|collect CONFIG.json');
  const config=readConfig(filename);
  return (command==='submit' ? submit : collect)(config,deps || loadClient());
}
if(require.main===module) run(process.argv[2],process.argv[3]).then(state=>{
  console.log(JSON.stringify({status:state.status,requestId:state.requestId,metadata:state.metadata ?? null}));
}).catch(error=>{
  console.error(error instanceof RunnerError ? error.message : 'Runner failed locally; check config, SDK/env paths, output state and lock. Raw errors suppressed.');
  process.exitCode=1;
});
module.exports={run,readConfig,sidecars,glbMetadata,download,DEFAULT_PARAMS,MULTIVIEW_MODEL,MULTIVIEW_PARAMS,resultFile};
