# Atlas video workflow

Updated: 2026-09-21T03:42:20.901Z

```json
{
  "schemaVersion": 1,
  "status": "complete",
  "model": "alibaba/wan-3.0/image-to-video",
  "input": {
    "prompt": "The camera stays in exactly the same place for the entire shot. Locked overhead view, identical framing from first to last frame: no pan, tilt, zoom, rotation or reframing. Wind moves fine surface texture and reflected sunlight across the lake. Leaves flutter gently, and the existing stream flows continuously. Buildings, paths, bridge and shoreline stay fixed. Steady daylight.",
    "duration": 5,
    "resolution": "720p",
    "aspect_ratio": "adaptive",
    "audio": false,
    "enable_prompt_expansion": false,
    "start_image_url": "https://v3b.fal.media/files/b/0aab43e7/0XKFw98R4ecfWCGqF8Jxs_approved-map.png"
  },
  "config": {
    "model": "alibaba/wan-3.0/image-to-video",
    "input": {
      "prompt": "The camera stays in exactly the same place for the entire shot. Locked overhead view, identical framing from first to last frame: no pan, tilt, zoom, rotation or reframing. Wind moves fine surface texture and reflected sunlight across the lake. Leaves flutter gently, and the existing stream flows continuously. Buildings, paths, bridge and shoreline stay fixed. Steady daylight.",
      "duration": 5,
      "resolution": "720p",
      "aspect_ratio": "adaptive",
      "audio": false,
      "enable_prompt_expansion": false
    },
    "output": "/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original/docs/storyboard/videos/shire-wan3-locked-v1.mp4",
    "sourceImage": "/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original/docs/storyboard/images/atlas/shire-v1.png",
    "sourceImageField": "start_image_url",
    "matchEndFrame": false,
    "priceEstimate": {
      "currency": "USD",
      "amount": 0.5,
      "basis": "5 seconds at $0.10/second for 720p. Estimate, not invoice.",
      "source": "https://fal.ai/models/alibaba/wan-3.0/image-to-video"
    }
  },
  "configPath": "/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original/docs/storyboard/production/atlas-video-wan3-locked-v1.json",
  "sourceHash": "80af7f9eb7188f0a1f64969a22632d0ef9732284d027042222c1543879f03780",
  "createdAt": "2026-09-21T03:39:58.289Z",
  "events": [
    {
      "at": "2026-09-21T03:39:58.290Z",
      "type": "submitting"
    },
    {
      "at": "2026-09-21T03:40:02.102Z",
      "type": "source_uploaded"
    },
    {
      "at": "2026-09-21T03:40:02.919Z",
      "type": "submitted"
    },
    {
      "at": "2026-09-21T03:41:25.963Z",
      "type": "in_progress"
    },
    {
      "at": "2026-09-21T03:41:44.754Z",
      "type": "in_progress"
    },
    {
      "at": "2026-09-21T03:42:00.479Z",
      "type": "in_progress"
    },
    {
      "at": "2026-09-21T03:42:16.554Z",
      "type": "completed"
    },
    {
      "at": "2026-09-21T03:42:20.901Z",
      "type": "complete"
    }
  ],
  "priceEstimate": {
    "currency": "USD",
    "amount": 0.5,
    "basis": "5 seconds at $0.10/second for 720p. Estimate, not invoice.",
    "source": "https://fal.ai/models/alibaba/wan-3.0/image-to-video"
  },
  "updatedAt": "2026-09-21T03:42:20.901Z",
  "requestId": "01a0c20c-a203-7193-ad12-874c8c2e7b72",
  "queueStatus": "COMPLETED",
  "metadata": {
    "width": 1174,
    "height": 782,
    "duration": 5,
    "codec_name": "h264",
    "avg_frame_rate": "30/1",
    "frameCount": 150,
    "hasAudio": false,
    "bytes": 24885394,
    "sha256": "935157379a2339d767c76079933709d24a2799df9229ad1ed590d447613b3caa"
  },
  "videoUrl": "https://v3b.fal.media/files/b/0aab43f5/QWJdriu42des4QxdVd6SI_1ytU5uSz.mp4"
}
```
