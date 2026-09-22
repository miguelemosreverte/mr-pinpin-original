// Authored roadside calibration; coordinates are in the original 1536x1024 art.
export const TRACTOR_GROUND = Object.freeze({
  startX: 1260, endX: 1480, endFade: 20,
  startY: 828.5, slope: -0.175, halfWidth: 6, fadeWidth: 8, depth: 0.18
});
const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

export function tractorGroundWeight(x, y) {
  const p = TRACTOR_GROUND;
  const offset = Math.abs(y - (p.startY + p.slope * (x - p.startX)));
  return smooth((x - p.startX) / p.endFade) * smooth((p.endX - x) / p.endFade)
    * (1 - smooth((offset - p.halfWidth) / p.fadeWidth));
}

export function tractorGroundDepth(x, y, base) {
  return base + (TRACTOR_GROUND.depth - base) * tractorGroundWeight(x, y);
}

const f = value => Number.isInteger(value) ? `${value}.0` : String(value);
const p = TRACTOR_GROUND;
// Generate shader constants from the same calibration used for CPU foot depth.
export const TRACTOR_GROUND_WGSL = `
fn tractor_ground_weight(point: vec2f) -> f32 {
  let offset = abs(point.y - (${f(p.startY)} + ${f(p.slope)} * (point.x - ${f(p.startX)})));
  return smoothstep(${f(p.startX)}, ${f(p.startX + p.endFade)}, point.x)
    * (1.0 - smoothstep(${f(p.endX - p.endFade)}, ${f(p.endX)}, point.x))
    * (1.0 - smoothstep(${f(p.halfWidth)}, ${f(p.halfWidth + p.fadeWidth)}, offset));
}
fn tractor_ground_depth(base: f32, weight: f32) -> f32 {
  return mix(base, ${f(p.depth)}, weight);
}
`;
