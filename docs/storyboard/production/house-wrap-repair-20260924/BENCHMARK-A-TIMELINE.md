# Benchmark A: how it was made, and elapsed time

**Seven image-generation requests produced A: two rejected panoramic attempts, then the retained v3 panorama and four retained localized repairs. All A images existed about 21minutes after the request to experiment with 360° viewing.** The selected look was made by an image model from a Blender guide and a richly finished room illustration—not by displaying gray voxel/faceted Blender surfaces as the final art.

## Evidence and clock

The exact output IDs in the seven original JSON provenance records match completed generation events in session `01a0be6f-b832-7d93-95df-9d2ff5f69dc1`, file `rollout-2026-09-20T07-49-47-01a0be6f-b832-7d93-95df-9d2ff5f69dc1.jsonl`. Only its relevant September22 panorama interval was inspected. Times below are **UTC on 2026-09-22**, taken from actual call/event timestamps, not file mtimes or later archive/copy dates. [Machine-readable evidence](BENCHMARK-A-TIMELINE.json) records exact milliseconds, generation IDs and source line numbers.

| Stage | Dispatch | Completed output | Observed elapsed | Outcome |
| --- | --- | --- | --- | --- |
| Panorama v1 |15:53:33.929|15:54:04.597|30.668s|Rejected: rear wrap/poles |
| Panorama v2 correction |15:54:59.800|15:55:40.541|40.741s|Rejected: still unsuitable spherical geometry |
| Guide-based panorama v3 |16:02:44.194|16:03:22.678|38.484s|Retained base |
| Front repair |16:10:01.918 batch|16:11:05.297|63.379s from shared dispatch|Retained knob correction |
| Rear repair |same batch|16:11:47.325|105.407s from shared dispatch|Retained seam correction |
| Ceiling repair |same batch|16:12:25.578|143.660s from shared dispatch|Retained pole/join correction |
| Floor repair |same batch|16:12:57.925|176.007s from shared dispatch|Retained flat rug correction |

The four repair requests were submitted together with `Promise.allSettled` (session line19090). **The batch took 2m56s, not the sum of the four delivery latencies.** Separate service-side model start/end durations were not recorded; these are dispatch-to-output times, including any queueing/tool overhead. The three individual call spans plus that single batch total **4m45.900s of observed request intervals**. V3 plus the selected repair batch total 3m34.491s. Neither number is a billed-compute measurement or a promise of future generation speed.

The retained Blender guide render log reports **57.18s**, including 0.10s saving, on the mini using Cycles CPU, 48samples and denoising. That is the final render recorded in `pinpin-house-panorama-20260922/blockout/render.log`; it does not include scripting, earlier guide revisions or inspection. [Blockout recipe/settings](../house-panorama-20260922/blockout/BLOCKOUT.md).

## Decision-to-result chronology

- **15:52:05.936:** user asks to get close to360°, suggesting Blender or extending the room using references; the next message explicitly permits a cubemap experiment. Source lines18628/18630.
- **15:53–15:55:** v1 and v2 are generated. They are not the selected A base. Their original provenance records mark them unselected.
- **16:02:44–16:03:22:** v3 is generated from the true Blender equirectangular guide plus the finished illustrated room reference.
- **16:05:10:** browser review reports working 360° rotation and registered door/bookcase links. **16:06:37:** the browser inspection explicitly identifies the rear seam, upper/lower pinching and extra knob; the strategy changes to normal perspective repair views. Source lines18981/19020.
- **16:10:01–16:12:57:** the four localized repairs are generated from those extracted views. Request-to-last-A-image elapsed is **20m51.989s**; first-v1-call-to-last-repair is19m23.996s. Time between calls includes geometry preparation, prompt work, inspection, extraction and concurrent runtime work; it is not all image generation.
- **16:12:26:** the current prototype is linked/opened with an explicit warning that corrections remain in progress. **16:13:02:** the user responds enthusiastically and asks to compare the Blender-cubemap idea. This feedback supports keeping A, but is **not a logged approval of the final patched renderer**: the repairs were copied/encoded for runtime at16:14:10.968. Source lines19108/19122/19137.
- **16:34:13:** the combined A/B comparison is reported ready. **16:37:22:** final comparison desktop/mobile QA is reported complete. **16:56:34:** the public comparison is reported published/opened. These are respectively about 42, 45 and 64minutes after the original request, and include making the separate B experiment, comparison UI, verification and publishing. They must not be presented as A-only image-production time. Source lines19403/19448/19701.

No precise final-A-only activation/QA timestamp is inferred from later report-file copies. The bounded defensible answer is “about 21minutes to produce the A images; about 45minutes to finish the broader A/B comparison and checks.”

## Why A had the detailed illustrated look

1. **Actual 3D geometry served only as a guide.** The primitive room was 6×6m, eaves 2.7m/ridge 3.5m, camera (0,0,1.15m),2048×1024 spherical projection. The [v3 prompt](../house-panorama-20260922/room-panorama-v3.prompt.txt) assigned its first reference to geometry and the second to materials/style. Those constraints were prompt instructions, not a mathematical guarantee that the model obeyed geometry.
2. **The style reference was already a finished, detailed empty room:** `room-expanded-v2.webp`, not the later character-heavy book still. The model rendered the final wood, plaster, rug, furniture and lighting in the illustrated style. [Exact v3 reference roles and master hash](../house-panorama-20260922/room-panorama-v3.json).
3. **The difficult regions were shown to the model as ordinary perspective pictures.** The retained v3 was reprojected without art edits into four 1024²,110° views. [Extraction provenance](../house-panorama-20260922/cube-inputs/provenance.json) records source/shader hashes and exact camera transforms. Each repair received only its corresponding extracted picture; no fresh gray blockout was passed into those four calls. Existing illustrated detail therefore remained the immediate reference.
4. **Each repair had one narrow job.** [Front](../house-panorama-20260922/room-cube-front-v1.prompt.txt): remove extra knobs. [Rear](../house-panorama-20260922/room-cube-rear-v1.prompt.txt): mend the central wall/table tonal seam. [Up](../house-panorama-20260922/room-cube-up-v1.prompt.txt): replace pole pinching with a solid timber junction. [Down](../house-panorama-20260922/room-cube-down-v1.prompt.txt): flatten the woven rug center. Prompts preserve crop, lighting, surrounding objects and outer-edge registration; outputs are 1254².
5. **The renderer preserves the spherical base and overlays those registered repairs.** It is not a baked six-face atlas. [Runtime configuration](../../../home-panorama-config.js) and [shader](../../../home-panorama-gl.js) use the same world ray for the base and repairs,110° patch projection, a 0.70–0.96 feather band and a small front-knob mask. Most of the detailed illustrated base remains visible unchanged.

**Detail retention also differs from the later baked workflow.** A keeps the 1774×887 base **and all four 1254×1254 repair textures live** in separate WebGL samplers. It does not first flatten those repairs back into a 1774×887 panorama and then resample that into 512² cube faces. Thus corrected regions retain their own higher-resolution source samples. It is a reasonable inference that this contributes to their crisp material detail; there is no controlled sharpness comparison establishing it as the sole cause. A perspective patch does not have uniform pixels-per-degree, so a simple width/FOV ratio should not be presented as its exact angular resolution.

That combination explains the result more precisely than “Blender made a seamless painted cube.” The [historical benchmark audit](HISTORICAL-BENCHMARKS.md) and [original final QA](../house-panorama-20260922/VERIFICATION.md) retain the limitation: a subtle rear-down floor tonal join remains. Visual success does not prove zero artifacts, valid camera translation, or conformity to the later multi-room house plan.
