const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {run,readConfig,sidecars,glbMetadata,download,DEFAULT_PARAMS,MULTIVIEW_MODEL,resultFile}=require('./generate-pinpin-model.cjs');
const {boundedFetch}=require('./generate-atlas-video.cjs');

function fixture(t,changes={}) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pinpin-model-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const filename=path.join(dir,'config.json'), source=path.join(dir,'source.png');
  fs.writeFileSync(source,Buffer.from('mock-reference-image'));
  const config={sourceImage:'source.png',outputGLB:'model.glb',prompt:'Reference-generation prompt',
    priceEstimate:{amount:null,currency:'USD',basis:'Test estimate only'},...changes};
  fs.writeFileSync(filename,JSON.stringify(config));
  const output=path.join(dir,'model.glb'), files=sidecars(output);
  return {filename,source,output,files,config,dir,state:()=>JSON.parse(fs.readFileSync(files.json))};
}
function glb() {
  const data=Buffer.alloc(24);
  data.write('glTF');data.writeUInt32LE(2,4);data.writeUInt32LE(24,8);
  data.writeUInt32LE(4,12);data.writeUInt32LE(0x4e4f534a,16);data.write('{}  ',20);
  return data;
}
function mocks() {
  const calls={upload:0,submit:0,status:0,result:0,download:0};
  const deps={key:'FAKE_KEY:SECRET_COMPONENT',client:{storage:{upload:async()=>{
    calls.upload++;return 'https://upload.example/reference.png?token=private-upload';
  }},queue:{submit:async(model,request)=>{calls.submit++;calls.input=request.input;return {request_id:'request-123'};},
    status:async()=>{calls.status++;return {status:'COMPLETED'};},
    result:async()=>{calls.result++;return {data:{model_glb:{url:'https://output.example/model.glb?token=private-result'}}};}}},
    download:async(_url,file)=>{calls.download++;await fsp.writeFile(file,glb(),{flag:'wx'});}};
  return {calls,deps};
}

