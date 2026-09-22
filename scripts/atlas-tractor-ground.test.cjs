const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = name => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(
  path.join(__dirname, '../docs/storyboard/gpu/', name), 'utf8')).toString('base64'));

test('roadside field clears road and wheels while preserving foreground tree samples', async () => {
  const { groundDepth, visibility } = await load('occlusion.js');
  const { tractorGroundDepth: ground, tractorGroundWeight: weight } = await load('tractor-ground.js');
  for (const [x, y] of [[1300,819],[1340,812],[1380,805],[1420,798],[1460,791]]) {
    assert.equal(weight(x, y), 1);
    assert.equal(ground(x, y, groundDepth(y)), 0.18);
  }
  const foot = ground(1380, 805, groundDepth(805));
  for (const [x,y,depth] of [[1325,775,.164488],[1360,775,.179956],[1440,760,.196514]]) {
    assert.equal(visibility(depth,foot), 1, `wheel ${x},${y}`);
  }
  assert.equal(visibility(.10,foot),0,'foreground tree over tractor still hides character');
  const entry = ground(1278.399,826.869,groundDepth(826.869));
  assert(weight(1278.399,826.869)>.98,'walking entry already reaches the near-depth plateau');
  assert.equal(visibility(.164488,entry),1,'first body overlap clears wheel during entry fade');
  assert.equal(visibility(.10,entry),0,'entry retains foreground tree occlusion');
  for (const [x,y,depth] of [[1330,830,.138],[1380,825,.104],[1420,820,.168],
    [1240,740,.161765],[1240,700,.125708],[1100,890,.071351]]) {
    assert.equal(visibility(depth,ground(x,y,groundDepth(y))), 0, `tree still hides trail ${x},${y}`);
  }
  for (const [x,y,depth] of [[1300,819,.279412],[1340,812,.262092],[1380,805,.211002],
    [1420,798,.238671],[1460,791,.190414]]) {
    const local = ground(x,y,groundDepth(y));
    assert.equal(visibility(depth,local), 1, `road trail ${x},${y}`);
  }
});

test('calibration is bounded and continuous at road margins', async () => {
  const { groundDepth } = await load('occlusion.js');
  const { tractorGroundDepth: ground, tractorGroundWeight: weight } = await load('tractor-ground.js');
  for (const [x,y] of [[0,800],[1259,819],[1481,790],[1240,740],[1380,780],[1380,830],[700,875]]) {
    assert.equal(weight(x,y),0);
    assert.equal(ground(x,y,groundDepth(y)),groundDepth(y));
  }
  for (let x=1255;x<=1485;x+=.5) for (let y=770;y<=845;y+=.5) {
    const value = ground(x,y,groundDepth(y));
    assert(value>=.18 && value<=groundDepth(y));
    assert(Math.abs(value-ground(x+.01,y,groundDepth(y)))<.0002);
    assert(Math.abs(value-ground(x,y+.01,groundDepth(y+.01)))<.0002);
  }
});
