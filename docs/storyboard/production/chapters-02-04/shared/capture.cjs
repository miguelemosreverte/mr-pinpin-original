const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [planFile,generatedFile,startedAt,finishedAt]=process.argv.slice(2);
const p=JSON.parse(fs.readFileSync(planFile));const file=p.output;
if(fs.existsSync(file))throw Error('Refusing to overwrite '+file);
const b=fs.readFileSync(generatedFile);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(generatedFile,file);
const record={...p,tool:'built-in image_gen.imagegen',generatedFile,startedAt,finishedAt,seconds:(Date.parse(finishedAt)-Date.parse(startedAt))/1000,width:b.readUInt32BE(16),height:b.readUInt32BE(20),sha256:crypto.createHash('sha256').update(b).digest('hex'),review:'Pending root visual review'};
fs.writeFileSync(file.replace(/\.png$/,'.json'),JSON.stringify(record,null,2)+'\n');
fs.writeFileSync(file.replace(/\.png$/,'.md'),`# ${p.id}\n\nStatus: ${p.status}\n\nTool: ${record.tool}\n\nStarted: ${startedAt}\nFinished: ${finishedAt}\n\nDimensions: ${record.width} × ${record.height}\nSHA-256: ${record.sha256}\n\n## Exact prompt\n\n${p.prompt}\n\n## References\n\n${p.references.map(r=>'- '+r.path+': '+r.role).join('\n')}\n\n## Review\n\n${record.review}\n`);
console.log(file);
