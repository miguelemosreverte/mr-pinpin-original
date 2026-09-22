# Atlas video workflow

Source rejected for insufficient motion. Cancellation was requested, but the
provider still reported IN_PROGRESS afterwards. Cancellation and billing remain
unconfirmed. Local polling stopped. Do not promote this candidate.

Updated: 2026-09-21T02:38:54.571Z

```json
{
  "schemaVersion": 1,
  "status": "pending",
  "model": "fal-ai/seedvr/upscale/video",
  "input": {
    "video_url": "https://v3b.fal.media/files/b/0aab4232/8AX0ALRjjRTkGPCWz7RyF_output.mp4",
    "upscale_mode": "target",
    "target_resolution": "2160p",
    "noise_scale": 0.1,
    "seed": 20260920,
    "output_format": "X264 (.mp4)",
    "output_quality": "high",
    "output_write_mode": "balanced"
  },
  "config": {
    "model": "fal-ai/seedvr/upscale/video",
    "input": {
      "video_url": "https://v3b.fal.media/files/b/0aab4232/8AX0ALRjjRTkGPCWz7RyF_output.mp4",
      "upscale_mode": "target",
      "target_resolution": "2160p",
      "noise_scale": 0.1,
      "seed": 20260920,
      "output_format": "X264 (.mp4)",
      "output_quality": "high",
      "output_write_mode": "balanced"
    },
    "output": "/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original/docs/storyboard/videos/shire-seedvr-loop-2160p-v1.mp4",
    "sourceVideo": "/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original/docs/storyboard/videos/shire-kling-loop-v1.mp4",
    "priceEstimate": {
      "currency": "USD",
      "amount": 1.3506912,
      "basis": "Expected 3240 x 2160 x 193 frames at $0.001 per output megapixel-frame; actual delivered dimensions determine billing",
      "source": "https://fal.ai/models/fal-ai/seedvr/upscale/video"
    }
  },
  "configPath": "/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original/docs/storyboard/production/atlas-video-upscale-2160p-v1.json",
  "sourceHash": null,
  "createdAt": "2026-09-21T02:33:18.167Z",
  "events": [
    {
      "at": "2026-09-21T02:33:18.235Z",
      "type": "submitting"
    },
    {
      "at": "2026-09-21T02:33:18.941Z",
      "type": "submitted"
    },
    {
      "at": "2026-09-21T02:34:27.210Z",
      "type": "in_progress"
    },
    {
      "at": "2026-09-21T02:35:10.106Z",
      "type": "in_progress"
    },
    {
      "at": "2026-09-21T02:36:26.412Z",
      "type": "in_progress"
    },
    {
      "at": "2026-09-21T02:37:13.074Z",
      "type": "in_progress"
    },
    {
      "at": "2026-09-21T02:37:52.884Z",
      "type": "in_progress"
    },
    {
      "at": "2026-09-21T02:38:23.692Z",
      "type": "in_progress"
    },
    {
      "at": "2026-09-21T02:38:54.571Z",
      "type": "in_progress"
    }
  ],
  "sourceVideoHash": "6f60a6468e5949bace48eda7f3357fcb74ec99b2e9559c4a77f14d11c0abc0b5",
  "priceEstimate": {
    "currency": "USD",
    "amount": 1.3506912,
    "basis": "Expected 3240 x 2160 x 193 frames at $0.001 per output megapixel-frame; actual delivered dimensions determine billing",
    "source": "https://fal.ai/models/fal-ai/seedvr/upscale/video"
  },
  "updatedAt": "2026-09-21T02:38:54.571Z",
  "requestId": "01a0c1cf-89cc-7951-ad16-822c28c95ff6",
  "queueStatus": "IN_PROGRESS"
}
```
