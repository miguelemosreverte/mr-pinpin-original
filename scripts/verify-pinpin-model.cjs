const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
function configure(env = {}) {
  const modelPath = path.resolve(env.PINPIN_MODEL_PATH || path.join(env.PINPIN_MODEL_DIR
    || path.join(__dirname, '../docs/storyboard/models/pinpin-v1'), 'model.glb'));
  const name = path.basename(path.dirname(modelPath)), version = /^pinpin-(v\d+)$/.exec(name)?.[1];
  const evidenceName = name === 'pinpin-v1' ? 'pinpin-3d' : name || 'pinpin-model';
  const url = new URL('http://127.0.0.1:8767/storyboard/review/pinpin-3d.html');
  if (version && version !== 'v1') url.searchParams.set('model', version);
  return { modelPath, base: env.PINPIN_3D_URL || url.href,
    output: path.resolve(env.PINPIN_OUTPUT_DIR || `/tmp/${evidenceName}-review`),
    reportPath: path.resolve(env.PINPIN_REPORT_PATH || `/tmp/${evidenceName}-verification.md`) };
}
const { base, output, reportPath, modelPath } = configure(process.env);
const frontAngle = Number(process.env.PINPIN_FRONT_AZIMUTH || 0) * Math.PI / 180;
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const azimuth = camera => Math.atan2(camera.position[0] - camera.target[0], camera.position[2] - camera.target[2]);

async function modelInfo() {
  const deadline = Date.now() + Number(process.env.PINPIN_MODEL_WAIT_MS || 180000);
  while (Date.now() < deadline) {
    if (fs.existsSync(modelPath)) {
      const bytes = fs.readFileSync(modelPath);
      if (bytes.length >= 20 && bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(12) <= bytes.length - 20
          && bytes.readUInt32LE(8) === bytes.length) {
        assert.equal(bytes.readUInt32LE(4), 2, 'actual GLB version 2');
        assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, 'GLB JSON chunk');
        const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8').trim());
        assert(json.meshes?.length > 0 && json.scenes?.length > 0, 'supplied GLB contains a mesh scene');
        return { path: modelPath, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
          meshes: json.meshes.length, materials: json.materials?.length || 0, images: json.images?.length || 0, animations: json.animations?.length || 0,
          extensionsUsed: json.extensionsUsed || [], extensionsRequired: json.extensionsRequired || [],
          nodes: (json.nodes || []).map((node, index) => ({ index, name: node.name || null, mesh: node.mesh ?? null, skin: node.skin ?? null, children: node.children || [] })),
          skins: (json.skins || []).map((skin, index) => ({ index, name: skin.name || null, skeleton: skin.skeleton ?? null,
            inverseBindMatrices: skin.inverseBindMatrices ?? null, joints: (skin.joints || []).map(node => ({ node, name: json.nodes?.[node]?.name || null })) })),
          meshDetails: json.meshes.map((mesh, index) => ({ index, name: mesh.name || null, primitives: mesh.primitives.map(primitive => ({
            mode: primitive.mode ?? 4, material: primitive.material ?? null, attributes: Object.keys(primitive.attributes || {}),
            positionCount: json.accessors?.[primitive.attributes?.POSITION]?.count ?? null, morphTargets: primitive.targets?.length || 0 })) })),
          materialDetails: (json.materials || []).map((material, index) => ({ index, name: material.name || null,
            alphaMode: material.alphaMode || 'OPAQUE', doubleSided: material.doubleSided === true,
            pbrMetallicRoughness: material.pbrMetallicRoughness || null, normalTexture: material.normalTexture || null,
            emissiveTexture: material.emissiveTexture || null, occlusionTexture: material.occlusionTexture || null, extensions: material.extensions || {} })),
          imageDetails: (json.images || []).map((image, index) => ({ index, name: image.name || null, mimeType: image.mimeType || null,
            source: image.uri ? image.uri.startsWith('data:') ? 'embedded-data-uri' : image.uri : 'embedded-bufferView', bufferView: image.bufferView ?? null })),
          textureDetails: (json.textures || []).map((texture, index) => ({ index, source: texture.source ?? null,
            webpSource: texture.extensions?.EXT_texture_webp?.source ?? null, extensions: texture.extensions || {} })),
          animationDetails: (json.animations || []).map((animation, index) => ({ index, name: animation.name || null,
            channels: (animation.channels || []).map(channel => ({ node: channel.target.node ?? null, path: channel.target.path })) })),
          separateEyeGeometry: 'Not established; mesh names and rendered eye markings alone are not proof of independent eye geometry.' };
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw Error('Awaiting complete supplied GLB: ' + modelPath);
}

async function camera(page) { return page.evaluate(() => window.__pinpin3D.camera); }
async function settle(page) {
  let previous = await camera(page), stable = 0;
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(80); const current = await camera(page);
    const movement = Math.hypot(...current.position.map((v, j) => v - previous.position[j]));
    stable = movement < 1e-4 ? stable + 1 : 0;
    if (stable >= 3) return current;
    previous = current;
  }
  throw Error('Camera did not settle after interaction');
}

async function drag(page, session, mobile, dx) {
  const box = await page.locator('#model-view').boundingBox();
  const startX = box.x + box.width / 2 - dx / 2, y = box.y + box.height * .57;
  if (mobile) {
    const touch = x => [{ x, y, id: 0, radiusX: 2, radiusY: 2, force: 1 }];
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(startX) });
    for (let i = 1; i <= 10; i++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touch(startX + dx * i / 10) });
      await page.waitForTimeout(16);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.move(startX, y); await page.mouse.down();
    await page.mouse.move(startX + dx, y, { steps: 12 }); await page.mouse.up();
  }
  return settle(page);
}

