const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const output = process.env.ATLAS_FACE_OUTPUT || '/tmp/atlas-face-layer';
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 480 } });
    await page.setContent('<canvas id="demo" width="900" height="480"></canvas>');
    await page.addScriptTag({ path: path.join(__dirname, '../docs/storyboard/atlas-face-layer.js') });
    const result = await page.evaluate(() => {
      const check = (value, message) => { if (!value) throw Error(message); };
      const canvas = () => { const c = document.createElement('canvas'); c.width = c.height = 128; return c; };
      const body = canvas(), ctx = body.getContext('2d');
      // Diagnostic fixture artwork, not production eyes or generated character art.
      ctx.fillStyle = '#ddb98a'; ctx.fillRect(8, 8, 112, 112);
      ctx.fillStyle = '#804421'; ctx.fillRect(12, 90, 104, 20);
      ctx.fillStyle = '#171615'; ctx.fillRect(49, 50, 4, 8); ctx.fillRect(75, 50, 4, 8);
      ctx.fillStyle = '#a34238'; ctx.fillRect(57, 70, 14, 4);
      const blink = canvas(); blink.getContext('2d').drawImage(body, 0, 0);
      const b = blink.getContext('2d'); b.fillStyle = '#ddb98a'; b.fillRect(45, 45, 40, 20);
      b.fillStyle = '#171615'; b.fillRect(48, 55, 7, 2); b.fillRect(74, 55, 7, 2);
      const gaze = canvas(); gaze.getContext('2d').drawImage(body, 0, 0);
      const g = gaze.getContext('2d'); g.fillStyle = '#ddb98a'; g.fillRect(45, 45, 40, 20);
      g.fillStyle = '#171615'; g.fillRect(51, 50, 4, 8); g.fillRect(77, 50, 4, 8);
      const frame = { id: 'fixture-0-frame-0', rect: [0, 0, 128, 128], anchor: [0, 0] };
      const asset = image => ({ image, rect: frame.rect, registration: frame.id });
      frame.face = { enabled: true, registration: frame.id, bounds: [20, 20, 88, 68],
        pivot: [64, 60], features: [40, 40, 48, 38], feather: 4,
        eyes: [{ bounds: [42, 42, 42, 22], feather: 2, blink: asset(blink), gaze: { right: asset(gaze) } }] };
      const faces = AtlasFaceLayer.create(), prepared = faces.prepare({ image: body, frame });
      check(prepared.enabled, 'registered fixture enabled: ' + prepared.reason);
      check(prepared.capabilities.blink && prepared.capabilities.gaze, 'registered artwork accepted');
      const render = (options, opacity = 1) => {
        const c = canvas(), context = c.getContext('2d'); context.globalAlpha = opacity;
        faces.draw(context, prepared, options); return c;
      };
      const pixels = c => c.getContext('2d').getImageData(0, 0, 128, 128).data;
      const original = pixels(body), neutral = pixels(render({})), tilted = pixels(render({ tiltDegrees: 2 }));
      const clamped = pixels(render({ tiltDegrees: 200 })), blinking = pixels(render({ blink: true }));
      const looking = pixels(render({ gaze: 'right' })), unavailable = pixels(render({ gaze: 'missing' }));
      let changed = 0, eyeChanged = 0;
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) for (let k = 0; k < 4; k++) {
        const i = (y * 128 + x) * 4 + k, inside = x >= 20 && x < 108 && y >= 20 && y < 88;
        check(neutral[i] === original[i], 'neutral is exact original');
        check(unavailable[i] === original[i], 'unavailable gaze is exact original');
        check(tilted[i] === clamped[i], 'tilt clamps to two degrees');
        if (!inside || k === 3) check(tilted[i] === original[i], 'body and alpha silhouette never change');
        if (tilted[i] !== original[i]) changed++;
        if (blinking[i] !== original[i]) eyeChanged++;
      }
      check(changed > 40 && eyeChanged > 20, 'independent face and eye changes visible');
      check(blinking[(52 * 128 + 50) * 4] === 221, 'blink removes the original open pupil');
      check(looking[(52 * 128 + 49) * 4] === 221, 'gaze removes the old pupil instead of adding a second');
      const half = pixels(render({ tiltDegrees: 2, blink: true }, .5));
      check(half[(55 * 128 + 50) * 4 + 3] === 128, 'face has the same caller opacity as body');
      const allocations = faces.stats.allocations;
      const target = canvas().getContext('2d');
      for (let i = 0; i < 300; i++) faces.draw(target, prepared, { tiltDegrees: Math.sin(i) * 2, blink: i % 20 < 2 });
      check(faces.stats.allocations === allocations, 'animation allocates no canvases');
      const demoFrames = [body, render({ tiltDegrees: -2 }), render({ blink: true }), render({ gaze: 'right' })];
      for (const alpha of [245, 253]) {
        const near = canvas(), nearBlink = canvas();
        for (const [c, original] of [[near, body], [nearBlink, blink]]) {
          const context = c.getContext('2d'); context.drawImage(original, 0, 0);
          const data = context.getImageData(0, 0, 128, 128);
          for (let i = 3; i < data.data.length; i += 4) if (data.data[i]) data.data[i] = alpha;
          context.putImageData(data, 0, 0);
        }
        const nearFrame = { ...frame, face: { ...frame.face, eyes: [{ bounds: [42, 42, 42, 22], blink: asset(nearBlink) }] } };
        const entry = faces.prepare({ image: near, frame: nearFrame });
        check(entry.capabilities.headTilt && entry.capabilities.blink, 'near-opaque samples accepted');
        const result = canvas(); faces.draw(result.getContext('2d'), entry, { tiltDegrees: 2, blink: true });
        const actual = pixels(result), expected = pixels(near);
        for (let i = 3; i < actual.length; i += 4) check(actual[i] === expected[i], 'near-opaque body alpha preserved exactly');
      }
      const tinted = canvas(); tinted.getContext('2d').drawImage(blink, 0, 0);
      const tc = tinted.getContext('2d'), tint = tc.getImageData(42, 42, 42, 22);
      for (let i = 0; i < tint.data.length; i += 4) for (let k = 0; k < 3; k++) tint.data[i + k] += 10;
      tc.putImageData(tint, 42, 42);
      const tolerant = structuredClone({ ...frame, face: { ...frame.face, eyes: [] } });
      tolerant.face.maxTiltDegrees = 0;
      tolerant.face.eyes = [{ bounds: [42, 42, 42, 22], feather: 2, blink: asset(tinted) }];
      const strict = faces.prepare({ image: body, frame: tolerant });
      check(!strict.capabilities.blink, 'default tolerance remains zero');
      check(strict.diagnostics[0].meanError === 10 && strict.diagnostics[0].maxError === 10, 'reports actual feather band error');
      tolerant.face.eyes[0].blink.registrationTolerance = { meanError: 12, maxError: 60 }; tolerant.revision = 1;
      const approved = faces.prepare({ image: body, frame: tolerant });
      check(approved.capabilities.blink && !approved.capabilities.headTilt, 'reviewed tolerance enables eyes-only art');
      const toleranceProof = approved.diagnostics[0];
      const spike = tc.getImageData(42, 42, 1, 1); spike.data[2] = 220; tc.putImageData(spike, 42, 42);
      tolerant.revision = 2;
      const highMaximum = faces.prepare({ image: body, frame: tolerant });
      check(!highMaximum.capabilities.blink && highMaximum.diagnostics[0].maxError > 60, 'maximum error gate rejects isolated misregistration');
      for (let i = 0; i < tint.data.length; i += 4) for (let k = 0; k < 3; k++) tint.data[i + k] += 3;
      tc.putImageData(tint, 42, 42); tolerant.revision = 3;
      const highMean = faces.prepare({ image: body, frame: tolerant });
      check(!highMean.capabilities.blink && highMean.diagnostics[0].meanError === 13, 'mean error gate rejects broad mismatch');
      const mismatched = canvas(); mismatched.getContext('2d').drawImage(blink, 0, 0);
      mismatched.getContext('2d').clearRect(42, 42, 1, 1);
      frame.face.eyes[0].blink = asset(mismatched); frame.revision = 1;
      const rejected = faces.prepare({ image: body, frame });
      check(!rejected.capabilities.blink, 'unregistered alpha border disables blink');
      const edge = { ...frame, id: 'edge', face: { ...frame.face, registration: 'edge', bounds: [2, 2, 110, 100], pivot: [60, 60] } };
      edge.face.eyes = [{ bounds: [42, 42, 42, 22], feather: 2, blink: { ...asset(blink), registration: 'edge' } }];
      const unsafeHead = faces.prepare({ image: body, frame: edge });
      check(unsafeHead.enabled && !unsafeHead.capabilities.headTilt && unsafeHead.capabilities.blink,
        'head/silhouette guard disables only head, not independently registered eyes');
      const eyeOutput = canvas(); faces.draw(eyeOutput.getContext('2d'), unsafeHead, { blink: true, tiltDegrees: 2 });
      check(pixels(eyeOutput).every((v, i) => v === blinking[i]), 'failed head guard still gives exact blink-only pixels');
      const onlyEyes = { id: 'eyes-only', rect: frame.rect, anchor: frame.anchor,
        face: { enabled: true, registration: 'eyes-only', maxTiltDegrees: 0,
          eyes: [{ bounds: [42, 42, 42, 22], blink: { ...asset(blink), registration: 'eyes-only' } }] } };
      const independent = faces.prepare({ image: body, frame: onlyEyes });
      check(independent.enabled && independent.capabilities.blink && independent.headReason === 'disabled',
        'eyes-only requires no head landmarks');
      const demo = document.getElementById('demo').getContext('2d');
      demo.fillStyle = '#f4f5f6'; demo.fillRect(0, 0, 900, 480);
      demo.font = '20px sans-serif';
      for (const [index, source] of demoFrames.entries()) {
        demo.drawImage(source, 12 + index * 220, 80, 210, 210);
        demo.fillStyle = '#222'; demo.fillText(['Neutral', 'Face tilt -2 deg', 'Authored blink fixture', 'Authored gaze fixture'][index], 12 + index * 220, 330);
      }
      return { changedChannels: changed, eyeChangedChannels: eyeChanged, allocations,
        capabilities: prepared.capabilities, cache: faces.stats, framesWithoutAllocations: 300, toleranceProof };
    });
    await page.screenshot({ path: path.join(output, 'diagnostic.png') });
    assert(result.changedChannels > 40);
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
