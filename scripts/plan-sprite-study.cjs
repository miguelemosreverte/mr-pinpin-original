// Offline planning only: no renderer, model client, network call, or runtime edits.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {parseArgs} = require('node:util');

const ROOT = path.resolve(__dirname, '..');
const STAGES = [4, 8, 16, 30];
const inside = (root, target) => target === root || target.startsWith(root + path.sep);

function integer(value, name, max) {
  assert(/^[1-9][0-9]*$/.test(String(value)), `${name} must be a positive integer`);
  const number = Number(value);
  assert(Number.isSafeInteger(number) && number <= max, `${name} exceeds ${max}`);
  return number;
}

function inputs(specs, characters, role) {
  return specs.map(spec => {
    const separator = spec.indexOf('=');
    assert(separator > 0, `${role} must be CHARACTER=LOCAL_FILE`);
    const character = spec.slice(0, separator), suppliedPath = spec.slice(separator + 1);
    assert(characters.includes(character) && suppliedPath, `${role} needs a selected character and file`);
    const filename = fs.realpathSync(path.resolve(suppliedPath));
    assert(fs.statSync(filename).isFile(), `${role} must be a regular file`);
    const bytes = fs.readFileSync(filename);
    return {character, role, path: filename, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'), visualValidation: 'not-performed'};
  });
}

function makePlan({characters = 'pinpin', frames = '4', angles = '1', angleOffset = '0', resolution = '256x256', cycleSeconds = '1',
  reference = [], guide = []} = {}) {
  const ids = characters.split(',');
  assert(ids.length <= 64 && ids.every(id => /^[a-z][a-z0-9-]{0,63}$/.test(id)) &&
    new Set(ids).size === ids.length, 'characters must be distinct lowercase slugs (maximum 64)');
  frames = integer(frames, 'frames', 30);
  assert(STAGES.includes(frames), 'frames must be 4, 8, 16, or 30');
  angles = integer(angles, 'angles', 360);
  assert(/^(?:[0-9]+)(?:\.[0-9]+)?$/.test(String(angleOffset)) && Number(angleOffset) < 360,
    'angle-offset must be at least zero and less than 360');
  angleOffset = Number(angleOffset);
  assert(/^(?:[0-9]+)(?:\.[0-9]+)?$/.test(String(cycleSeconds)) && Number(cycleSeconds) > 0 &&
    Number(cycleSeconds) <= 60, 'cycle-seconds must be greater than zero and at most 60');
  cycleSeconds = Number(cycleSeconds);
  const match = /^([1-9][0-9]*)x([1-9][0-9]*)$/.exec(resolution);
  assert(match, 'resolution must be WIDTHxHEIGHT');
  const width = integer(match[1], 'width', 8192), height = integer(match[2], 'height', 8192);
  const appearance = inputs(reference, ids, 'appearance-reference');
  const motion = inputs(guide, ids, 'rig-motion-guide');
  const estimate = frameCount => {
    const sprites = ids.length * angles * frameCount, pixels = sprites * width * height;
    const rgbaBytes = pixels * 4;
    assert(Number.isSafeInteger(rgbaBytes), 'estimate exceeds exact integer range');
    return {frames: frameCount, sprites, pixels, rgbaBytes, rgbaMiB: rgbaBytes / 1048576,
      approximateMipmappedRgbaBytes: Math.ceil(rgbaBytes * 4 / 3)};
  };
  return {schemaVersion: 1, status: 'plan-only', imageCalls: 0, provider: null, model: null,
    characters: ids, frames, angles, cycleSeconds, samplesPerSecond: frames / cycleSeconds, angleStepDegrees: 360 / angles,
    angleOffset, headingDegrees: Array.from({length: angles}, (_, i) => (angleOffset + i * 360 / angles) % 360),
    phaseConvention: 'Frame i samples i/N of one cycle; do not duplicate the endpoint.',
    phases: Array.from({length: frames}, (_, i) => i / frames),
    sampleSeconds: Array.from({length: frames}, (_, i) => i * cycleSeconds / frames),
    headingConvention: 'Azimuth 0 is rig forward; positive rotation around rig up. Confirm camera-to-atlas mapping in review.',
    resolution: {width, height, meaning: 'rig output and final packing budget per sprite, not an imagegen output guarantee'},
    appearanceReferences: appearance, motionGuides: motion,
    missingRoles: ids.flatMap(character => [
      ...(!appearance.some(item => item.character === character) ? [{character, role: 'appearance-reference'}] : []),
      ...(!motion.some(item => item.character === character) ? [{character, role: 'rig-motion-guide'}] : [])]),
    estimate: estimate(frames), stages: STAGES.map(estimate),
    memoryBasis: 'All selected sprites resident as tightly packed RGBA8. Excludes atlas gutters, decoder copies, staging buffers and other textures. Mipmap estimate assumes a full chain; compressed transfer size is unknown.',
    reviewGates: ['book identity and silhouette', 'fixed camera, scale and foot anchor',
      'foot contact and stance/swing timing', 'leg crossings and occlusion', 'loop seam and heading transitions'],
    limitations: ['Four appearance keys do not prove motion.',
      'Use a dense rig guide for every final phase, not repeated edits of the preceding generated frame.',
      'Optical-flow interpolation is optional and can fail at occlusion, disocclusion and crossing legs.',
      'Low-resolution motion plus high-resolution keys does not automatically restore missing detail.',
      'Bake approved final sprites offline; do not repair anatomy at runtime.',
      'No provider, Ollama installation, model capability, price or exact generated resolution is assumed.']};
}

function promptFor(plan) {
  const records = [...plan.appearanceReferences, ...plan.motionGuides].map(item =>
    `${item.role} | character=${item.character} | file=${JSON.stringify(item.path)} | sha256=${item.sha256}`);
  return `OFFLINE HYBRID SPRITE STUDY - MANUAL IMAGE REQUEST TEMPLATE
No image calls have been made. Attach the listed files to your chosen image tool.
Replace {characterId}, {angleDegrees}, {frameIndex}, and {phase} for one output.
Select only references for that character and the exact matching rig guide pose.
If a supplied guide is a sheet, identify its matching row/cell explicitly first.

INPUT ROLES (local hashes identify bytes, not visual approval)
${records.join('\n') || 'No files supplied yet.'}
Missing roles: ${JSON.stringify(plan.missingRoles)}
Do not invent or claim unseen attachments. Supply missing roles before generation.

REQUEST
Create one full-body sprite of {characterId}, heading {angleDegrees} degrees,
frame {frameIndex} of ${plan.frames}, cycle phase {phase}.
The full cycle lasts ${plan.cycleSeconds} seconds at every sampling density.
Use the appearance-reference images ONLY for book identity, proportions, face,
clothing, palette, material and illustration style. They do not specify this pose.
Use the rig-motion-guide ONLY for the exact camera, silhouette, joint pose, limb
overlap, foot contact, framing and ground anchor. Do not copy its placeholder
materials or replace the book character's appearance with the rig's appearance.
Where a guide's proportions conflict with the book reference, stop for rig review;
do not silently invent different anatomy or foot placement.
Preserve the same character scale and canvas anchor across phases and headings.
Keep the whole silhouette inside the canvas with clear margins; no labels,
scenery or added limbs. Request transparent background if the selected tool
supports it; otherwise plan separate, reviewed alpha preparation offline.
Rig output and final packing target is ${plan.resolution.width}x${plan.resolution.height} per sprite.
This is a target, not a claim that any image tool supports exact output dimensions.
The available built-in image tool accepts prompts and references, not explicit
resolution or quality controls. No provider or local model is assumed installed.
Review the generated result before offline cropping/resampling and alpha export.
Do not derive this pose by editing the previous generated frame. Follow its rig
guide and the approved appearance references anew. Bake reviewed sprites offline.
`;
}

function writePlan(options) {
  assert(options.outDir, 'Specify --out-dir pointing to a new directory outside the checkout');
  const output = path.resolve(options.outDir), parent = fs.realpathSync(path.dirname(output));
  const resolved = path.join(parent, path.basename(output));
  assert(!inside(ROOT, output) && !inside(fs.realpathSync(ROOT), resolved), 'Output must be outside the checkout');
  assert(parent === path.dirname(output), 'Output parent must use its canonical path, not a symlink');
  const plan = makePlan(options), prompt = promptFor(plan);
  fs.mkdirSync(output); // Exclusive directory creation protects existing files and dangling links.
  fs.writeFileSync(path.join(output, 'plan.json'), JSON.stringify(plan, null, 2) + '\n', {flag: 'wx'});
  fs.writeFileSync(path.join(output, 'prompt.txt'), prompt, {flag: 'wx'});
  return {output, status: plan.status, imageCalls: 0, estimate: plan.estimate, missingRoles: plan.missingRoles};
}

function main(args = process.argv.slice(2)) {
  const {values} = parseArgs({args, options: {
    characters: {type: 'string'}, frames: {type: 'string'}, angles: {type: 'string'}, 'angle-offset': {type: 'string'},
    resolution: {type: 'string'}, 'cycle-seconds': {type: 'string'}, reference: {type: 'string', multiple: true},
    guide: {type: 'string', multiple: true}, 'out-dir': {type: 'string'}, help: {type: 'boolean'}
  }});
  if (values.help) {
    console.log('node scripts/plan-sprite-study.cjs --out-dir NEW_EXTERNAL_DIR [--characters pinpin,mama] [--frames 4|8|16|30] [--angles 24] [--angle-offset 105] [--resolution 256x256] [--cycle-seconds 1] [--reference CHARACTER=FILE] [--guide CHARACTER=FILE]\n' +
      'Reference/guide flags repeat. Parent must exist. Writes plan.json and prompt.txt only; never overwrites or calls image models.');
    return;
  }
  console.log(JSON.stringify(writePlan({...values, angleOffset: values['angle-offset'], cycleSeconds: values['cycle-seconds'], outDir: values['out-dir']}), null, 2));
}

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {makePlan, promptFor, writePlan, main};
