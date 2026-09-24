# Locked-camera pilot: stationary requirement failed

One separately authorized PixVerse V6 request used the original 4-second orbit frame and the new strict-outpaint fitted opening. The exact [prompt](prompt.txt) forbids camera movement, zoom, machinery movement and intermediate shape changes. The original pilot is preserved.

The returned 25-frame clip still changes the tractor and background visibly. The four-wheel hub tracking comparison shows larger transient width change than the first pilot:

| Image-space estimate at 1280×720 | Original V1 | Locked-camera V2 |
|---|---:|---:|
| Maximum outer-hub span beyond both endpoint spans |27.07px|38.51px|
| Maximum front-hub displacement outside endpoint bounding box |22.79px|24.47px|
| Midpoint tractor-front hub horizontal shift from first frame |−16.29px|−24.36px|
| Midpoint rear-trailer hub horizontal shift |+13.50px|+13.81px|

Tracking uses manually seeded hubs and pyramidal Lucas–Kanade optical flow. These are image-space estimates, not exact physical centers or proof of wheel rotation. The visible intermediate machine expansion is consistent with these measurements. [All 25 samples](wheel-motion.json) and [sanitized generation record](review.json) are retained.

The decoded first/last frames differ from supplied endpoints by mean RGB 4.15/255 and 5.65/255. Therefore closer endpoint framing and explicit wording did not guarantee a stationary intermediate clip.

Actual video: `bridge-raw-v2.mp4`; local all-intra derivatives: `bridge-in-v2.mp4` and `bridge-out-v2.mp4`; five actual decoded samples: `check/contact-sheet.png`. They are on the mini review server. No crossfade, endpoint substitution or invented intermediate frames were introduced locally.

Main tour is unchanged. No additional request or retry is running. Bulk generation remains held. This was one 1-second 720p silent request (returned 1.041667 s); estimated price $0.045, not an invoice. The three bridge requests so far are original 04, original 13 and this revised 04.
