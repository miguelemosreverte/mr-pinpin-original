const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../docs/storyboard');
const output = process.env.ATLAS_DOF_OUTPUT || '/tmp/pinpin-bokeh-strength';

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((request, response) => {
    if (request.url === '/') {
      response.setHeader('Content-Type', 'text/html');
      response.end('<style>body{margin:0}canvas{display:block;width:1536px;height:1024px}</style><canvas width="1536" height="1024"></canvas>');
      return;
    }
    const file = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.webp') ? 'image/webp' : 'text/plain');
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const info = await page.evaluate(async () => {
      const { createRenderer } = await import('/gpu/renderer.js');
      const canvas = document.querySelector('canvas');
      const rendererErrors = [];
      const renderer = await createRenderer({ canvas, artSrc: '/images/atlas/shire-v1.webp',
        depthSrc: '/images/atlas/shire-depth-v1.webp', borderSrc: null,
        onError: error => rendererErrors.push(error.message) });
      const camera = { x: 768, y: 512, width: 1536, height: 1024, scale: 1 };
      const check = () => {
        if (rendererErrors.length) throw new Error(rendererErrors.join('\n'));
        if (renderer.backend !== 'webgpu') throw new Error('Strength verification requires the actual WebGPU renderer');
      };
      check();
      const initial = renderer.stats;
      // Fix focus and animation so aperture is the only changing variable.
      renderer.render(camera, { focusDepth: 0.5, animate: false, overlayDirty: false, now: performance.now() });
      window.renderStrength = async strength => {
        renderer.setBokehStrength(strength);
        await new Promise(resolve => requestAnimationFrame(now => {
          renderer.render(camera, { focusDepth: 0.5, animate: false, overlayDirty: false, now });
          requestAnimationFrame(resolve);
        }));
        check();
        return { ...renderer.stats.dof, backend: renderer.backend, bokehStrength: renderer.stats.bokehStrength,
          dof: canvas.dataset.dof };
      };
      window.releaseDof = () => { check(); renderer.destroy(); };
      return { ...initial.adapter, width: canvas.width, height: canvas.height,
        defaultStrength: initial.bokehStrength, model: initial.dof.model };
    });
    assert.equal(info.defaultStrength, 4, 'Maximum aperture is the renderer default');
    assert.equal(info.model, 'global-miniature-aperture');
    const images = [], stats = [];
    for (const strength of [0, 1, 3, 4]) {
      const state = await page.evaluate(value => window.renderStrength(value), strength);
      assert.equal(state.backend, 'webgpu');
      assert.equal(state.strength, strength);
      assert.equal(state.bokehStrength, strength);
      assert.equal(state.dof, strength ? 'on' : 'off');
      assert.equal(state.focus, 0.5, 'Focus stays fixed during strength comparison');
      stats.push(state);
      images.push((await page.locator('canvas').screenshot({ path: path.join(output, `strength-${strength}.png`) })).toString('base64'));
    }
    const pixels = await page.evaluate(async images => {
      const data = [];
      for (const png of images) {
        const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
        data.push(context.getImageData(0, 0, image.width, image.height).data);
      }
      const difference = (a, b) => {
        let total = 0;
        for (let i = 0; i < a.length; i++) if (i % 4 !== 3) total += Math.abs(a[i] - b[i]);
        return total / (a.length / 4 * 3);
      };
      const edges = data.map(bytes => {
        let total = 0;
        for (let i = 4; i < bytes.length; i += 4) total += Math.abs(bytes[i] - bytes[i - 4]);
        return total / (bytes.length / 4);
      });
      const coverage = data.map(bytes => {
        let opaque = 0, minimum = 255, maximum = 0;
        for (let i = 0; i < bytes.length; i += 4) {
          if (bytes[i + 3] === 255) opaque++;
          minimum = Math.min(minimum, bytes[i]); maximum = Math.max(maximum, bytes[i]);
        }
        return { opaque: opaque / (bytes.length / 4), range: maximum - minimum };
      });
      return { zeroToOne: difference(data[0], data[1]), zeroToThree: difference(data[0], data[2]),
        oneToThree: difference(data[1], data[2]), zeroToFour: difference(data[0], data[3]),
        threeToFour: difference(data[2], data[3]), edges, coverage };
    }, images);
    assert(pixels.coverage.every(value => value.opaque === 1 && value.range > 100), 'Every capture contains opaque, nonblank artwork');
    assert(pixels.zeroToOne > 0.1, 'Strength one visibly differs from sharp');
    assert(pixels.zeroToThree > pixels.zeroToOne, 'Strength three blurs more than strength one');
    assert(pixels.oneToThree > 0.1, 'Strength three visibly differs from strength one');
    assert(pixels.threeToFour > 0.1, 'Maximum aperture visibly differs from strength three');
    assert(pixels.zeroToFour > pixels.zeroToThree, 'Maximum aperture blurs more than strength three');
    assert(pixels.edges.every((value, i) => !i || value < pixels.edges[i - 1]), 'Increasing strength reduces image edge contrast through maximum aperture');
    assert.deepEqual(errors, []);
    await page.evaluate(() => window.releaseDof());
    const result = { info, pixels, stats, errors };
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
