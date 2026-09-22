# Atlas video workflow

Updated: 2026-09-21T03:47:28.301Z

```json
{
  "schemaVersion": 1,
  "status": "complete",
  "model": "fal-ai/bytedance/seedance/v1/pro/fast/image-to-video",
  "input": {
    "prompt": "The camera stays in exactly the same place for the entire shot. Locked overhead view, identical framing from first to last frame: no pan, tilt, zoom, rotation or reframing. Wind moves fine surface texture and reflected sunlight across the lake. Leaves flutter gently, and the existing stream flows continuously. Buildings, paths, bridge and shoreline stay fixed. Steady daylight. Do not throw pebbles at the lake.",
    "duration": "5",
    "resolution": "1080p",
    "aspect_ratio": "auto",
    "camera_fixed": true,
    "image_url": "https://v3b.fal.media/files/b/0aab440c/eCBHmdRbzit3KYxMLNRPh_approved-map.png"
  },
  "config": {
    "model": "fal-ai/bytedance/seedance/v1/pro/fast/image-to-video",
    "input": {
      "prompt": "The camera stays in exactly the same place for the entire shot. Locked overhead view, identical framing from first to last frame: no pan, tilt, zoom, rotation or reframing. Wind moves fine surface texture and reflected sunlight across the lake. Leaves flutter gently, and the existing stream flows continuously. Buildings, paths, bridge and shoreline stay fixed. Steady daylight. Do not throw pebbles at the lake.",
      "duration": "5",
      "resolution": "1080p",
      "aspect_ratio": "auto",
      "camera_fixed": true
    },
    "output": "/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original/docs/storyboard/videos/shire-seedance1-no-pebbles-v1.mp4",
    "sourceImage": "/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original/docs/storyboard/images/atlas/shire-v1.png",
    "sourceImageField": "image_url",
    "matchEndFrame": false,
    "priceEstimate": {
      "currency": "USD",
      "amount": 0.245388,
      "basis": "Estimate based on prior delivered 1664 x 1248 and 121 frames at $1 per million video tokens. Actual dimensions and frame count determine cost. Not an invoice.",
      "source": "https://fal.ai/models/fal-ai/bytedance/seedance/v1/pro/fast/image-to-video"
    }
  },
  "configPath": "/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original/docs/storyboard/production/atlas-video-seedance1-no-pebbles-v1.json",
  "sourceHash": "80af7f9eb7188f0a1f64969a22632d0ef9732284d027042222c1543879f03780",
  "createdAt": "2026-09-21T03:46:03.073Z",
  "events": [
    {
      "at": "2026-09-21T03:46:03.080Z",
      "type": "submitting"
    },
    {
      "at": "2026-09-21T03:46:19.281Z",
      "type": "source_uploaded"
    },
    {
      "at": "2026-09-21T03:46:20.160Z",
      "type": "submitted"
    },
    {
      "at": "2026-09-21T03:47:08.358Z",
      "type": "in_progress"
    },
    {
      "at": "2026-09-21T03:47:24.200Z",
      "type": "completed"
    },
    {
      "at": "2026-09-21T03:47:28.301Z",
      "type": "complete"
    }
  ],
  "priceEstimate": {
    "currency": "USD",
    "amount": 0.245388,
    "basis": "Estimate based on prior delivered 1664 x 1248 and 121 frames at $1 per million video tokens. Actual dimensions and frame count determine cost. Not an invoice.",
    "source": "https://fal.ai/models/fal-ai/bytedance/seedance/v1/pro/fast/image-to-video"
  },
  "updatedAt": "2026-09-21T03:47:28.301Z",
  "requestId": "01a0c212-639a-7842-b2c0-2732c8eb3803",
  "queueStatus": "COMPLETED",
  "metadata": {
    "width": 1664,
    "height": 1248,
    "duration": 5.041667,
    "codec_name": "h264",
    "avg_frame_rate": "24/1",
    "frameCount": 121,
    "hasAudio": false,
    "bytes": 28250637,
    "sha256": "b30eede77e8ddce3b410777a5180d5286666167960f6879a2a068e6a9cad2c33"
  },
  "videoUrl": "https://v3b.fal.media/files/b/0aab4413/dL-1hYNzuBeHoDGsCdicH_video.mp4"
}
```