async function aim(page, session, mobile, target) {
  const box = await page.locator('#model-view').boundingBox();
  for (let i = 0; i < 12; i++) {
    const current = await camera(page), delta = angleDelta(target, azimuth(current));
    if (Math.abs(delta) < .012) return current;
    const dx = Math.max(-box.width * .6, Math.min(box.width * .6, -delta * box.height / (Math.PI * 2)));
    await drag(page, session, mobile, dx);
  }
  throw Error('Orbit gesture could not reach requested view');
}

async function pinch(page, session, start, end) {
  const box = await page.locator('#model-view').boundingBox(), x = box.x + box.width / 2, y = box.y + box.height * .6;
  const points = gap => [{ x: x - gap, y, id: 0, radiusX: 3, radiusY: 3, force: 1 }, { x: x + gap, y, id: 1, radiusX: 3, radiusY: 3, force: 1 }];
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(start) });
  for (let i = 1; i <= 10; i++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(start + (end - start) * i / 10) });
    await page.waitForTimeout(16);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return settle(page);
}

async function pixelProof(page, name) {
  const buffer = await page.locator('#model-view').screenshot();
  const result = await page.evaluate(async encoded => {
    const image = new Image(); image.src = 'data:image/png;base64,' + encoded; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 180;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, 240, 180);
    const pixels = ctx.getImageData(0, 0, 240, 180).data, colors = new Set();
    let min = 255, max = 0, modelPixels = 0, hash = 2166136261;
    const bounds = { left: 240, top: 180, right: -1, bottom: -1 };
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], brightness = (r + g + b) / 3;
      min = Math.min(min, brightness); max = Math.max(max, brightness);
      colors.add((r >> 3) + ',' + (g >> 3) + ',' + (b >> 3)); hash = Math.imul(hash ^ r ^ (g << 8) ^ (b << 16), 16777619);
      // Separate colored model pixels from the neutral floor and its shadow.
      if (Math.max(r, g, b) - Math.min(r, g, b) > 30 && r > g + 8) {
        modelPixels++; const x = i / 4 % 240, y = Math.floor(i / 4 / 240);
        bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
        bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
      }
    }
    return { colors: colors.size, lumaRange: max - min, modelPixels, bounds, hash: hash >>> 0 };
  }, buffer.toString('base64'));
  assert(result.colors > 60 && result.lumaRange > 45 && result.modelPixels > 100, 'nonblank actual model pixels: ' + JSON.stringify(result));
  assert(result.bounds.left > 1 && result.bounds.right < 238 && result.bounds.top > 1 && result.bounds.bottom < 178, 'model stays inside viewport');
  if (name) await page.screenshot({ path: path.join(output, name + '.png') });
  return result;
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const result = { url: base, frontAzimuthDegrees: frontAngle * 180 / Math.PI, model: null, views: [], passed: false };
  let browser;
  try {
    result.model = await modelInfo();
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const mobile of [false, true]) {
      const label = mobile ? 'mobile' : 'desktop', width = mobile ? 390 : 1440;
      const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 2 : 1,
        isMobile: mobile, hasTouch: mobile, reducedMotion: 'no-preference' });
      const page = await context.newPage(), session = await context.newCDPSession(page);
      const view = { label, width, errors: [], browserWarnings: [], failedRequests: [], httpErrors: [], screenshots: {}, passed: false }; result.views.push(view);
      page.on('pageerror', error => view.errors.push(error.message));
      page.on('console', message => {
        if (message.type() !== 'error') return;
        const error = { message: message.text(), location: message.location() };
        if (error.location.url?.endsWith('/favicon.ico')) view.browserWarnings.push(error);
        else view.errors.push(error);
      });
      page.on('requestfailed', request => view.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
      page.on('response', response => { if (response.status() >= 400) view.httpErrors.push({ url: response.url(), status: response.status() }); });
      try {
        await page.goto(base);
        await page.waitForFunction(() => (window.__pinpin3D?.loaded && window.__pinpin3D.camera && window.__pinpin3D.frames > 2) || window.__pinpin3D?.error, null, { timeout: 60000 });
        view.initial = await page.evaluate(() => window.__pinpin3D);
        assert.equal(view.initial.error, null); assert.equal(view.initial.loaded, true);
        view.servedModelHash = await page.evaluate(async () => {
          const response = await fetch(__pinpin3D.modelUrl);
          if (!response.ok) throw Error('Model hash request failed: ' + response.status);
          const hash = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
          return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('');
        });
        assert.equal(view.servedModelHash, result.model.sha256, 'viewer loads the selected GLB, not another version');
        assert(view.initial.meshes > 0 && view.initial.triangles > 0 && view.initial.bounds.size.every(v => v > 0));
        assert.equal(view.initial.animationsPlayed, 0, 'do not claim invented model animation');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const beforeRotate = await camera(page); await page.waitForTimeout(600); const afterRotate = await camera(page);
        assert(Math.abs(angleDelta(azimuth(afterRotate), azimuth(beforeRotate))) > .005, 'automatic camera rotation moves');
        await page.locator('#rotate').click(); await settle(page);
        assert.equal(await page.evaluate(() => __pinpin3D.autoRotate), false);
        const before = await camera(page), pixelsBefore = await pixelProof(page);
        const after = await drag(page, session, mobile, width * .13), pixelsAfter = await pixelProof(page);
        view.orbit = { angleChange: Math.abs(angleDelta(azimuth(after), azimuth(before))), pixelsChanged: pixelsBefore.hash !== pixelsAfter.hash };
        assert(view.orbit.angleChange > .05 && view.orbit.pixelsChanged, 'real orbit gesture changes camera and canvas pixels');
        const distanceBefore = (await camera(page)).distance;
        if (mobile) {
          const zoomed = await pinch(page, session, 40, 64);
          view.zoom = { method: 'two-finger pinch', before: distanceBefore, after: zoomed.distance, pageScale: await page.evaluate(() => visualViewport.scale) };
          assert(zoomed.distance < distanceBefore * .9); assert.equal(view.zoom.pageScale, 1, 'pinch zooms model, not page');
          await pinch(page, session, 64, 40);
        } else {
          await page.mouse.wheel(0, -180); const zoomed = await settle(page);
          view.zoom = { method: 'wheel', before: distanceBefore, after: zoomed.distance };
          assert(zoomed.distance < distanceBefore * .95);
          await page.mouse.wheel(0, 180); await settle(page);
        }
        for (const [name, offset] of [['front', 0], ['side', Math.PI / 2], ['rear', Math.PI]]) {
          const preset = frontAngle === 0 && await page.evaluate(name => typeof __pinpin3D.setView === 'function' && __pinpin3D.setView(name), name === 'side' ? 'right' : name);
          const position = preset ? await settle(page) : await aim(page, session, mobile, frontAngle + offset);
          assert(Math.abs(angleDelta(azimuth(position), frontAngle + offset)) < .012, 'screenshot matches requested camera axis');
          view.screenshots[name] = { camera: position, azimuth: azimuth(position), pixels: await pixelProof(page, label + '-' + name) };
        }
        assert.equal(new Set(Object.values(view.screenshots).map(s => s.pixels.hash)).size, 3, 'three genuinely different camera views');
        if (!mobile) {
          view.inspection = {};
          for (const name of ['left', 'underside']) {
            assert.equal(await page.evaluate(name => __pinpin3D.setView(name), name), true);
            await settle(page);
            view.inspection[name] = { camera: await camera(page), pixels: await pixelProof(page, label + '-' + name) };
          }
        }
        view.final = await page.evaluate(() => window.__pinpin3D);
        assert.equal(view.final.error, null); assert(view.final.frames > view.initial.frames);
        assert.deepEqual(view.errors, []); assert.deepEqual(view.failedRequests, []); assert.deepEqual(view.httpErrors, []);
        assert.deepEqual(view.browserWarnings, [], 'site favicon errors must also be resolved for final acceptance');
        view.passed = true; console.log(JSON.stringify({ viewport: label, passed: true, orbit: view.orbit, zoom: view.zoom }));
      } finally { await context.close(); }
    }
    result.passed = true;
  } catch (error) { result.error = error.message; throw error; }
  finally {
    await browser?.close(); fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(result, null, 2) + '\n');
    fs.writeFileSync(reportPath, ['# PinPin 3D Verification', '', `Status: ${result.passed ? 'PASS' : 'INCOMPLETE / FAIL'}`, '', `URL: ${base}`,
      `Model: ${result.model ? result.model.bytes + ' bytes / SHA-256 ' + result.model.sha256 : 'not available'}`, '',
      ...(result.model ? [`GLB inventory: ${result.model.meshes} meshes; ${result.model.materials} materials; ${result.model.images} images; ${result.model.skins.length} skins; ${result.model.skins.reduce((n, skin) => n + skin.joints.length, 0)} skin-joint entries; ${result.model.animations} animation clips.`,
        'Mesh primitive attributes, material/texture assignments, nodes, skins and named joints are recorded in results.json. Independent eye geometry is not established by these checks.', ''] : []),
      'Real local Chrome, actual supplied GLB, no substitute model. Canvas screenshots are sampled from browser compositor pixels, not cleared WebGL buffers.',
      `Front camera azimuth: ${result.frontAzimuthDegrees} degrees (0 means +Z); side is +90 degrees and rear +180 degrees.`, '',
      ...result.views.map(v => `- ${v.label}: ${v.passed ? 'PASS' : 'INCOMPLETE'}, model meshes=${v.initial?.meshes ?? '?'}, triangles=${v.initial?.triangles ?? '?'}, orbit=${JSON.stringify(v.orbit)}, zoom=${JSON.stringify(v.zoom)}, errors=${JSON.stringify(v.errors)}.`), '',
      ...result.views.filter(v => v.browserWarnings.length).map(v => `Browser-only warning (${v.label}): ${JSON.stringify(v.browserWarnings)}. Missing site favicon is recorded separately from model/viewer errors.`), '',
      'Checks: actual mesh and bounds; automatic camera movement; mouse/touch orbit changes camera and pixels; wheel/pinch changes distance; pinch does not zoom page; front/side/rear nonblank and framed; no page/console/request/HTTP errors; no horizontal overflow.',
      `Screenshots and raw diagnostics: ${output}/desktop-{front,side,rear}.png, mobile-{front,side,rear}.png, results.json.`,
      `Additional limb/face inspection views: ${output}/desktop-left.png and desktop-underside.png.`,
      'Scope: verification script only; no viewer or model edits. Camera interaction is not skeletal animation.',
      ...(result.error ? ['', 'Failure: ' + result.error] : [])].join('\n') + '\n');
  }
}
module.exports = { configure };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