test('config uses requested defaults, local relative paths and rejects unsupported paid inputs',t=>{
  const f=fixture(t), config=readConfig(f.filename);
  assert.deepEqual(config.params,DEFAULT_PARAMS);
  assert.equal(config.sourceImage,f.source);assert.equal(config.outputGLB,f.output);
  for(const change of [{params:{resolution:1536}},{params:{image_url:'https://other.example'}},
    {model:'fal-ai/other'},{sourceImage:'https://remote.example/x.png'}, {params:{remesh:'true'}}, {FAL_KEY:'do-not-save'}]) {
    fs.writeFileSync(f.filename,JSON.stringify({...f.config,...change}));
    assert.throws(()=>readConfig(f.filename));
  }
});
test('submit persists exact parameters and reference hash while redacting credentials and URL tokens',async t=>{
  const f=fixture(t,{prompt:'Book reference FAKE_KEY:SECRET_COMPONENT'}),{deps,calls}=mocks();
  const result=await run('submit',f.filename,deps), state=f.state();
  assert.equal(result.requestId,'request-123');assert.equal(calls.submit,1);
  assert.equal(calls.input.image_url,'https://upload.example/reference.png?token=private-upload');
  assert.equal(calls.input.prompt,undefined);assert.deepEqual(state.params,DEFAULT_PARAMS);
  assert.equal(state.referenceHash,createHash('sha256').update(fs.readFileSync(f.source)).digest('hex'));
  assert(state.startedAt && state.submittedAt);assert.equal(state.endedAt,null);
  for(const file of [f.files.json,f.files.md]) {
    const text=fs.readFileSync(file,'utf8');
    assert(!text.includes('FAKE_KEY'));assert(!text.includes('SECRET_COMPONENT'));assert(!text.includes('private-upload'));
    assert.equal(fs.statSync(file).mode&0o777,0o600);
  }
  await assert.rejects(run('submit',f.filename,deps),/Never resubmit/);assert.equal(calls.submit,1);
});
test('exclusive state creation permits only one concurrent submission',async t=>{
  const f=fixture(t),{deps,calls}=mocks();
  const results=await Promise.allSettled([run('submit',f.filename,deps),run('submit',f.filename,deps)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(calls.upload,1);assert.equal(calls.submit,1);
});
test('ambiguous paid transport remains blocked across subsequent invocations',async t=>{
  const f=fixture(t),{deps,calls}=mocks();
  deps.client.queue.submit=async()=>{calls.submit++;throw Error('FAKE_KEY:SECRET_COMPONENT');};
  await assert.rejects(run('submit',f.filename,deps),/never resubmit/);
  assert.equal(f.state().status,'submission-outcome-unknown');
  await assert.rejects(run('submit',f.filename,deps),/Never resubmit/);
  await assert.rejects(run('collect',f.filename,deps),/No saved request ID/);
  assert.equal(calls.submit,1);assert(!fs.existsSync(f.files.lock));
});
test('inherited transport guard blocks a second paid POST even after HTTP or network failure',async()=>{
  for(const networkFailure of [false,true]) {
    let posts=0;
    const transport=boundedFetch(async()=>{posts++;if(networkFailure)throw Error('secret transport');return new Response('',{status:503});});
    await assert.rejects(transport('https://queue.fal.run/fal-ai/trellis-2',{method:'POST'}));
    await assert.rejects(transport('https://queue.fal.run/fal-ai/trellis-2',{method:'POST'}),/no retry permitted/);
    assert.equal(posts,1);
  }
});
test('collect checks pending once, resumes the same ID, and completes a verified atomic download',async t=>{
  const f=fixture(t),{deps,calls}=mocks();await run('submit',f.filename,deps);
  deps.client.queue.status=async()=>{calls.status++;return {status:calls.status===1?'IN_PROGRESS':'COMPLETED'};};
  assert.equal((await run('collect',f.filename,deps)).status,'pending');
  assert.equal(calls.status,1);assert.equal(calls.download,0);assert(!fs.existsSync(f.output));
  // A saved request can be collected after the local reference image has moved away.
  fs.unlinkSync(f.source);
  const state=await run('collect',f.filename,deps);
  assert.equal(state.status,'complete');assert(state.endedAt && state.generationCompletedAt);
  assert.equal(state.metadata.bytes,24);assert(fs.readFileSync(f.output).equals(glb()));
  assert.equal(calls.submit,1);assert.equal(calls.status,2);assert.equal(calls.download,1);
  assert(!fs.readFileSync(f.files.json,'utf8').includes('private-result'));
  assert.equal((await run('collect',f.filename,deps)).status,'complete');assert.equal(calls.status,2);
  assert(!fs.existsSync(f.files.lock));
});
test('interrupted download is recoverable by collect without another paid request',async t=>{
  const f=fixture(t),{deps,calls}=mocks();await run('submit',f.filename,deps);
  const normal=deps.download;
  deps.download=async(_url,file)=>{await fsp.writeFile(file,'partial');throw Error('private failure');};
  await assert.rejects(run('collect',f.filename,deps),/Retry collect only/);
  assert(!fs.existsSync(f.output));assert.equal(f.state().status,'downloading');
  assert(fs.existsSync(path.join(f.dir,f.state().downloadPart)));
  deps.download=normal;await run('collect',f.filename,deps);
  assert.equal(calls.submit,1);assert(fs.readFileSync(f.output).equals(glb()));
  assert(!fs.readdirSync(f.dir).some(file=>file.endsWith('.part')));
});
test('verified partial or published GLB recovers locally without querying fal or overwriting files',async t=>{
  const f=fixture(t),{deps,calls}=mocks();await run('submit',f.filename,deps);
  const part=path.basename(f.output)+'.12345678-1234-1234-1234-123456789012.part';
  fs.writeFileSync(path.join(f.dir,part),glb());
  const state=f.state();state.downloadPart=part;state.metadata=await glbMetadata(path.join(f.dir,part));state.status='download-verified';
  fs.writeFileSync(f.files.json,JSON.stringify(state));
  await run('collect',f.filename,deps);assert.equal(calls.status,0);assert.equal(calls.download,0);
  state.downloadPart=null;fs.writeFileSync(f.files.json,JSON.stringify(state));
  await run('collect',f.filename,deps);assert.equal(calls.status,0);
  fs.writeFileSync(f.output,'unrelated-existing-file');
  await assert.rejects(run('collect',f.filename,deps),/not a complete GLB/);
  assert.equal(fs.readFileSync(f.output,'utf8'),'unrelated-existing-file');
});
test('invalid GLB never publishes, config mismatch and existing lock fail closed',async t=>{
  const f=fixture(t),{deps,calls}=mocks();await run('submit',f.filename,deps);
  deps.download=async(_url,file)=>fsp.writeFile(file,'not a glb');
  await assert.rejects(run('collect',f.filename,deps),/not a complete GLB/);assert(!fs.existsSync(f.output));
  fs.writeFileSync(f.filename,JSON.stringify({...f.config,params:{seed:11}}));
  await assert.rejects(run('collect',f.filename,deps),/Config differs/);
  fs.writeFileSync(f.files.lock,'another collector');
  await assert.rejects(run('collect',f.filename,deps),{code:'EEXIST'});
  assert.equal(fs.readFileSync(f.files.lock,'utf8'),'another collector');assert.equal(calls.submit,1);
});
test('download uses HTTPS with no credentials, rejects redirects, and persists only raw bytes',async t=>{
  const f=fixture(t);let calls=0;
  await assert.rejects(download('http://example.test/model.glb',f.output),/HTTPS/);
  await download('https://example.test/model.glb',f.output,async(_url,options)=>{
    calls++;assert.equal(options.redirect,'error');assert.equal(options.headers,undefined);
    return new Response(glb(),{status:200});
  });
  assert.equal(calls,1);assert.equal((await glbMetadata(f.output)).bytes,24);
});

function multiviewFixture(t) {
  const f=fixture(t,{model:MULTIVIEW_MODEL,sourceImages:[
    {view:'back',path:'back.png'},{view:'front',path:'front.png'},{view:'left',path:'left.png'}],
    params:{texture:true,pbr:true,geometry_quality:'detailed',texture_quality:'detailed',
      texture_alignment:'original_image',orientation:'default',quad:false,face_limit:150000,
      model_seed:210926,texture_seed:210926},priceEstimate:{amount:0.60,currency:'USD',basis:'User estimate'}});
  delete f.config.sourceImage;
  for(const view of ['front','left','back']) fs.writeFileSync(path.join(f.dir,view+'.png'),'reference-'+view);
  fs.writeFileSync(f.filename,JSON.stringify(f.config));
  return f;
}
test('multiview submits front/left/back once with exact parameters and per-view provenance',async t=>{
  const f=multiviewFixture(t),{deps,calls}=mocks(),names=[];
  deps.client.storage.upload=async file=>{calls.upload++;names.push(file.name);return 'https://upload.example/'+file.name+'?token=private';};
  const config=readConfig(f.filename);
  assert.deepEqual(Object.keys(config.sourceImages),['front','left','back']);
  await run('submit',f.filename,deps);
  assert.equal(calls.upload,3);assert.equal(calls.submit,1);
  assert.deepEqual(names,['pinpin-front.png','pinpin-left.png','pinpin-back.png']);
  assert.deepEqual(calls.input,{...f.config.params,image_urls:names.map(name=>'https://upload.example/'+name+'?token=private')});
  const state=f.state();
  assert.equal(state.model,MULTIVIEW_MODEL);assert.equal(state.priceEstimate.amount,0.6);
  assert.deepEqual(state.viewOrder,['front','left','back']);
  for(const view of state.viewOrder) {
    assert.equal(state.referenceHashes[view],createHash('sha256').update('reference-'+view).digest('hex'));
    assert.equal(state.imageUrls[view],'https://upload.example/pinpin-'+view+'.png');
  }
  await assert.rejects(run('submit',f.filename,deps),/Never resubmit/);assert.equal(calls.submit,1);
  deps.client.queue.result=async()=>({data:{model_urls:{pbr_model:{url:'https://result.example/pbr.glb'},glb:{url:'https://result.example/base.glb'}}}});
  let downloaded;
  deps.download=async(url,file)=>{downloaded=url;await fsp.writeFile(file,glb(),{flag:'wx'});};
  await run('collect',f.filename,deps);
  assert.equal(downloaded,'https://result.example/pbr.glb');assert.equal(f.state().resultField,'model_urls.pbr_model');
  assert.equal(f.state().status,'complete');assert.equal(calls.submit,1);
});
test('multiview rejects missing/ambiguous/repeated views, duplicated bytes, and FBX-only requests before upload',async t=>{
  const f=multiviewFixture(t),{deps,calls}=mocks();
  for(const change of [
    {sourceImages:[{view:'front',path:'front.png'},{view:'left',path:'left.png'}]},
    {sourceImages:[{view:'front',path:'front.png'},{view:'front',path:'left.png'},{view:'back',path:'back.png'}]},
    {sourceImages:{front:'front.png',side:'left.png',back:'back.png'}},
    {sourceImages:{front:'front.png',left:'front.png',back:'back.png'}},
    {sourceImages:['front.png','left.png','back.png']},
    {sourceImage:'source.png'}, {params:{quad:true}}, {params:{pbr:true,texture:false}},
    {params:{image_urls:['https://other.example']}}, {params:{geometry_quality:'ultra'}},
    {params:{model_seed:1.5}}, {params:{face_limit:0}}, {params:{seed:210926}}
  ]) {
    fs.writeFileSync(f.filename,JSON.stringify({...f.config,...change}));
    assert.throws(()=>readConfig(f.filename));
  }
  fs.writeFileSync(f.filename,JSON.stringify(f.config));
  fs.copyFileSync(path.join(f.dir,'front.png'),path.join(f.dir,'back.png'));
  await assert.rejects(run('submit',f.filename,deps),/duplicate image bytes/);
  assert.equal(calls.upload,0);assert.equal(calls.submit,0);assert(!fs.existsSync(f.files.json));
});
test('partial multiview upload failure preserves evidence and never reaches the paid queue',async t=>{
  const f=multiviewFixture(t),{deps,calls}=mocks();
  deps.client.storage.upload=async file=>{
    calls.upload++;if(calls.upload===3)throw Error('FAKE_KEY:SECRET_COMPONENT');
    return 'https://upload.example/'+file.name+'?secret=private';
  };
  await assert.rejects(run('submit',f.filename,deps),/never resubmit/);
  assert.equal(calls.submit,0);assert.deepEqual(Object.keys(f.state().imageUrls),['front','left']);
  assert.equal(Object.keys(f.state().referenceHashes).length,3);
  await assert.rejects(run('submit',f.filename,deps),/Never resubmit/);
  await assert.rejects(run('collect',f.filename,deps),/No saved request ID/);
  assert.equal(calls.upload,3);assert.equal(calls.submit,0);
  assert(!fs.readFileSync(f.files.json,'utf8').includes('private'));
});
test('Tripo result selection prefers PBR, then GLB or model_mesh; excludes known FBX',()=>{
  const file=name=>({url:'https://result.example/'+name,file_name:name});
  const data={model_urls:{pbr_model:file('pbr.glb'),glb:file('base.glb')},model_mesh:file('mesh.glb')};
  assert.equal(resultFile(data,MULTIVIEW_MODEL,{pbr:true}).field,'model_urls.pbr_model');
  assert.equal(resultFile(data,MULTIVIEW_MODEL,{pbr:false}).field,'model_urls.glb');
  data.model_urls.pbr_model=file('pbr.fbx');
  assert.equal(resultFile(data,MULTIVIEW_MODEL,{pbr:true}).field,'model_urls.glb');
  delete data.model_urls.glb;
  assert.equal(resultFile(data,MULTIVIEW_MODEL,{pbr:true}).field,'model_mesh');
  data.model_mesh=file('mesh.fbx');
  assert.throws(()=>resultFile(data,MULTIVIEW_MODEL,{pbr:true}),/no eligible GLB/);
  assert.deepEqual(resultFile({model_glb:file('trellis.glb')},'fal-ai/trellis-2',{}),{field:'model_glb',file:file('trellis.glb')});
});
test('SMB hard-link failure retains verified GLB for local-mini collect without new network work',async t=>{
  const f=multiviewFixture(t),{deps,calls}=mocks();
  await run('submit',f.filename,deps);
  deps.client.queue.result=async()=>{calls.result++;return {data:{model_mesh:{url:'https://result.example/model.glb'}}};};
  deps.link=async()=>{throw Object.assign(new Error('SMB unsupported'),{code:'ENOTSUP'});};
  await assert.rejects(run('collect',f.filename,deps),/Run collect on the mini local SSD/);
  const state=f.state();assert.equal(state.status,'download-verified');assert(state.metadata.sha256);
  assert(fs.existsSync(path.join(f.dir,state.downloadPart)));assert(!fs.existsSync(f.output));assert(!fs.existsSync(f.files.lock));
  const before={...calls};delete deps.link;
  await run('collect',f.filename,deps);
  assert.equal(f.state().status,'complete');assert.deepEqual(calls,before);assert.equal(calls.submit,1);
});
test('legacy Trellis config hash remains stable for already-saved requests',t=>{
  const f=fixture(t),config=readConfig(f.filename);
  const legacy={model:'fal-ai/trellis-2',params:DEFAULT_PARAMS,sourceImage:f.source,outputGLB:f.output,
    prompt:f.config.prompt,priceEstimate:f.config.priceEstimate};
  assert.equal(config.configHash,createHash('sha256').update(JSON.stringify(legacy)).digest('hex'));
});
