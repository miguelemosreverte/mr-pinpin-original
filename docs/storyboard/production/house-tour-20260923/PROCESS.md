# Actual house-tour process

[process-report.json](process-report.json) is the data source for the visual process report. It records the executed sequence for each room, with portable image URLs, actual dimensions, SHA-256 identities, full prompt links and references in their actual attachment order. It does not claim another art revision occurred.

All rooms start from the same frozen Blender house. The common camera is at `[-1.3,-1.3,1.15]`, bathroom at `[-2.4,2,1.15]`, bedroom at `[1.45,1.2,1.15]`, in meters. The front door is closed; both interior doors are open75°. The gray guide contains the modeled wall facets and simplified fixture silhouettes. Those details carried into the art because this was a geometry-preserving illustration attempt, not a new house model or a mesh-smoothing step.

## Executed sequence

1. Render six true90° gray views from a single room camera, then assemble a3072×2048 atlas. Layout is front/right/back above left/up/down. Any six-panel crops displayed by the report are crops of that actual atlas, not six extra generated pictures.
2. Generate one complete illustrated atlas in one built-in imagegen call. The four references were attached in this exact order: current gray atlas; prior illustrated equirectangular panorama for style only; prior front repair for material detail only; the room-specific approved book still for style only. Old geometry and characters were not intended as placement instructions.
3. Make the recorded whole-atlas revisions. Common executed V1, V2 and V3; bathroom V1 and V2; bedroom V1 only. These outputs were1536×1024, despite3072×2048 requests. Material treatment improved, but faces still disagreed about doors, table, tub and floor. The bedroom V2 prompt was prepared but never called.
4. Mathematically reproject gray and the last illustrated atlas to matching3072×1536 continuous equirectangular panoramas. This resampling preserves existing art defects; it does not paint a fix.
5. Run one built-in imagegen repair per room with exactly two attachments: continuous gray geometry first, continuous illustrated candidate second. All three repaired originals were1774×887, despite2048×1024 requests.
6. Deterministically convert each repaired panorama to six512×512 cube faces, a1536×1024 atlas, then encode lossless WebP. No extra artistic correction takes place during conversion.
7. Compare six centers and twelve cube-edge directions per room in the actual tour. The broad splits improved. A narrow bedroom ceiling/wrap line, soft detail, approximate fixture proportions and some cross-room timber-trim differences remain. These are reviewed local proposals, not exact geometry certification or approved chapter art.

There were nine executed imagegen calls: six whole-atlas calls and three whole-panorama calls. There were no six-independent-face imagegen batches. The current candidates use a single continuous sphere per room, which is why the large panel discontinuities improve; the deterministic conversion itself is not the artistic repair.

## Real renderer and projection commands

Run from the repository root. This camera job and CLI are the ones used for the common-room geometry; change the room suffix to the other recorded jobs. The original execution reused a hash-verified build cache; this documented form rebuilds from the pinned reusable recipe.

```sh
python3 tools/locations/cli.py cubemap \
  --job docs/storyboard/production/house-tour-20260923/geometry/jobs/cubemap-common.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/rooms/common \
  --host mini
```

The real conversion script is `projection/reproject.py`. It needs NumPy; the executed mini environment used the bundled Blender Python described in [projection/README.md](projection/README.md). With such an interpreter selected as `python3`, these are the same supported operations against the portable restored inputs:

```sh
python3 docs/storyboard/production/house-tour-20260923/projection/reproject.py cube-to-pano \
  --input docs/storyboard/production/house-tour-20260923/geometry/rooms/common/cube-atlas.png \
  --output /Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/projection/common-gray-equirect.png \
  --width 3072

python3 docs/storyboard/production/house-tour-20260923/projection/reproject.py pano-to-cube \
  --input docs/storyboard/production/house-tour-20260923/illustrated/common/panorama-v1.png \
  --output /Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/illustrated/common/cube-from-panorama-v1.png \
  --face-size 512
```

Imagegen remains a built-in agent tool call with the exact prompt and ordered images exposed by the report. There is no invented shell command or paid API wrapper for generating these illustrations.

## Portable report data

Every image `url`/`src` in the JSON is relative to `docs/` and maps to an entry in `assets/house-tour.json`. A matching `sha256` identifies the actual archived original or derivative. `prompt.url` points to the complete unabridged executed prompt; the UI fetches that file instead of presenting a paraphrase as the real prompt. Historical generation records are retained, while the report gives the later rejected/superseded review outcome explicitly.

The schema uses `rooms[].steps[]` with ordered `inputs`, visual `outputs`, `prompt`, and `provenance` links. Equivalent `src`, `images`, `description`, and `links` aliases support the viewer without changing the actual evidence. `unusedPreparedJobs` is an optional note outside the executed steps. No process step depends on a session-only image path; raw execution records may retain original external paths for provenance.

The media restore and HTTP hash checks are documented in [PROCESS-ASSETS.md](PROCESS-ASSETS.md). Source originals were restored from the verified scoped archive without modification; the unused gray roundtrip image is not needed by this report. See [art-review/ART-REVIEW.md](art-review/ART-REVIEW.md) for the final bounded visual judgment. Exact projection/edge mathematics is separate from whether the image model painted a faithful scene.
