const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../docs/storyboard/atlas-webgpu.js'),'utf8');
const key='pinpin.atlas.camera.v1';

function storageHarness(raw,blocked=false) {
  const calls=[];
  let saved=raw;
  const context=vm.createContext({width:1536,height:1024,cameraStorageKey:key,cameraReady:false,focusAllowed:false,familyPreview:false,
    camera:{snapshot:{x:553,y:512,width:1440,height:900,scale:1.875},
      focus(point,scale) { calls.push({point,scale}); },fit() { calls.push('fit'); }},
    sessionStorage:{getItem() { if (blocked) throw Error('blocked'); return saved; },
      setItem(_,value) { if (blocked) throw Error('blocked'); saved=value; }}});
  const start=source.indexOf('function snapshot()'), end=source.indexOf('function restoreReturnPlace()');
  assert(start>=0 && end>start, 'Camera storage helpers have a bounded test slice');
  vm.runInContext(source.slice(start,end),context);
  return {context,calls,read:() => saved};
}

test('camera storage rejects malformed, non-finite, nonnumeric and out-of-range values',() => {
  for (const raw of [null,'{','null','[]','{}',
    ...[{x:'400',y:512,zoom:2},{x:400,y:null,zoom:2},{x:-385,y:512,zoom:2},
      {x:1921,y:512,zoom:2},{x:400,y:1281,zoom:2},{x:400,y:-257,zoom:2},{x:400,y:512,zoom:0},
      {x:400,y:512,zoom:17}].map(JSON.stringify),'{"x":400,"y":512,"zoom":1e309}']) {
    const h=storageHarness(raw); assert.equal(h.context.readCamera(),null);
    h.context.restoreCamera(); assert.equal(h.calls.length,0);
    assert.equal(JSON.parse(h.read()).zoom,2);
  }
  const h=storageHarness(null,true); assert.doesNotThrow(() => h.context.restoreCamera());
});

test('boot cannot overwrite stored camera before restore; zoom is relative to cover',() => {
  const raw=JSON.stringify({x:1100,y:700,zoom:4}), h=storageHarness(raw);
  h.context.saveCamera(); assert.equal(h.read(),raw);
  h.context.restoreCamera(); assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].scale,4*1440/1536);
  assert.deepEqual(Array.from(h.calls[0].point),[1100,700]);
  assert.equal(h.context.focusAllowed,true);
});

test('family preview never overwrites the saved reading camera',() => {
  const raw=JSON.stringify({x:1100,y:700,zoom:4}), h=storageHarness(raw);
  h.context.familyPreview=true;
  h.context.cameraReady=true;
  h.context.saveCamera();
  assert.equal(h.read(),raw);
  h.context.familyPreview=false;
  h.context.saveCamera();
  assert.notEqual(h.read(),raw);
});

test('a stored overview restores using explicit fit semantics',() => {
  const h=storageHarness(JSON.stringify({x:768,y:512,zoom:.7}));
  h.context.restoreCamera(); assert.deepEqual(h.calls,['fit']);
});

test('camera storage accepts negative and expanded positions through the full navigation bounds',() => {
  for (const point of [[-200,-100],[1700,1150],[-384,-256],[1920,1280]]) {
    const h=storageHarness(JSON.stringify({x:point[0],y:point[1],zoom:8}));
    h.context.restoreCamera(); assert.equal(h.calls.length,1);
    assert.deepEqual(Array.from(h.calls[0].point),point);
  }
});

