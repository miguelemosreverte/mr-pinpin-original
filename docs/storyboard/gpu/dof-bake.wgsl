// Adapted from gaucho-atlas d80152e, src/shaders/dof-bake.wgsl.
// Original 64-tap golden-angle disc, reach weighting and highlight calibration.
struct Bake { focus: f32, strength: f32, _p1: f32, _p2: f32 }
@group(0) @binding(0) var<uniform> bake: Bake;
@group(0) @binding(1) var master_texture: texture_2d<f32>;
@group(0) @binding(2) var depth_texture: texture_2d<f32>;
@group(0) @binding(3) var slice_out: texture_storage_2d<rgba8unorm, write>;
const GOLDEN_ANGLE: f32 = 2.39996323;
const NUM_SAMPLES: u32 = 64u;
const HIGHLIGHT_THRESHOLD: f32 = 0.6;
const MAX_COC: f32 = 12.0;
const COC_MULT: f32 = 18.0;
const HIGHLIGHT_POW: f32 = 2.0;
fn compute_coc(d: f32) -> f32 {
  return clamp(abs(d - bake.focus) * COC_MULT * bake.strength, 0.0, MAX_COC * bake.strength);
}
fn lum(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let dims = textureDimensions(slice_out);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }
  let p = vec2i(i32(gid.x), i32(gid.y));
  let mdims = vec2f(textureDimensions(master_texture, 0));
  let ddims = vec2f(textureDimensions(depth_texture, 0));
  let uv = vec2f(gid.xy) / vec2f(max(dims - vec2u(1u), vec2u(1u)));
  let mp = uv * (mdims - vec2f(1.0));
  let sharp0 = textureLoad(master_texture, vec2i(round(mp)), 0);
  let d = textureLoad(depth_texture, vec2i(round(uv * (ddims - vec2f(1.0)))), 0).r;
  let c = compute_coc(d);
  let blend = smoothstep(0.3, 1.2, c);
  if (blend < 0.004) { textureStore(slice_out, p, sharp0); return; }
  var cs = vec3f(0.0);
  var ws: f32 = 0.0;
  for (var i = 0u; i < NUM_SAMPLES; i++) {
    let fi = f32(i);
    let r = sqrt(fi / f32(NUM_SAMPLES)) * max(c, 0.6);
    let th = fi * GOLDEN_ANGLE;
    let off = vec2f(cos(th), sin(th)) * r;
    let sm = round(clamp(mp + off, vec2f(0.0), mdims - vec2f(1.0)));
    let suv = sm / (mdims - vec2f(1.0));
    let sd = textureLoad(depth_texture, vec2i(round(suv * (ddims - vec2f(1.0)))), 0).r;
    let scc = compute_coc(sd);
    let dist = length(off);
    var reach: f32 = 1.0;
    if (dist > 1.0) { reach = smoothstep(dist * 0.8 - 1.5, dist * 0.8 + 0.5, scc); }
    if (reach < 0.01) { continue; }
    let col = textureLoad(master_texture, vec2i(sm), 0).rgb;
    let l = lum(col);
    var w: f32 = reach;
    if (l > HIGHLIGHT_THRESHOLD) { w *= pow(l / HIGHLIGHT_THRESHOLD, HIGHLIGHT_POW); }
    cs += col * w;
    ws += w;
  }
  var blurred = sharp0.rgb;
  if (ws > 0.0) { blurred = cs / ws; }
  textureStore(slice_out, p, vec4f(mix(sharp0.rgb, blurred, blend), sharp0.a));
}
