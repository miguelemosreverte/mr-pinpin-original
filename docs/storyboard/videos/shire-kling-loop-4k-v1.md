# Atlas video workflow

Rejected by the provider with HTTP 422: upscale_factor must be 1.9 or lower
for this source video. No output video was produced. The corrected request is
documented in `atlas-video-upscale-2160p-v1.json`; do not resubmit this request.

Updated: 2026-09-21T02:31:25.912Z

```json
{
  "schemaVersion": 1,
  "status": "collect_failed",
  "model": "fal-ai/seedvr/upscale/video",
  "input": {
    "video_url": "https://v3b.fal.media/files/b/0aab4232/8AX0ALRjjRTkGPCWz7RyF_output.mp4",
    "upscale_mode": "factor",
    "upscale_factor": 2.17687074829932,
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
      "upscale_mode": "factor",
      "upscale_factor": 2.17687074829932,
      "noise_scale": 0.1,
      "seed": 20260920,
      "output_format": "X264 (.mp4)",
      "output_quality": "high",
      "output_write_mode": "balanced"
    },
    "output": "/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original/docs/storyboard/videos/shire-kling-loop-4k-v1.mp4",
    "sourceVideo": "/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original/docs/storyboard/videos/shire-kling-loop-v1.mp4",
    "priceEstimate": {
      "currency": "USD",
      "amount": 1.8972672,
      "basis": "3840 x 2560 x 193 frames at $0.001 per output megapixel-frame; estimate, not an invoice",
      "source": "https://fal.ai/models/fal-ai/seedvr/upscale/video"
    }
  },
  "configPath": "/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original/docs/storyboard/production/atlas-video-upscale-v1.json",
  "sourceHash": null,
  "createdAt": "2026-09-21T02:29:50.881Z",
  "events": [
    {
      "at": "2026-09-21T02:29:50.938Z",
      "type": "submitting"
    },
    {
      "at": "2026-09-21T02:29:51.733Z",
      "type": "submitted"
    },
    {
      "at": "2026-09-21T02:31:25.563Z",
      "type": "completed"
    },
    {
      "at": "2026-09-21T02:31:25.912Z",
      "type": "collect_failed"
    }
  ],
  "sourceVideoHash": "6f60a6468e5949bace48eda7f3357fcb74ec99b2e9559c4a77f14d11c0abc0b5",
  "priceEstimate": {
    "currency": "USD",
    "amount": 1.8972672,
    "basis": "3840 x 2560 x 193 frames at $0.001 per output megapixel-frame; estimate, not an invoice",
    "source": "https://fal.ai/models/fal-ai/seedvr/upscale/video"
  },
  "updatedAt": "2026-09-21T02:31:25.912Z",
  "requestId": "01a0c1cc-6060-7d01-a25f-82d90759d825",
  "queueStatus": "COMPLETED"
}
```