test('hardware Chrome: reload, clamping, language menu, preview and wheel anchor',
  {skip:!process.env.PLAYWRIGHT_MODULE,timeout:90000},async () => {
    const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
    const browser=await chromium.launch({channel:'chrome',headless:true});
    const base=process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';
    const near=(a,b) => assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
    const ready=async page => {
      await page.waitForFunction(() => window.atlasGpuDebug?.renderer && atlasGpuDebug.renderer.stats.draws>=1 &&
        document.getElementById('map-viewport').dataset.mask==='ready');
      await page.waitForFunction(() => !atlasGpuDebug.moving);
    };
    const camera=page => page.evaluate(() => atlasGpuDebug.camera.snapshot);
    try {
      for (const width of [1440,390,320]) {
        const context=await browser.newContext({viewport:{width,height:844}}), page=await context.newPage(), errors=[];
        page.on('pageerror',error => errors.push(error.message));
        await page.goto(base+'atlas-webgpu.html'); await ready(page);
        assert.equal(await page.evaluate(() => atlasGpuDebug.renderer.backend),'webgpu');
        assert.equal(await page.locator('.map-controls').isVisible(),false);
        assert.equal(await page.locator('#atlas-library').isVisible(),false);
        assert(await page.locator('.map-controls').evaluate(node => node.inert));
        const initial=await camera(page);
        const initialTarget=await page.evaluate(() => atlasGpuDebug.motionCanvas.dataset.target);
        near(initial.scale,2*Math.max(initial.width/1536,initial.height/1024));
        await page.evaluate(() => { if (!atlasGpuDebug.motion.paused) atlasGpuDebug.motion.toggle(); atlasGpuDebug.camera.focus([1000,640],4); });
        await ready(page);
        const expected=await camera(page);
        await page.reload(); await ready(page);
        assert.deepEqual(await camera(page),expected);
        const target=await page.evaluate(() => atlasGpuDebug.motionCanvas.dataset.target);
        assert.equal(target,initialTarget,'Camera restoration must not retarget the opening journey');
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => atlasGpuDebug.motionCanvas.dataset.target),target);
        for (const lang of ['es','ru','en']) {
          await page.locator('#atlas-language-toggle').click();
          assert(await page.locator('#atlas-languages').isVisible());
          await page.locator('#atlas-languages [data-lang="'+lang+'"]').click();
          assert.equal(await page.locator('#atlas-languages').isVisible(),false);
          assert.equal(await page.locator('html').getAttribute('lang'),lang);
          assert.deepEqual(await camera(page),expected);
        }
        await page.locator('#atlas-language-toggle').click(); await page.keyboard.press('Escape');
        assert.equal(await page.locator('#atlas-languages').isVisible(),false);
        await page.locator('#atlas-language-toggle').click(); await page.mouse.click(2,2);
        assert.equal(await page.locator('#atlas-languages').isVisible(),false);
        if (width===1440) {
          await page.mouse.move(800,480);
          const anchor=await page.evaluate(() => atlasGpuDebug.camera.screenToWorld([800,419]));
          await page.mouse.wheel(0,-80); await page.waitForTimeout(400);
          const after=await page.evaluate(() => atlasGpuDebug.camera.screenToWorld([800,419]));
          near(after[0],anchor[0]); near(after[1],anchor[1]);
        }
        for (const [lang,text] of [['en','Back to map'],['es','Volver al mapa'],['ru','\u041d\u0430\u0437\u0430\u0434 \u043a \u043a\u0430\u0440\u0442\u0435']]) {
          await page.locator('#atlas-language-toggle').click();
          await page.locator('#atlas-languages [data-lang="'+lang+'"]').click();
          await page.evaluate(() => atlasGpuDebug.focusDestination('bridge')); await ready(page);
          await page.locator('.atlas-book').click(); await page.waitForSelector('#story-preview[open]');
          assert.equal(await page.locator('#preview-close').textContent(),text);
          assert((await page.locator('#preview-close').boundingBox()).height>=48);
          assert((await page.locator('#preview-image').boundingBox()).width>200);
          assert((await page.locator('#preview-open').getAttribute('href')).includes('returnTo=atlas-webgpu.html'));
          assert.equal(await page.locator('#story-preview button').count(),1);
          await page.screenshot({path:`/tmp/pinpin-atlas-return-${width}-${lang}.png`});
          await page.mouse.click(2,2); await page.waitForFunction(() => !document.getElementById('story-preview').open);
          await page.waitForTimeout(100);
        }
        // pagehide saves the actual camera; set storage without a live atlas before boot.
        await page.goto(base+'illustrations.json');
        await page.evaluate(key => sessionStorage.setItem(key,JSON.stringify({x:0,y:1024,zoom:3})),key);
        await page.goto(base+'atlas-webgpu.html'); await ready(page);
        const clamped=await camera(page);
        near(clamped.x,0);
        near(clamped.y,1024);
        near(clamped.scale,3*Math.max(clamped.width/1536,clamped.height/1024));
        await page.evaluate(() => atlasGpuDebug.camera.focus([-200,-100],8));
        const floralPosition=await camera(page);
        near(floralPosition.x,-200); near(floralPosition.y,-100);
        await page.reload(); await ready(page);
        assert.deepEqual(await camera(page),floralPosition);
        assert.deepEqual(errors,[]);
        await context.close();
      }
    } finally { await browser.close(); }
  });
