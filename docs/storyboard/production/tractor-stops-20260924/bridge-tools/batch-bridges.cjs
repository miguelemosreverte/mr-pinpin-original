// One-shot scheduler. Run again to collect pending requests / discover newly reviewed stops.
// A durable per-stop lock and the existing runner prevent automatic paid retries.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const pack=process.argv[2];if(!pack)throw Error('Pass the direct-mini production pack');
if(fs.existsSync(path.join(pack,'bridge-tools/HOLD')))throw Error('Bridge generation is on hold');
const template=JSON.parse(fs.readFileSync(path.join(pack,'stops/stop-04/bridge/config.json'))),runner=path.join(pack,'bridge-tools/run-bridge.cjs');
for(let n=0;n<24;n++){
 const id=`stop-${String(n).padStart(2,'0')}`,dir=path.join(pack,'stops',id),selected=path.join(dir,'selected.json');
 if(!fs.existsSync(selected))continue;const desc=JSON.parse(fs.readFileSync(selected));if(desc.status!=='reviewed'||desc.id!==id)continue;
 const bridge=path.join(dir,'bridge');fs.mkdirSync(bridge,{recursive:true});const configFile=path.join(bridge,'config.json');
 if(!fs.existsSync(configFile)){const c=structuredClone(template);c.sourceImage=path.join(dir,'source.png');c.endImage=path.join(pack,desc.forward);c.output=path.join(bridge,'bridge-raw-v1.mp4');fs.writeFileSync(configFile,JSON.stringify(c,null,2)+'\n',{flag:'wx'});fs.writeFileSync(path.join(bridge,'prompt.txt'),c.input.prompt+'\n');fs.writeFileSync(path.join(bridge,'negative-prompt.txt'),c.input.negative_prompt+'\n');}
 const receiptFile=path.join(bridge,'bridge-raw-v1.json'),lock=path.join(bridge,'bridge-submit.lock');let action;
 if(fs.existsSync(receiptFile)){const receipt=JSON.parse(fs.readFileSync(receiptFile));if(receipt.status==='complete'){console.log(id,'complete');continue;}if(!receipt.requestId){console.log(id,'guarded: no request ID; review required');continue;}action='collect';}
 else if(fs.existsSync(lock)){console.log(id,'guarded: existing submission lock; review required');continue;}else action='submit';
 const result=spawnSync(process.execPath,[runner,action,configFile],{env:process.env,encoding:'utf8',timeout:120000});
 // Never echo provider response objects / upload URLs into review logs.
 console.log(id,action,result.status===0?'done':'pending or blocked; inspect private receipt');
}
