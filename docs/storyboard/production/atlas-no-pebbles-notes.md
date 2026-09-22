# Seedance: explicit pebble exclusion

On September 21, 2026 Miguel authorized one more Seedance 1.0 Pro Fast trial,
specifically adding: "Do not throw pebbles at the lake."

The [request config](atlas-video-seedance1-no-pebbles-v1.json) preserves the prior
locked-camera prompt and settings, appending that exact sentence. It uses the
approved map, `camera_fixed: true`, 5 seconds, 1080p, auto aspect ratio, and no
end-frame constraint. No separate negative-prompt field is submitted because
the current endpoint does not expose one. The exclusion is part of the normal
prompt. A different random sample means this is not a same-seed causal test.

Request ID: `01a0c212-639a-7842-b2c0-2732c8eb3803`.

Output: `../videos/shire-seedance1-no-pebbles-v1.mp4`, with same-basename JSON and
Markdown containing the exact prompt, parameters, source hash, UTC events and
measured output metadata. One request only, estimated $0.245388 from the prior
delivered dimensions and frame count. Billing unconfirmed. No upscale requested.

[Comparison preview](../review/atlas-no-pebbles.html) shows the new result beside
the previous Seedance locked-camera attempt, with the full prompt visible.
Originals remain unmodified and no production atlas assets are replaced.

Check the entire shot for entering objects, concentric lake disturbances,
camera drift, geometric warping, changes in exposure, and useful water/foliage
movement. A negative sentence is an instruction, not a guaranteed constraint.
Approval remains pending review.

## Result

Delivered 1664 x 1248, 121 frames at 24 fps, 5.041667 seconds, H.264 without
audio, 28,250,637 bytes. Token-formula estimate: $0.245388, not an invoice.
Two sampled frames per second do not show the prior pronounced concentric
disturbance. This does not prove absence of brief artifacts or establish that
the added sentence caused the improvement. Full playback remains the review
gate. The delivered canvas is 4:3 rather than the approved source's 3:2.

Desktop and mobile-size Chrome checks confirmed both comparison videos play
without media errors and the page has no horizontal overflow. The preview was
opened using the operating-system `open` command.

## Other candidates, not purchased

Public provider documentation checked September 21, 2026:

- [Hailuo 2.3 Fast Standard](https://fal.ai/models/fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video):
  $0.19 for 6 seconds at 768p. MiniMax documents a `[Static shot]` prompt command;
  fal exposes `prompt_optimizer` to disable rewriting. No separate lock guarantee.
- [PixVerse V6](https://fal.ai/models/fal-ai/pixverse/v6/transition):
  $0.225 for 5 seconds at 720p with audio off. Dedicated `negative_prompt` and
  first/end images on the transition endpoint. These controls do not guarantee
  stable geometry or a seamless loop.
- [Grok Imagine 1.5](https://fal.ai/models/xai/grok-imagine-video/v1.5/image-to-video):
  5 seconds at 720p is $0.70 output plus $0.01 input image according to
  [fal's usage guide](https://fal.ai/learn/tools/how-to-use-grok-imagine).
  More expensive and no dedicated negative-prompt or camera-lock field in fal's
  current input schema.

These are listed-price estimates, not tested quality rankings. Hailuo and
PixVerse together would be about $0.42; neither was submitted in this turn.
