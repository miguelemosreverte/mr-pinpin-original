#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{parseArgs}=require('node:util');
const {parse,parseFragment,serialize}=require('parse5');
const repo=fs.realpathSync(path.resolve(__dirname,'../..'));
const inside=(root,file)=>file===root||file.startsWith(root+path.sep);
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function transform(original,first,interactive,extra=''){
  const tree=parse(original),all=[];
  const visit=n=>{all.push(n);for(const child of n.childNodes||[])visit(child);};visit(tree);
  const attr=(n,key)=>n.attrs?.find(a=>a.name===key)?.value;
  const header=all.find(n=>n.tagName==='header'),main=all.find(n=>n.tagName==='main');
  assert(header&&main&&all.some(n=>n.tagName==='script'&&n.childNodes?.some(c=>c.value?.includes('window.NEIGHBOR_REVIEW='))),'Expected neighbor review');
  const insert=(parent,index,markup)=>{const nodes=parseFragment(markup).childNodes;for(const n of nodes)n.parentNode=parent;parent.childNodes.splice(index,0,...nodes);};
  const remove=n=>n.parentNode.childNodes.splice(n.parentNode.childNodes.indexOf(n),1);
  const index=main.childNodes.indexOf(header);remove(header);
  insert(main,index,first+`<p><a id="interactive-link" href="${escape(interactive)}">Interactive heading controls and original review</a></p>`+extra);
  for(const n of all)if(attr(n,'id')==='demo'||n.tagName==='script'&&['player.js','scheduler.js'].includes(attr(n,'src')))remove(n);
  const title=all.find(n=>n.tagName==='title');title.childNodes=[{nodeName:'#text',value:'Mr. PinPin / composed turn and green-key trial',parentNode:title}];
  const body=all.find(n=>n.tagName==='body');insert(body,body.childNodes.length,'<script src="composition.js"></script>');
  const head=all.find(n=>n.tagName==='head');insert(head,head.childNodes.length,'<style>#composition{max-height:65vh;object-fit:contain}</style>');
  return serialize(tree);
}
function compose({source,out,green}){
  source=fs.realpathSync(source);out=path.resolve(out);
  assert(!inside(repo,source)&&!inside(repo,out)&&!inside(source,out),'Use separate external review directories');
  assert(fs.realpathSync(path.dirname(out))===path.dirname(out),'Use canonical output parent');
  assert(!fs.existsSync(out),'Output already exists');
  const original=fs.readFileSync(path.join(source,'index.html'),'utf8');
  assert(original.includes('window.NEIGHBOR_REVIEW=')&&original.includes('<header>')&&original.endsWith('</html>'),'Expected existing neighbor review');
  fs.mkdirSync(out);
  for(const item of fs.readdirSync(source)){
    const from=path.join(source,item);assert(!fs.lstatSync(from).isSymbolicLink(),'No source symlinks');
    if(item!=='index.html')fs.cpSync(from,path.join(out,item),{recursive:true,errorOnExist:true,force:false});
  }
  const first=`<header><h1>Mr. PinPin / composed turn</h1><p>000 walk, outbound turn, 015 walk, return turn. Four seconds, repeating. Existing white-background-derived sprites; the green test below is a separate single 000 loop, not a green turn set.</p></header><section id="composition-section"><canvas id="composition" width="960" height="540" aria-label="Automatic four-clip RGBA composition"></canvas><div class="toolbar"><button id="composition-play" class="icon" title="Pause composition" aria-label="Pause composition" disabled><i data-lucide="pause" aria-hidden="true"></i></button><output id="composition-phase">Loading composition</output></div><p class="status">Both turns visibly detour toward a front-facing pose. This shows the actual result, not an accepted monotonic or calibrated 15-degree turn.</p><p>Original matte samples 0-23 per clip, 24fps, one second each. No phase matching, interpolation, crossfade or reverse playback. Silent 480x270 display proxies; full native clips and exact inputs follow.</p></section>`;
  const extra=green?require('./green-section.cjs').greenSection(green,out):'';
  const html=transform(original,first,path.relative(out,path.join(source,'index.html')).split(path.sep).join('/'),extra);
  fs.copyFileSync(path.join(__dirname,'composition.js'),path.join(out,'composition.js'));
  fs.writeFileSync(path.join(out,'index.html'),html,{flag:'wx'});
  fs.writeFileSync(path.join(out,'composition-provenance.json'),JSON.stringify({version:1,sourceReview:source,sourceHtmlSha256:sha(path.join(source,'index.html')),sequence:['loop000','turn000015','loop015','turn015000'],samples:[0,23],fps:24,durationMs:4000,softwareSha256:sha(path.join(out,'composition.js')),htmlSha256:sha(path.join(out,'index.html')),greenKeyStatus:green?'Native and keyed comparison included; see green-provenance.json.':'Pending: no green-key output included in this composition-first edition. The external directory retains its earlier purple-key name.'},null,2)+'\n',{flag:'wx'});
  return path.join(out,'index.html');
}
if(require.main===module){try{const {values}=parseArgs({options:{source:{type:'string'},out:{type:'string'},green:{type:'string'}}});console.log(compose(values));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={compose,transform};
