// Composite all scene objects before the global lens pass.
struct SpriteMember {
  bounds: vec4f,
  depths: vec4f, // corrected occlusion, lens, ordering, ready
  slice: vec4f, // atlas U offset, U scale, reserved, reserved
}
struct Frame {
  camera: vec2f,
  viewport: vec2f,
  world: vec2f,
  scale: f32,
  focus: f32,
  strength: f32,
  banner_ready: f32,
  border_tile_size: f32,
  sprite_ready: f32,
  sprite_bounds: vec4f,
  occlusion: vec4f, // foot depth, enabled, bias, feather
  animation: vec4f, // ready, cyclic phase, frame count, blend (video: one layer, full strength)
  surface: vec4f, // character lens depth, banner lens depth, sprite count, legacy foot depth
  members: array<SpriteMember, 3>, // sorted back to front; slices retain original slots
}
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var art: texture_2d<f32>;
@group(0) @binding(2) var banner: texture_2d<f32>;
@group(0) @binding(3) var banner_depth: texture_2d<f32>;
@group(0) @binding(4) var depth: texture_2d<f32>;
@group(0) @binding(5) var overlay: texture_2d<f32>;
@group(0) @binding(6) var linear_sampler: sampler;
@group(0) @binding(7) var border: texture_2d<f32>;
@group(0) @binding(8) var border_sampler: sampler;
@group(0) @binding(9) var sprite: texture_2d<f32>;
@group(0) @binding(10) var ground: texture_2d<f32>;
@group(0) @binding(11) var scenery: texture_2d_array<f32>;
@group(0) @binding(12) var scenery_mask: texture_2d<f32>;
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) world: vec2f,
  @location(1) uv: vec2f,
}
@vertex fn vs_main(@builtin(vertex_index) index: u32) -> VertexOut {
  var clips = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  let clip = clips[index];
  let css = vec2f(clip.x * frame.viewport.x * 0.5, -clip.y * frame.viewport.y * 0.5);
  var out: VertexOut;
  out.position = vec4f(clip, 0.0, 1.0);
  out.world = frame.camera + css / frame.scale;
  out.uv = clip * vec2f(0.5, -0.5) + vec2f(0.5);
  return out;
}
fn linear(color: vec3f) -> vec3f {
  return select(pow((color + 0.055) / 1.055, vec3f(2.4)), color / 12.92, color <= vec3f(0.04045));
}
fn linear_premultiplied(color: vec4f) -> vec4f {
  return vec4f(linear(color.rgb / max(color.a, 0.0001)) * color.a, color.a);
}
fn visibility(scene: f32, object: f32) -> f32 {
  // Match occlusion.js: the near depth range has less ground/canopy separation.
  let range = clamp((object - 66.0 / 255.0) / (25.0 / 255.0), 0.0, 1.0);
  let bias = mix(0.04, frame.occlusion.z, range);
  let feather = mix(0.025, frame.occlusion.w, range);
  return 1.0 - smoothstep(bias, bias + feather, object - scene);
}
fn ground_plane(y: f32) -> f32 {
  return 0.85 - 0.65 * clamp(y / frame.world.y, 0.0, 1.0);
}
struct SceneOut {
  @location(0) color: vec4f,
  @location(1) depth: f32,
}
@fragment fn fs_main(in: VertexOut) -> SceneOut {
  let uv = clamp(in.world / frame.world, vec2f(0.0), vec2f(1.0));
  let sharp = textureSample(art, linear_sampler, uv);
  let d = textureSample(depth, linear_sampler, uv).r;
  let first = i32(floor(frame.animation.y));
  let second = (first + 1) % max(1, i32(frame.animation.z));
  let a = textureSample(scenery, linear_sampler, uv, first);
  let b = textureSample(scenery, linear_sampler, uv, second);
  let mask = textureSample(scenery_mask, linear_sampler, uv);
  let moving = mix(linear(a.rgb), linear(b.rgb), smoothstep(0.0, 1.0, fract(frame.animation.y)));
  let base = vec4f(mix(linear(sharp.rgb), moving, mask.r * mask.a * frame.animation.x * frame.animation.w), sharp.a);
  var top = linear_premultiplied(textureSample(overlay, linear_sampler, uv));
  var characters: array<vec4f, 3>;
  var character_alpha = 0.0;
  let member_count = min(3u, u32(frame.surface.z));
  for (var i = 0u; i < member_count; i++) {
    let member = frame.members[i];
    let local_uv = (in.world - member.bounds.xy) / member.bounds.zw;
    // Clamp to this cell's texel centers so linear filtering cannot leak a sibling.
    let cell_pixels = vec2f(textureDimensions(sprite)) * vec2f(member.slice.y, 1.0);
    let half_texel = vec2f(0.5) / cell_pixels;
    let cell_uv = clamp(local_uv, half_texel, vec2f(1.0) - half_texel);
    let atlas_uv = vec2f(member.slice.x + cell_uv.x * member.slice.y, cell_uv.y);
    characters[i] = linear_premultiplied(textureSampleLevel(sprite, linear_sampler, atlas_uv, 0.0)) *
      select(0.0, member.depths.w, all(local_uv >= vec2f(0.0)) && all(local_uv < vec2f(1.0)));
    character_alpha += characters[i].a;
  }
  var label = linear_premultiplied(textureSample(banner, linear_sampler, in.uv)) * frame.banner_ready;
  let label_depth = textureSample(banner_depth, linear_sampler, in.uv);
  label *= select(0.0, 1.0, label_depth.a > 0.0);
  let base_trail_depth = textureSample(ground, linear_sampler, vec2f(0.5, uv.y)).r;
  let road_weight = tractor_ground_weight(in.world);
  let trail_depth = tractor_ground_depth(base_trail_depth, road_weight);
  if (frame.occlusion.y > 0.0 && (top.a > 0.0 || character_alpha > 0.0 || label.a > 0.0)) {
    // Smooth artistic shading in a small neighborhood before the deliberately
    // biased comparison to suppress holes from isolated dark or bright flecks.
    let step = vec2f(2.0) / vec2f(textureDimensions(depth));
    var scene = 0.0;
    for (var y = -1; y <= 1; y++) {
      for (var x = -1; x <= 1; x++) {
        scene += textureSampleLevel(depth, linear_sampler, uv + vec2f(f32(x), f32(y)) * step, 0.0).r;
      }
    }
    scene /= 9.0;
    top *= visibility(scene, trail_depth);
    for (var i = 0u; i < member_count; i++) {
      characters[i] *= visibility(scene, frame.members[i].depths.x);
    }
    label *= visibility(scene, label_depth.r);
  }
  let ground_composed = top + base * (1.0 - top.a);
  let plane = ground_plane(in.world.y);
  var reference = base_trail_depth;
  if (in.world.y < 205.0) { reference = mix(0.8, 111.0 / 255.0, clamp(in.world.y / 205.0, 0.0, 1.0)); }
  if (in.world.y > 740.0) { reference = mix(66.0 / 255.0, 0.08, clamp((in.world.y - 740.0) / 284.0, 0.0, 1.0)); }
  let scene_lens_depth = plane - clamp(0.30 * (reference - d), 0.0, 0.12);
  let label_lens_depth = select(plane - clamp(0.30 * (reference - label_depth.r), 0.0, 0.12),
    frame.surface.y, frame.surface.y >= 0.0);
  let ground_depth = mix(scene_lens_depth, plane, top.a);
  // Insert the banner into the ordered family, preserving every object's lens depth.
  var composed = ground_composed;
  var composed_depth = ground_depth;
  var label_pending = true;
  for (var i = 0u; i < member_count; i++) {
    if (label_pending && label_depth.r > frame.members[i].depths.z) {
      composed = label + composed * (1.0 - label.a);
      composed_depth = mix(composed_depth, label_lens_depth, label.a);
      label_pending = false;
    }
    let character = characters[i];
    composed = character + composed * (1.0 - character.a);
    composed_depth = mix(composed_depth, frame.members[i].depths.y, character.a);
  }
  if (label_pending) {
    composed = label + composed * (1.0 - label.a);
    composed_depth = mix(composed_depth, label_lens_depth, label.a);
  }
  let floral = textureSample(border, border_sampler, in.world / frame.border_tile_size);
  let inside = all(in.world >= vec2f(0.0)) && all(in.world < frame.world);
  var out: SceneOut;
  out.color = select(vec4f(linear(floral.rgb), floral.a), composed, inside);
  out.depth = select(frame.focus, composed_depth, inside);
  return out;
}
