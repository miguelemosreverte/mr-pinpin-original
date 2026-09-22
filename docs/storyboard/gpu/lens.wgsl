struct Lens {
  viewport: vec2f,
  focus: f32,
  strength: f32,
  effects: vec2f,
  max_radius: f32,
  highlights: f32,
}
@group(0) @binding(0) var<uniform> lens: Lens;
@group(0) @binding(1) var scene_color: texture_2d<f32>;
@group(0) @binding(2) var scene_depth: texture_2d<f32>;
@group(0) @binding(3) var linear_sampler: sampler;
@group(0) @binding(4) var blurred: texture_2d<f32>;
@group(0) @binding(5) var prefiltered: texture_2d<f32>;
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}
@vertex fn vs_main(@builtin(vertex_index) index: u32) -> VertexOut {
  let clips = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: VertexOut;
  out.position = vec4f(clips[index], 0.0, 1.0);
  out.uv = clips[index] * vec2f(0.5, -0.5) + vec2f(0.5);
  return out;
}
fn coc(depth: f32) -> f32 {
  // Assumed miniature distances, not recovered metric geometry. Signed screen
  // radius follows reciprocal distance, continuous across the focal plane.
  let distance = mix(0.25, 2.0, clamp(depth, 0.0, 1.0));
  let focal_distance = mix(0.25, 2.0, lens.focus);
  return clamp(14.0 * lens.strength * (1.0 / focal_distance - 1.0 / distance), -lens.max_radius, lens.max_radius);
}
fn disc(index: u32, count: f32) -> vec2f {
  let angle = f32(index) * 2.39996323;
  return vec2f(cos(angle), sin(angle)) * sqrt((f32(index) + 0.5) / count);
}
fn highlight(color: vec3f) -> f32 {
  // Modest highlight preservation for SDR artwork; this does not recover HDR.
  return 1.0 + 0.35 * lens.highlights * smoothstep(0.45, 0.95, dot(color, vec3f(0.2126, 0.7152, 0.0722)));
}
@fragment fn fs_downsample(in: VertexOut) -> @location(0) vec4f {
  let step = vec2f(dpdx(in.uv.x), dpdy(in.uv.y)) * 0.25;
  return (textureSampleLevel(scene_color, linear_sampler, in.uv + step, 0.0)
    + textureSampleLevel(scene_color, linear_sampler, in.uv - step, 0.0)
    + textureSampleLevel(scene_color, linear_sampler, in.uv + step * vec2f(1.0, -1.0), 0.0)
    + textureSampleLevel(scene_color, linear_sampler, in.uv + step * vec2f(-1.0, 1.0), 0.0)) * 0.25;
}
fn aperture_color(uv: vec2f, radius: f32) -> vec3f {
  let pixels_per_css = f32(textureDimensions(scene_color).x) / lens.viewport.x;
  let pixels = radius * pixels_per_css;
  if (pixels < 2.0) { return textureSampleLevel(scene_color, linear_sampler, uv, 0.0).rgb; }
  let lod = clamp(log2(max(1.0, pixels / 12.0)), 0.0, f32(textureNumLevels(prefiltered) - 1u));
  let soft = textureSampleLevel(prefiltered, linear_sampler, uv, lod).rgb;
  if (pixels >= 5.0) { return soft; }
  return mix(textureSampleLevel(scene_color, linear_sampler, uv, 0.0).rgb, soft, smoothstep(2.0, 5.0, pixels));
}
@fragment fn fs_lens(in: VertexOut) -> @location(0) vec4f {
  let depth = textureSampleLevel(scene_depth, linear_sampler, in.uv, 0.0).r;
  let radius = abs(coc(depth));
  let center = aperture_color(in.uv, radius);
  var total = center;
  var weight = 1.0;
  for (var i = 0u; i < 24u; i++) {
    let offset = disc(i, 24.0) * radius;
    let uv = in.uv + offset / lens.viewport;
    let sample_depth = textureSampleLevel(scene_depth, linear_sampler, uv, 0.0).r;
    let sample_coc = coc(sample_depth);
    let color = aperture_color(uv, radius);
    let near_coverage = smoothstep(length(offset) - 1.0, length(offset) + 1.0, abs(sample_coc));
    let closer = 1.0 - smoothstep(0.005, 0.06, depth - sample_depth);
    let w = highlight(color) * mix(near_coverage, 1.0, closer);
    total += color * w;
    weight += w;
  }
  var result = total / weight;
  var near_color = vec3f(0.0);
  var near_weight = 0.0;
  // A small wider gather spreads near defocus over otherwise sharp silhouettes.
  for (var i = 0u; i < 8u; i++) {
    let offset = disc(i, 8.0) * lens.max_radius;
    let uv = in.uv + offset / lens.viewport;
    let sample_depth = textureSampleLevel(scene_depth, linear_sampler, uv, 0.0).r;
    let sample_radius = -coc(sample_depth);
    let w = smoothstep(length(offset) - 1.5, length(offset) + 1.5, sample_radius)
      * smoothstep(0.005, 0.05, depth - sample_depth);
    near_color += aperture_color(uv, max(0.0, sample_radius)) * w;
    near_weight += w;
  }
  let coverage = near_weight / 8.0;
  result = mix(result, near_color / max(near_weight, 0.0001), coverage);
  return vec4f(result, coverage);
}
fn srgb(color: vec3f) -> vec3f {
  return select(1.055 * pow(max(color, vec3f(0.0)), vec3f(1.0 / 2.4)) - 0.055,
    color * 12.92, color <= vec3f(0.0031308));
}
@fragment fn fs_resolve(in: VertexOut) -> @location(0) vec4f {
  let sharp = textureSampleLevel(scene_color, linear_sampler, in.uv, 0.0);
  let depth = textureSampleLevel(scene_depth, linear_sampler, in.uv, 0.0).r;
  let soft = textureSampleLevel(blurred, linear_sampler, in.uv, 0.0);
  let radius = abs(coc(depth));
  let blend = select(0.0, max(smoothstep(0.25, 1.5, radius), soft.a), lens.strength > 0.0);
  return vec4f(srgb(mix(sharp.rgb, soft.rgb, blend)), sharp.a);
}
